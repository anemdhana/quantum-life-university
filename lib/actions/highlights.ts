"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, user: null, error: "Supabase is not configured." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, user: null, error: "Sign in to save this." };
  return { supabase, user: data.user, error: null };
}

export async function createHighlight(input: {
  dayNumber: number;
  sectionId: string;
  selectedText: string;
  startOffset?: number | null;
  endOffset?: number | null;
  noteText?: string | null;
}) {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false as const, error: error ?? "Sign in to save this." };

  const { data, error: insertError } = await supabase
    .from("highlights")
    .insert({
      user_id: user.id,
      day_number: input.dayNumber,
      section_id: input.sectionId,
      selected_text: input.selectedText,
      start_offset: input.startOffset ?? null,
      end_offset: input.endOffset ?? null,
      note_text: input.noteText ?? null,
    })
    .select("id")
    .single();

  if (insertError) return { ok: false as const, error: insertError.message };
  revalidatePath("/dashboard");
  revalidatePath("/highlights");
  return { ok: true as const, id: data.id };
}

export async function updateHighlightNote(id: string, noteText: string) {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false as const, error: error ?? "Sign in to save this." };

  const { error: updateError } = await supabase
    .from("highlights")
    .update({ note_text: noteText, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);

  if (updateError) return { ok: false as const, error: updateError.message };
  revalidatePath("/dashboard");
  revalidatePath("/highlights");
  return { ok: true as const };
}

export async function toggleBookmark(input: {
  dayNumber: number;
  sectionId: string;
  label: string;
}) {
  const { supabase, user, error } = await requireUser();
  if (!supabase || !user) return { ok: false as const, error: error ?? "Sign in to bookmark." };

  const { data: existing } = await supabase
    .from("bookmarks")
    .select("id")
    .eq("user_id", user.id)
    .eq("section_id", input.sectionId)
    .maybeSingle();

  if (existing) {
    const { error: deleteError } = await supabase.from("bookmarks").delete().eq("id", existing.id);
    if (deleteError) return { ok: false as const, error: deleteError.message };
    revalidatePath("/dashboard");
    return { ok: true as const, bookmarked: false };
  }

  const { error: insertError } = await supabase.from("bookmarks").insert({
    user_id: user.id,
    day_number: input.dayNumber,
    section_id: input.sectionId,
    label: input.label,
  });
  if (insertError) return { ok: false as const, error: insertError.message };
  revalidatePath("/dashboard");
  return { ok: true as const, bookmarked: true };
}
