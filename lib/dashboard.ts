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

export async function loadDashboard(): Promise<DashboardData> {
  const supabase = await createClient();
  if (!supabase) return emptyDashboard;

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return emptyDashboard;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

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

  const titles = new Map<string, string>();
  if (sectionIds.length > 0) {
    const { data: sections } = await supabase.from("sections").select("id, title").in("id", sectionIds);
    sections?.forEach((section) => titles.set(section.id, section.title));
  }

  const progress = progressResult.data;
  return {
    email: auth.user.email ?? null,
    role: profile?.role ?? null,
    progress: progress
      ? {
          seriesSlug: progress.series_slug || "jnanodayam",
          dayNumber: progress.day_number,
          language: progress.language,
          sectionOrder: progress.section_order,
          spreadIndex: progress.spread_index,
          sectionTitle: progress.section_id ? titles.get(progress.section_id) ?? null : null,
        }
      : null,
    highlights: (highlightResult.data ?? []).map((row) => ({
      id: row.id,
      dayNumber: row.day_number,
      selectedText: row.selected_text,
      noteText: row.note_text,
      voiceNoteUrl: row.voice_note_url,
      sectionTitle: titles.get(row.section_id) ?? null,
    })),
    bookmarks: (bookmarkResult.data ?? []).map((row) => ({
      id: row.id,
      dayNumber: row.day_number,
      sectionId: row.section_id,
      label: row.label,
      sectionTitle: titles.get(row.section_id) ?? null,
    })),
  };
}
