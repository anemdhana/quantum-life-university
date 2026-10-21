"use server";

import { revalidatePath } from "next/cache";
import { loadSection } from "@/lib/content";
import { asParagraphs } from "@/lib/content/paragraphs";
import { parseLanguage } from "@/lib/language";
import { saveCoverImage } from "@/lib/media/covers";
import { createClient } from "@/lib/supabase/server";
import type { Language } from "@/types/content";

async function requireAdmin() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, userId: null, error: "Supabase is not configured." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, userId: null, error: "Sign in as an admin to save." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile?.role !== "admin") return { supabase, userId: null, error: "Only an admin can save sections." };
  return { supabase, userId: data.user.id, error: null };
}

export async function fetchSection(input: {
  series: string;
  dayNumber: number;
  language: Language;
  sectionOrder: number;
}) {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) return { ok: false as const, error: admin.error ?? "Only an admin can edit sections." };
  const section = await loadSection(input.series, input.dayNumber, input.language, input.sectionOrder);
  if (!section) return { ok: false as const, error: "That section was not found." };
  return { ok: true as const, section };
}

export async function updateSection(input: {
  id: string;
  dayNumber: number;
  language: Language;
  title: string;
  content: string[];
  minutes: number | null;
  startSec: number | null;
}) {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) return { ok: false as const, error: admin.error ?? "Sign in as an admin to save." };

  const paragraphs = asParagraphs(input.content);
  if (!input.title.trim() || paragraphs.length === 0) {
    return { ok: false as const, error: "A section needs a title and at least one paragraph." };
  }

  const { error } = await admin.supabase
    .from("sections")
    .update({
      title: input.title.trim(),
      content: paragraphs,
      minutes: input.minutes,
      start_sec: input.startSec,
      updated_at: new Date().toISOString(),
      updated_by: admin.userId,
    })
    .eq("id", input.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/series`);
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function updateDayCover(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) return { ok: false as const, error: admin.error ?? "Sign in as an admin to save." };

  const series = String(formData.get("series") ?? "").trim();
  const dayNumber = Number(formData.get("dayNumber"));
  const language: Language = parseLanguage(formData.get("language"));
  const image = formData.get("image");
  const file = image instanceof File ? image : null;
  const clear = String(formData.get("clear") ?? "") === "1";

  if (!series || !Number.isInteger(dayNumber) || dayNumber < 1) {
    return { ok: false as const, error: "Missing series or day." };
  }

  const { data: parent } = await admin.supabase.from("series").select("id, slug").eq("slug", series).maybeSingle();
  if (!parent) return { ok: false as const, error: "That series was not found." };

  let coverUrl: string | null = null;
  if (clear) {
    coverUrl = null;
  } else {
    try {
      coverUrl = await saveCoverImage(file, parent.slug, dayNumber, language);
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "Could not save the image." };
    }
    if (!coverUrl) return { ok: false as const, error: "Choose an image to upload." };
  }

  const { error } = await admin.supabase
    .from("days")
    .update({ cover_url: coverUrl })
    .eq("series_id", parent.id)
    .eq("day_number", dayNumber)
    .eq("language", language);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/");
  revalidatePath("/admin");
  revalidatePath(`/series/${series}/day/${dayNumber}`);
  revalidatePath(`/admin/edit/${dayNumber}`);
  return { ok: true as const, coverUrl };
}
