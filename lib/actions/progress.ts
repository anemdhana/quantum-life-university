"use server";

import { createClient } from "@/lib/supabase/server";
import type { Language } from "@/types/content";

export async function saveProgress(input: {
  seriesSlug: string;
  dayNumber: number;
  language: Language;
  sectionId: string;
  sectionOrder: number;
  spreadIndex: number;
}) {
  const supabase = await createClient();
  if (!supabase) return { ok: false as const, reason: "unconfigured" as const };

  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false as const, reason: "signed-out" as const };

  const { error } = await supabase.from("user_progress").upsert(
    {
      user_id: data.user.id,
      day_number: input.dayNumber,
      language: input.language,
      series_slug: input.seriesSlug,
      section_id: input.sectionId,
      section_order: input.sectionOrder,
      spread_index: input.spreadIndex,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) return { ok: false as const, reason: "error" as const, message: error.message };
  return { ok: true as const };
}
