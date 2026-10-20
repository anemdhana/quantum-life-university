"use server";

import { revalidatePath } from "next/cache";
import { loadSection } from "@/lib/content";
import { asParagraphs } from "@/lib/content/paragraphs";
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
