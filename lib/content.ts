import day7te from "@/content/day-07-te.json";
import day8en from "@/content/day-08-en.json";
import day8te from "@/content/day-08-te.json";
import { asParagraphs } from "@/lib/content/paragraphs";
import { readingPath } from "@/lib/series";
import { createClient } from "@/lib/supabase/server";
import type { Language, LibraryDay, LibrarySeries, ReaderDay, ReaderSection } from "@/types/content";

export { readingPath };

type StoredDay = {
  dayNumber: number;
  language: Language;
  series?: string;
  title: string;
  subtitle: string;
  sections: Array<{
    id: string;
    sectionOrder: number;
    title: string;
    content: unknown;
    minutes: number | null;
  }>;
};

function asDay(day: StoredDay, series: string, seriesName: string): ReaderDay {
  return {
    dayNumber: day.dayNumber,
    language: day.language,
    series,
    seriesName,
    title: day.title,
    subtitle: day.subtitle,
    coverUrl: null,
    youtubeId: null,
    sections: day.sections.map(
      (section): ReaderSection => ({
        id: section.id,
        sectionOrder: section.sectionOrder,
        title: section.title,
        content: asParagraphs(section.content),
        minutes: section.minutes,
        startSec: null,
      }),
    ),
  };
}

const localDays: ReaderDay[] = [
  asDay(day7te as StoredDay, "devi-navaratrula-jnanam", "Devi Navaratrula Jnanam"),
  asDay(day8te as StoredDay, "devi-navaratrula-jnanam", "Devi Navaratrula Jnanam"),
  asDay(day8en as StoredDay, "devi-navaratrula-jnanam", "Devi Navaratrula Jnanam"),
];

export function listLocalDays() {
  return localDays;
}

function groupDays(
  rows: Array<{
    slug: string;
    name: string;
    day_number: number;
    language: Language;
    title: string;
    cover_url: string | null;
  }>,
): LibrarySeries[] {
  const series = new Map<string, LibrarySeries>();
  for (const row of rows) {
    let entry = series.get(row.slug);
    if (!entry) {
      entry = { slug: row.slug, name: row.name, days: [] };
      series.set(row.slug, entry);
    }
    let day = entry.days.find((item) => item.dayNumber === row.day_number);
    if (!day) {
      day = { dayNumber: row.day_number, title: row.title, coverUrl: row.cover_url, languages: [] };
      entry.days.push(day);
    }
    if (row.cover_url) day.coverUrl = row.cover_url;
    const language: Language = row.language === "en" ? "en" : "te";
    if (language === "te") day.title = row.title;
    if (!day.languages.includes(language)) day.languages.push(language);
  }
  for (const entry of series.values()) {
    entry.days.sort((a, b) => a.dayNumber - b.dayNumber);
    for (const day of entry.days) {
      day.languages = [...new Set(day.languages)].sort((a, b) =>
        a === "te" ? -1 : b === "te" ? 1 : a.localeCompare(b),
      );
    }
  }
  return [...series.values()];
}

function localLibrary(): LibrarySeries[] {
  return groupDays(
    localDays.map((day) => ({
      slug: day.series,
      name: day.seriesName,
      day_number: day.dayNumber,
      language: day.language,
      title: day.title,
      cover_url: day.coverUrl,
    })),
  );
}

export async function loadLibrary(): Promise<LibrarySeries[]> {
  const supabase = await createClient();
  if (!supabase) return localLibrary();

  const [{ data: series, error: seriesError }, { data: days, error: dayError }] = await Promise.all([
    supabase.from("series").select("id, slug, name").order("created_at", { ascending: false }),
    supabase.from("days").select("series_id, day_number, language, title, cover_url, published").eq("published", true),
  ]);

  if (seriesError || dayError) return localLibrary();
  if (!series) return localLibrary();

  const names = new Map(series.map((item) => [item.id, item]));
  const rows = (days ?? []).flatMap((day) => {
    const parent = names.get(day.series_id);
    if (!parent) return [];
    return [
      {
        slug: parent.slug,
        name: parent.name,
        day_number: day.day_number,
        language: day.language,
        title: day.title,
        cover_url: day.cover_url,
      },
    ];
  });

  const remote = groupDays(rows);
  for (const item of series) {
    if (!remote.some((entry) => entry.slug === item.slug)) {
      remote.push({ slug: item.slug, name: item.name, days: [] });
    }
  }
  const order = new Map(series.map((item, index) => [item.slug, index]));
  remote.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
  return remote;
}

export async function loadDay(series: string, dayNumber: number, language: Language): Promise<ReaderDay | null> {
  const supabase = await createClient();
  if (supabase) {
    const { data: parent } = await supabase.from("series").select("id, slug, name").eq("slug", series).maybeSingle();
    if (!parent) return null;

    const { data: day } = await supabase
      .from("days")
      .select("id, day_number, title, subtitle, language, published, cover_url, youtube_id")
      .eq("series_id", parent.id)
      .eq("day_number", dayNumber)
      .eq("language", language)
      .maybeSingle();

    if (!day?.published) return null;

    const { data: sections } = await supabase
      .from("sections")
      .select("id, section_order, title, content, minutes, start_sec")
      .eq("day_id", day.id)
      .order("section_order");

    if (!sections?.length) return null;

    return {
      dayNumber: day.day_number,
      language: day.language,
      series: parent.slug,
      seriesName: parent.name,
      title: day.title,
      subtitle: day.subtitle ?? "",
      coverUrl: day.cover_url,
      youtubeId: day.youtube_id ?? null,
      sections: sections.map(
        (section): ReaderSection => ({
          id: section.id,
          sectionOrder: section.section_order,
          title: section.title,
          content: asParagraphs(section.content),
          minutes: section.minutes,
          startSec: section.start_sec ?? null,
        }),
      ),
    };
  }

  return localDays.find((day) => day.series === series && day.dayNumber === dayNumber && day.language === language) ?? null;
}
