"use server";

import { revalidatePath } from "next/cache";
import { parseLanguage } from "@/lib/language";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/series";
import type { Language } from "@/types/content";

async function requireAdmin() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, error: "Supabase is not configured." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, error: "Sign in as an admin." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile?.role !== "admin") return { supabase, error: "Only an admin can manage the library." };
  return { supabase, error: null };
}

function revalidateLibrary(seriesSlug?: string) {
  revalidatePath("/");
  revalidatePath("/admin");
  if (seriesSlug) revalidatePath(`/series/${seriesSlug}`);
}

async function clearSectionRefs(
  supabase: NonNullable<Awaited<ReturnType<typeof createClient>>>,
  sectionIds: string[],
) {
  if (sectionIds.length === 0) return null;
  const { error: highlightError } = await supabase.from("highlights").delete().in("section_id", sectionIds);
  if (highlightError) return highlightError.message;
  const { error: bookmarkError } = await supabase.from("bookmarks").delete().in("section_id", sectionIds);
  if (bookmarkError) return bookmarkError.message;
  const { error: progressError } = await supabase
    .from("user_progress")
    .update({ section_id: null, section_order: null })
    .in("section_id", sectionIds);
  if (progressError) return progressError.message;
  return null;
}

export async function renameSeries(input: { slug: string; name: string }) {
  const admin = await requireAdmin();
  if (!admin.supabase) return { ok: false as const, error: admin.error ?? "Sign in as an admin." };
  const name = input.name.trim();
  if (name.length < 2) return { ok: false as const, error: "Enter a series name." };

  const { error } = await admin.supabase.from("series").update({ name }).eq("slug", input.slug);
  if (error) return { ok: false as const, error: error.message };
  revalidateLibrary(input.slug);
  return { ok: true as const, name };
}

export async function deleteDay(input: { seriesSlug: string; dayNumber: number; language: Language }) {
  const admin = await requireAdmin();
  if (!admin.supabase) return { ok: false as const, error: admin.error ?? "Sign in as an admin." };

  const language = parseLanguage(input.language);
  const { data: series } = await admin.supabase.from("series").select("id, slug").eq("slug", input.seriesSlug).maybeSingle();
  if (!series) return { ok: false as const, error: "That series is not in the library." };

  const { data: day } = await admin.supabase
    .from("days")
    .select("id")
    .eq("series_id", series.id)
    .eq("day_number", input.dayNumber)
    .eq("language", language)
    .maybeSingle();
  if (!day) return { ok: false as const, error: "That language version is already gone." };

  const { data: sections } = await admin.supabase.from("sections").select("id").eq("day_id", day.id);
  const cleared = await clearSectionRefs(
    admin.supabase,
    (sections ?? []).map((section) => section.id),
  );
  if (cleared) return { ok: false as const, error: cleared };

  const { error } = await admin.supabase.from("days").delete().eq("id", day.id);
  if (error) return { ok: false as const, error: error.message };

  revalidateLibrary(series.slug);
  return { ok: true as const };
}

export async function deleteSeries(input: { slug: string }) {
  const admin = await requireAdmin();
  if (!admin.supabase) return { ok: false as const, error: admin.error ?? "Sign in as an admin." };

  const { data: series } = await admin.supabase.from("series").select("id, slug").eq("slug", input.slug).maybeSingle();
  if (!series) return { ok: false as const, error: "That series is not in the library." };

  const { data: days } = await admin.supabase.from("days").select("id").eq("series_id", series.id);
  const dayIds = (days ?? []).map((day) => day.id);
  if (dayIds.length > 0) {
    const { data: sections } = await admin.supabase.from("sections").select("id").in("day_id", dayIds);
    const cleared = await clearSectionRefs(
      admin.supabase,
      (sections ?? []).map((section) => section.id),
    );
    if (cleared) return { ok: false as const, error: cleared };
    const { error: dayError } = await admin.supabase.from("days").delete().eq("series_id", series.id);
    if (dayError) return { ok: false as const, error: dayError.message };
  }

  const { error } = await admin.supabase.from("series").delete().eq("id", series.id);
  if (error) return { ok: false as const, error: error.message };

  await admin.supabase.from("user_progress").update({ series_slug: null }).eq("series_slug", input.slug);
  revalidateLibrary();
  return { ok: true as const };
}

export async function createSeries(input: { name: string }) {
  const admin = await requireAdmin();
  if (!admin.supabase) return { ok: false as const, error: admin.error ?? "Sign in as an admin." };
  const name = input.name.trim();
  if (name.length < 2) return { ok: false as const, error: "Enter a series name." };
  const slug = slugify(name);
  const { data, error } = await admin.supabase.from("series").insert({ slug, name }).select("slug, name").single();
  if (error) return { ok: false as const, error: error.message };
  revalidateLibrary(data.slug);
  return { ok: true as const, slug: data.slug, name: data.name };
}
