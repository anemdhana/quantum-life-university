"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { readingPath } from "@/lib/content";
import { asParagraphs, parseYoutubeId } from "@/lib/content/paragraphs";
import { slugify } from "@/lib/series";
import { createClient } from "@/lib/supabase/server";
import { minutesFor, sectionId } from "@/lib/transcript/structure.mjs";
import { captionsAsText, fetchYoutubeCaptions } from "@/lib/youtube/captions";

type Built = {
  sectionOrder: number;
  title: string;
  content: string[];
  minutes: number;
  startSec: number | null;
  id: string;
};

type ParsedDayJson = {
  title?: string;
  language?: "te" | "en";
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

async function saveCover(file: File | null, slug: string, dayNumber: number) {
  if (!file || file.size === 0) return null;
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 5_000_000) throw new Error("Use an image smaller than 5 MB.");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const filename = `${slug}-day-${dayNumber}.${ext}`;
  const directory = path.join(process.cwd(), "public", "covers");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  return `/covers/${filename}`;
}

function withIds(
  seriesSlug: string,
  dayNumber: number,
  language: "te" | "en",
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

/** Accepts day JSON (`sections` / `content`) or ChatGPT chapter JSON (`chapters` / `paras`). */
function parseDayJson(raw: string): ParsedDayJson {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("JSON is not valid. Paste the ChatGPT output as a single JSON object.");
  }

  if (!data || typeof data !== "object") throw new Error("JSON must be an object.");
  const root = data as Record<string, unknown>;

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

  const language = root.language === "en" ? "en" : root.language === "te" ? "te" : undefined;
  const youtubeRaw = typeof root.youtubeId === "string" ? root.youtubeId : typeof root.youtube_id === "string" ? root.youtube_id : null;
  const youtubeId = youtubeRaw ? parseYoutubeId(youtubeRaw) : null;

  return {
    title: typeof root.title === "string" ? root.title.trim() : undefined,
    language,
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

export async function importJsonReading(formData: FormData) {
  const seriesName = String(formData.get("series") ?? "");
  const titleInput = String(formData.get("title") ?? "").trim();
  const dayNumber = Number(formData.get("day"));
  const languageField = String(formData.get("language") ?? "te") === "en" ? "en" : "te";
  const youtubeInput = String(formData.get("youtube") ?? "").trim();
  const jsonRaw = String(formData.get("json") ?? "").trim();
  const image = formData.get("image");
  const file = image instanceof File ? image : null;

  if (!Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 31) {
    return { ok: false as const, error: "Choose a day from 1 to 31." };
  }
  if (!jsonRaw) return { ok: false as const, error: "Paste or upload the sections JSON." };

  let parsed: ParsedDayJson;
  try {
    parsed = parseDayJson(jsonRaw);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not parse JSON." };
  }

  const title = titleInput || parsed.title || "";
  if (!title) return { ok: false as const, error: "Enter a title for this day (or include title in the JSON)." };
  const language = parsed.language ?? languageField;
  const videoId = youtubeInput ? parseYoutubeId(youtubeInput) : parsed.youtubeId;
  if (youtubeInput && !videoId) return { ok: false as const, error: "Enter a valid YouTube video ID or URL." };

  const ready = await ensureSeries(seriesName);
  if (!ready.supabase || !ready.userId || !ready.series) {
    return { ok: false as const, error: ready.error ?? "Could not open the series." };
  }

  let coverUrl: string | null = null;
  try {
    coverUrl = await saveCover(file, ready.series.slug, dayNumber);
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
  language: "te" | "en";
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
    language: "te" | "en";
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
