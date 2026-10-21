import { parseLanguage } from "@/lib/language";
import { createClient } from "@/lib/supabase/server";
import type { Language } from "@/types/content";

export type DashboardHighlight = {
  id: string;
  dayNumber: number;
  selectedText: string;
  noteText: string | null;
  voiceNoteUrl: string | null;
  sectionTitle: string | null;
};

export type DashboardBookmark = {
  id: string;
  dayNumber: number;
  sectionId: string;
  sectionOrder: number;
  seriesSlug: string;
  language: Language;
  label: string | null;
  sectionTitle: string | null;
};

export type DashboardData = {
  email: string | null;
  role: "user" | "admin" | null;
  progress: {
    seriesSlug: string;
    dayNumber: number;
    language: Language;
    sectionOrder: number | null;
    spreadIndex: number;
    sectionTitle: string | null;
  } | null;
  highlights: DashboardHighlight[];
  bookmarks: DashboardBookmark[];
};

export const emptyDashboard: DashboardData = {
  email: null,
  role: null,
  progress: null,
  highlights: [],
  bookmarks: [],
};

type SectionLoc = {
  title: string;
  sectionOrder: number;
  dayNumber: number;
  language: Language;
  seriesSlug: string;
};

async function loadSectionLocations(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  sectionIds: string[],
): Promise<Map<string, SectionLoc>> {
  const map = new Map<string, SectionLoc>();
  const unique = [...new Set(sectionIds.filter(Boolean))];
  if (!unique.length) return map;

  const { data: sections } = await supabase
    .from("sections")
    .select("id, title, section_order, day_id")
    .in("id", unique);
  if (!sections?.length) return map;

  const dayIds = [...new Set(sections.map((section) => section.day_id).filter(Boolean))];
  const { data: days } = await supabase
    .from("days")
    .select("id, day_number, language, series_id")
    .in("id", dayIds);
  if (!days?.length) return map;

  const seriesIds = [...new Set(days.map((day) => day.series_id).filter(Boolean))];
  const { data: seriesRows } = await supabase.from("series").select("id, slug").in("id", seriesIds);
  const seriesById = new Map((seriesRows ?? []).map((row) => [row.id, row.slug]));
  const dayById = new Map((days ?? []).map((day) => [day.id, day]));

  for (const section of sections) {
    const day = dayById.get(section.day_id);
    if (!day) continue;
    const seriesSlug = seriesById.get(day.series_id);
    if (!seriesSlug) continue;
    map.set(section.id, {
      title: section.title,
      sectionOrder: section.section_order,
      dayNumber: day.day_number,
      language: parseLanguage(day.language),
      seriesSlug,
    });
  }
  return map;
}

export async function loadDashboard(): Promise<DashboardData> {
  const supabase = await createClient();
  if (!supabase) return emptyDashboard;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return emptyDashboard;

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).maybeSingle();

  const [progressResult, highlightResult, bookmarkResult] = await Promise.all([
    supabase
      .from("user_progress")
      .select("series_slug, day_number, language, section_id, section_order, spread_index")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    supabase
      .from("highlights")
      .select("id, day_number, section_id, selected_text, note_text, voice_note_url")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("bookmarks")
      .select("id, day_number, section_id, label")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false }),
  ]);

  const sectionIds = [
    progressResult.data?.section_id,
    ...(highlightResult.data ?? []).map((row) => row.section_id),
    ...(bookmarkResult.data ?? []).map((row) => row.section_id),
  ].filter((id): id is string => Boolean(id));

  const locations = await loadSectionLocations(supabase, sectionIds);

  const progress = progressResult.data;
  const progressLoc = progress?.section_id ? locations.get(progress.section_id) : undefined;

  return {
    email: auth.user.email ?? null,
    role: profile?.role ?? null,
    progress: progress
      ? {
          seriesSlug: progress.series_slug || progressLoc?.seriesSlug || "devi-navaratrula-jnanam",
          dayNumber: progress.day_number,
          language: parseLanguage(progress.language),
          sectionOrder: progress.section_order,
          spreadIndex: progress.spread_index,
          sectionTitle: progressLoc?.title ?? null,
        }
      : null,
    highlights: (highlightResult.data ?? []).map((row) => ({
      id: row.id,
      dayNumber: row.day_number,
      selectedText: row.selected_text,
      noteText: row.note_text,
      voiceNoteUrl: row.voice_note_url,
      sectionTitle: locations.get(row.section_id)?.title ?? null,
    })),
    bookmarks: (bookmarkResult.data ?? []).flatMap((row) => {
      const loc = locations.get(row.section_id);
      if (!loc) return [];
      return [
        {
          id: row.id,
          dayNumber: loc.dayNumber,
          sectionId: row.section_id,
          sectionOrder: loc.sectionOrder,
          seriesSlug: loc.seriesSlug,
          language: loc.language,
          label: row.label,
          sectionTitle: loc.title,
        },
      ];
    }),
  };
}
