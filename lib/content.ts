import { cache } from "react";
import { asParagraphs } from "@/lib/content/paragraphs";
import { readingPath } from "@/lib/series";
import { createClient } from "@/lib/supabase/server";
import { parseLanguage, sortLanguages } from "@/lib/language";
import type { Language, LibrarySeries, ReaderDay, ReaderSection, SectionOutline } from "@/types/content";

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

/** Offline fallbacks (~310KB) — loaded only when Supabase is unavailable. */
const loadLocalDays = cache(async (): Promise<ReaderDay[]> => {
  const [{ default: day7te }, { default: day8te }, { default: day8en }] = await Promise.all([
    import("@/content/day-07-te.json"),
    import("@/content/day-08-te.json"),
    import("@/content/day-08-en.json"),
  ]);
  return [
    asDay(day7te as StoredDay, "devi-navaratrula-jnanam", "Devi Navaratrula Jnanam"),
    asDay(day8te as StoredDay, "devi-navaratrula-jnanam", "Devi Navaratrula Jnanam"),
    asDay(day8en as StoredDay, "devi-navaratrula-jnanam", "Devi Navaratrula Jnanam"),
  ];
});

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
    const language = parseLanguage(row.language);
    if (language === "te") day.title = row.title;
    if (!day.languages.includes(language)) day.languages.push(language);
  }
  for (const entry of series.values()) {
    entry.days.sort((a, b) => a.dayNumber - b.dayNumber);
    for (const day of entry.days) {
      day.languages = sortLanguages(day.languages);
    }
  }
  return [...series.values()];
}

async function localLibrary(): Promise<LibrarySeries[]> {
  const localDays = await loadLocalDays();
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

const getSeriesBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  if (!supabase) return null;
  const { data } = await supabase.from("series").select("id, slug, name").eq("slug", slug).maybeSingle();
  return data;
});

/** Series names only — for prepare UI without loading every day row. */
export const listSeriesNames = cache(async (): Promise<string[]> => {
  const supabase = await createClient();
  if (!supabase) {
    const library = await localLibrary();
    return library.map((series) => series.name);
  }
  const { data, error } = await supabase.from("series").select("name").order("created_at", { ascending: false });
  if (error || !data) {
    const library = await localLibrary();
    return library.map((series) => series.name);
  }
  return data.map((row) => row.name);
});

export const loadLibrary = cache(async (): Promise<LibrarySeries[]> => {
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
});

/** Lightweight language list for a day — avoids loading full section payloads twice. */
export const listDayLanguages = cache(async (series: string, dayNumber: number): Promise<Language[]> => {
  const supabase = await createClient();
  if (supabase) {
    const parent = await getSeriesBySlug(series);
    if (!parent) return [];
    const { data: days } = await supabase
      .from("days")
      .select("language")
      .eq("series_id", parent.id)
      .eq("day_number", dayNumber)
      .eq("published", true);
    return sortLanguages((days ?? []).map((day) => parseLanguage(day.language)));
  }

  const localDays = await loadLocalDays();
  return sortLanguages(
    localDays.filter((day) => day.series === series && day.dayNumber === dayNumber).map((day) => day.language),
  );
});

export const loadDay = cache(async (series: string, dayNumber: number, language: Language): Promise<ReaderDay | null> => {
  const supabase = await createClient();
  if (supabase) {
    const parent = await getSeriesBySlug(series);
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

  const localDays = await loadLocalDays();
  return localDays.find((day) => day.series === series && day.dayNumber === dayNumber && day.language === language) ?? null;
});

export type DayOutline = {
  dayNumber: number;
  language: Language;
  series: string;
  seriesName: string;
  title: string;
  coverUrl: string | null;
  youtubeId: string | null;
  sections: SectionOutline[];
};

/** Section titles for the edit nav — no paragraph bodies. */
export const loadDayOutline = cache(async (series: string, dayNumber: number, language: Language): Promise<DayOutline | null> => {
  const supabase = await createClient();
  if (supabase) {
    const parent = await getSeriesBySlug(series);
    if (!parent) return null;

    const { data: day } = await supabase
      .from("days")
      .select("id, day_number, title, language, published, cover_url, youtube_id")
      .eq("series_id", parent.id)
      .eq("day_number", dayNumber)
      .eq("language", language)
      .maybeSingle();

    if (!day?.published) return null;

    const { data: sections } = await supabase
      .from("sections")
      .select("id, section_order, title, minutes, start_sec")
      .eq("day_id", day.id)
      .order("section_order");

    if (!sections?.length) return null;

    return {
      dayNumber: day.day_number,
      language: day.language,
      series: parent.slug,
      seriesName: parent.name,
      title: day.title,
      coverUrl: day.cover_url ?? null,
      youtubeId: day.youtube_id ?? null,
      sections: sections.map(
        (section): SectionOutline => ({
          id: section.id,
          sectionOrder: section.section_order,
          title: section.title,
          minutes: section.minutes,
          startSec: section.start_sec ?? null,
        }),
      ),
    };
  }

  const day = await loadDay(series, dayNumber, language);
  if (!day) return null;
  return {
    dayNumber: day.dayNumber,
    language: day.language,
    series: day.series,
    seriesName: day.seriesName,
    title: day.title,
    coverUrl: day.coverUrl,
    youtubeId: day.youtubeId,
    sections: day.sections.map(
      (section): SectionOutline => ({
        id: section.id,
        sectionOrder: section.sectionOrder,
        title: section.title,
        minutes: section.minutes,
        startSec: section.startSec,
      }),
    ),
  };
});

/** One section’s paragraphs — loaded when that nav item is opened. */
export const loadSection = cache(
  async (
    series: string,
    dayNumber: number,
    language: Language,
    sectionOrder: number,
  ): Promise<ReaderSection | null> => {
    const supabase = await createClient();
    if (supabase) {
      const parent = await getSeriesBySlug(series);
      if (!parent) return null;

      const { data: day } = await supabase
        .from("days")
        .select("id, published")
        .eq("series_id", parent.id)
        .eq("day_number", dayNumber)
        .eq("language", language)
        .maybeSingle();

      if (!day?.published) return null;

      const { data: section } = await supabase
        .from("sections")
        .select("id, section_order, title, content, minutes, start_sec")
        .eq("day_id", day.id)
        .eq("section_order", sectionOrder)
        .maybeSingle();

      if (!section) return null;

      return {
        id: section.id,
        sectionOrder: section.section_order,
        title: section.title,
        content: asParagraphs(section.content),
        minutes: section.minutes,
        startSec: section.start_sec ?? null,
      };
    }

    const day = await loadDay(series, dayNumber, language);
    return day?.sections.find((item) => item.sectionOrder === sectionOrder) ?? null;
  },
);
