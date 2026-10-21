"use server";

import { revalidatePath } from "next/cache";
import { readingPath } from "@/lib/content";
import { asParagraphs, parseYoutubeId } from "@/lib/content/paragraphs";
import { saveCoverImage } from "@/lib/media/covers";
import { slugify } from "@/lib/series";
import { isLanguage } from "@/lib/language";
import { createClient } from "@/lib/supabase/server";
import { minutesFor, sectionId } from "@/lib/transcript/structure.mjs";
import { captionsAsText, fetchYoutubeCaptions } from "@/lib/youtube/captions";
import { fetchPlaylistVideos, parseYoutubePlaylistId, safeCaptionFilename } from "@/lib/youtube/playlist";
import { createStoreZip } from "@/lib/youtube/zip";
import type { Language } from "@/types/content";

type Built = {
  sectionOrder: number;
  title: string;
  content: string[];
  minutes: number;
  startSec: number | null;
  id: string;
};

type ParsedDayJson = {
  dayNumber?: number;
  title?: string;
  language?: Language;
  seriesName?: string;
  youtubeId?: string | null;
  sections: Array<{
    title: string;
    content: string[];
    minutes: number | null;
    startSec: number | null;
  }>;
};

async function requireAdmin() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, userId: null, error: "Supabase is not configured." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, userId: null, error: "Sign in as an admin." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile?.role !== "admin") return { supabase, userId: null, error: "Only an admin can prepare a reading." };
  return { supabase, userId: data.user.id, error: null };
}

async function ensureSeries(name: string) {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) return { ...admin, series: null };
  const trimmed = name.trim();
  if (trimmed.length < 2) return { ...admin, series: null, error: "Enter the series name." };

  const slug = slugify(trimmed);
  const { data: existing } = await admin.supabase.from("series").select("id, slug, name").eq("slug", slug).maybeSingle();
  if (existing) return { ...admin, series: existing };

  const { data: created, error } = await admin.supabase
    .from("series")
    .insert({ slug, name: trimmed })
    .select("id, slug, name")
    .single();
  if (error || !created) return { ...admin, series: null, error: error?.message ?? "Could not create the series." };
  return { ...admin, series: created };
}

function withIds(
  seriesSlug: string,
  dayNumber: number,
  language: Language,
  sections: Array<{ title: string; content: string[]; minutes: number | null; startSec?: number | null }>,
): Built[] {
  return sections.map((section, index) => {
    const content = asParagraphs(section.content);
    return {
      sectionOrder: index + 1,
      title: section.title,
      content,
      minutes: section.minutes ?? minutesFor(content),
      startSec: section.startSec ?? null,
      id: sectionId(seriesSlug, dayNumber, language, index + 1),
    };
  });
}

function asStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

function asOptionalSec(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(0, Math.round(value));
}

function asOptionalMinutes(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.max(1, Math.round(value));
}

function dayNumberFromUnknown(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 31) return value;
  if (typeof value === "string" && /^\d{1,2}$/.test(value.trim())) {
    const n = Number(value.trim());
    if (n >= 1 && n <= 31) return n;
  }
  return undefined;
}

function hintsFromFilename(filename: string | null | undefined): { dayNumber?: number; language?: Language } {
  if (!filename) return {};
  const base = filename.replace(/^.*[\\/]/, "");
  const dayMatch = base.match(/day[_-]?(\d{1,2})/i);
  const langMatch = base.match(/(?:^|[_\-.])(te|en|kn|hi)(?:[_\-.]|$)/i);
  const lang = langMatch?.[1]?.toLowerCase();
  return {
    dayNumber: dayMatch ? dayNumberFromUnknown(dayMatch[1]) : undefined,
    language: isLanguage(lang) ? lang : undefined,
  };
}

/** Accepts day JSON (`sections` / `content`) or ChatGPT chapter JSON (`chapters` / `paras`). */
function parseDayJson(raw: string, filename?: string | null): ParsedDayJson {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("JSON is not valid. Upload a single JSON object from ChatGPT.");
  }

  if (!data || typeof data !== "object") throw new Error("JSON must be an object.");
  const root = data as Record<string, unknown>;
  const fileHints = hintsFromFilename(filename);

  const list = Array.isArray(root.sections)
    ? root.sections
    : Array.isArray(root.chapters)
      ? root.chapters
      : null;
  if (!list?.length) throw new Error('JSON needs a non-empty "sections" (or "chapters") array.');

  const sections = list.map((item, index) => {
    if (!item || typeof item !== "object") throw new Error(`Section ${index + 1} is not an object.`);
    const row = item as Record<string, unknown>;
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const content = asStringList(row.content).length ? asStringList(row.content) : asStringList(row.paras);
    if (!title) throw new Error(`Section ${index + 1} needs a title.`);
    if (!content.length) throw new Error(`Section ${index + 1} ("${title}") needs at least one paragraph.`);
    return {
      title,
      content,
      minutes: asOptionalMinutes(row.minutes),
      startSec: asOptionalSec(row.startSec ?? row.start_sec),
    };
  });

  const language = isLanguage(root.language) ? root.language : fileHints.language;
  const youtubeRaw =
    typeof root.youtubeId === "string"
      ? root.youtubeId
      : typeof root.youtube_id === "string"
        ? root.youtube_id
        : null;
  const youtubeId = youtubeRaw ? parseYoutubeId(youtubeRaw) : null;
  const dayNumber =
    dayNumberFromUnknown(root.dayNumber) ??
    dayNumberFromUnknown(root.day_number) ??
    dayNumberFromUnknown(root.day) ??
    fileHints.dayNumber;

  const seriesRaw =
    typeof root.seriesName === "string"
      ? root.seriesName
      : typeof root.series_name === "string"
        ? root.series_name
        : typeof root.series === "string"
          ? root.series
          : undefined;
  const seriesName = seriesRaw?.trim() || undefined;

  const title =
    (typeof root.title === "string" ? root.title.trim() : "") ||
    (typeof root.subtitle === "string" ? root.subtitle.trim() : "") ||
    sections[0]?.title ||
    undefined;

  return {
    dayNumber,
    title,
    language,
    seriesName,
    youtubeId,
    sections,
  };
}

export async function downloadYoutubeCaptions(input: { youtube: string; language: "te" | "en" }) {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) {
    return { ok: false as const, error: admin.error ?? "Sign in as an admin." };
  }

  const videoId = parseYoutubeId(input.youtube);
  if (!videoId) return { ok: false as const, error: "Enter a YouTube video ID or URL." };

  try {
    const cues = await fetchYoutubeCaptions(videoId, input.language);
    const text = captionsAsText(cues);
    return {
      ok: true as const,
      videoId,
      language: input.language,
      cueCount: cues.length,
      filename: `${videoId}-${input.language}-captions.txt`,
      text,
    };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not download captions." };
  }
}

export async function downloadYoutubePlaylistCaptions(input: {
  playlist: string;
  language: "te" | "en";
}) {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) {
    return { ok: false as const, error: admin.error ?? "Sign in as an admin." };
  }

  const playlistId = parseYoutubePlaylistId(input.playlist);
  if (!playlistId) return { ok: false as const, error: "Enter a YouTube playlist ID or URL (list=…)." };

  try {
    const videos = await fetchPlaylistVideos(playlistId, input.language);
    const entries: Array<{ name: string; data: string }> = [];
    const failures: Array<{ videoId: string; title: string; error: string }> = [];
    let okCount = 0;
    let cueTotal = 0;

    for (const video of videos) {
      try {
        const cues = await fetchYoutubeCaptions(video.videoId, input.language);
        const text = captionsAsText(cues);
        entries.push({
          name: safeCaptionFilename(video.index, video.videoId, video.title, input.language),
          data: `# ${video.title}\n# https://www.youtube.com/watch?v=${video.videoId}\n# language=${input.language}\n\n${text}\n`,
        });
        okCount += 1;
        cueTotal += cues.length;
      } catch (error) {
        failures.push({
          videoId: video.videoId,
          title: video.title,
          error: error instanceof Error ? error.message : "Could not download captions.",
        });
      }
    }

    if (!entries.length) {
      const detail = failures[0]?.error ?? "No caption files were created.";
      return { ok: false as const, error: `Playlist captions failed. ${detail}` };
    }

    if (failures.length) {
      const report = failures
        .map((item, index) => `${index + 1}. ${item.videoId} — ${item.title}\n   ${item.error}`)
        .join("\n\n");
      entries.push({
        name: "_failures.txt",
        data: `Playlist ${playlistId}\nSucceeded: ${okCount}\nFailed: ${failures.length}\n\n${report}\n`,
      });
    }

    entries.unshift({
      name: "_manifest.txt",
      data: [
        `Playlist: ${playlistId}`,
        `Language: ${input.language}`,
        `Videos in playlist (capped): ${videos.length}`,
        `Caption files: ${okCount}`,
        `Failures: ${failures.length}`,
        `Total cue lines: ${cueTotal}`,
        "",
        ...entries
          .filter((entry) => entry.name.endsWith("-captions.txt"))
          .map((entry) => entry.name),
        "",
      ].join("\n"),
    });

    const zip = createStoreZip(entries);
    return {
      ok: true as const,
      playlistId,
      language: input.language,
      videoCount: videos.length,
      okCount,
      failCount: failures.length,
      cueTotal,
      filename: `${playlistId}-${input.language}-captions.zip`,
      zipBase64: zip.toString("base64"),
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not download playlist captions.",
    };
  }
}

export async function importJsonReading(formData: FormData) {
  const seriesInput = String(formData.get("series") ?? "").trim();
  const youtubeInput = String(formData.get("youtube") ?? "").trim();
  const jsonRaw = String(formData.get("json") ?? "").trim();
  const jsonFilename = String(formData.get("jsonFilename") ?? "").trim() || null;
  const image = formData.get("image");
  const file = image instanceof File ? image : null;

  if (!jsonRaw) return { ok: false as const, error: "Upload the sections JSON." };

  let parsed: ParsedDayJson;
  try {
    parsed = parseDayJson(jsonRaw, jsonFilename);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not parse JSON." };
  }

  const forceLanguageRaw = String(formData.get("forceLanguage") ?? "").trim();
  const forceLanguage = isLanguage(forceLanguageRaw) ? forceLanguageRaw : null;
  const forceDayNumber = dayNumberFromUnknown(formData.get("forceDayNumber"));

  const seriesName = seriesInput || parsed.seriesName || "";
  if (seriesName.length < 2) {
    return { ok: false as const, error: "Enter the series name in Import JSON (or include series in the file)." };
  }

  const dayNumber = forceDayNumber ?? parsed.dayNumber;
  if (!dayNumber || dayNumber < 1 || dayNumber > 31) {
    return {
      ok: false as const,
      error: 'JSON needs "dayNumber" (1–31), or name the file like day-01-te.json.',
    };
  }

  const title = parsed.title?.trim() || `Day ${dayNumber}`;
  const language = forceLanguage ?? parsed.language ?? "te";
  const videoId = youtubeInput ? parseYoutubeId(youtubeInput) : parsed.youtubeId;
  if (youtubeInput && !videoId) return { ok: false as const, error: "Enter a valid YouTube video ID or URL." };

  const ready = await ensureSeries(seriesName);
  if (!ready.supabase || !ready.userId || !ready.series) {
    return { ok: false as const, error: ready.error ?? "Could not open the series." };
  }

  let coverUrl: string | null = null;
  try {
    coverUrl = await saveCoverImage(file, ready.series.slug, dayNumber, language);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not save the image." };
  }

  const sections = withIds(ready.series.slug, dayNumber, language, parsed.sections);

  const saved = await writeDay({
    supabase: ready.supabase,
    userId: ready.userId,
    seriesId: ready.series.id,
    seriesSlug: ready.series.slug,
    dayNumber,
    language,
    title,
    coverUrl,
    youtubeId: videoId,
    sections,
  });
  if (!saved.ok) return saved;

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/series/${ready.series.slug}/day/${dayNumber}`);
  return {
    ok: true as const,
    seriesSlug: ready.series.slug,
    seriesName: ready.series.name,
    dayNumber,
    language,
    youtubeId: videoId,
    href: readingPath(ready.series.slug, dayNumber, language),
    editHref: `/admin/edit/${dayNumber}/1?lang=${language}&series=${ready.series.slug}`,
    sections: sections.map((section) => ({ order: section.sectionOrder, title: section.title, minutes: section.minutes })),
  };
}

async function writeDay(input: {
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>;
  userId: string;
  seriesId: number;
  seriesSlug: string;
  dayNumber: number;
  language: Language;
  title: string;
  coverUrl: string | null;
  youtubeId?: string | null;
  sections: Built[];
}) {
  const row: {
    series_id: number;
    day_number: number;
    title: string;
    subtitle: string;
    language: Language;
    published: boolean;
    cover_url?: string;
    youtube_id?: string | null;
  } = {
    series_id: input.seriesId,
    day_number: input.dayNumber,
    title: input.title,
    subtitle: `Day ${input.dayNumber}`,
    language: input.language,
    published: true,
  };
  if (input.coverUrl) row.cover_url = input.coverUrl;
  if (input.youtubeId !== undefined) row.youtube_id = input.youtubeId;

  const { data: day, error: dayError } = await input.supabase
    .from("days")
    .upsert(row, { onConflict: "series_id,day_number,language" })
    .select("id")
    .single();
  if (dayError || !day) return { ok: false as const, error: dayError?.message ?? "Could not save the day." };

  const { data: existingSections } = await input.supabase.from("sections").select("id").eq("day_id", day.id);
  const sectionIds = (existingSections ?? []).map((section) => section.id);
  if (sectionIds.length > 0) {
    const { error: highlightError } = await input.supabase.from("highlights").delete().in("section_id", sectionIds);
    if (highlightError) return { ok: false as const, error: highlightError.message };
    const { error: bookmarkError } = await input.supabase.from("bookmarks").delete().in("section_id", sectionIds);
    if (bookmarkError) return { ok: false as const, error: bookmarkError.message };
    const { error: progressError } = await input.supabase
      .from("user_progress")
      .update({ section_id: null, section_order: null })
      .in("section_id", sectionIds);
    if (progressError) return { ok: false as const, error: progressError.message };
  }

  const { error: clearError } = await input.supabase.from("sections").delete().eq("day_id", day.id);
  if (clearError) return { ok: false as const, error: clearError.message };

  const { error: insertError } = await input.supabase.from("sections").insert(
    input.sections.map((section) => ({
      id: section.id,
      day_id: day.id,
      section_order: section.sectionOrder,
      title: section.title,
      content: section.content,
      minutes: section.minutes,
      start_sec: section.startSec,
      updated_by: input.userId,
    })),
  );
  if (insertError) return { ok: false as const, error: insertError.message };
  return { ok: true as const };
}
