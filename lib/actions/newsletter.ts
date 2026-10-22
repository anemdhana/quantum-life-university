"use server";

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import {
  isNewsletterSectionTitle,
  newsletterSectionSlug,
  type NewsletterSectionTitle,
} from "@/lib/newsletter/sections";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  if (!supabase) return { supabase: null, userId: null, error: "Supabase is not configured." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { supabase, userId: null, error: "Sign in as an admin." };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
  if (profile?.role !== "admin") return { supabase, userId: null, error: "Only an admin can manage newsletter assets." };
  return { supabase, userId: data.user.id, error: null };
}

function todayLocalIsoDate() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseCheckbox(value: FormDataEntryValue | null) {
  if (value === null || value === undefined) return false;
  const text = String(value).trim().toLowerCase();
  return text === "1" || text === "true" || text === "on" || text === "yes";
}

async function saveImage(file: File, title: NewsletterSectionTitle, takenOn: string) {
  if (!file.type.startsWith("image/")) throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size > 5_000_000) throw new Error("Use an image smaller than 5 MB.");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const short = Math.random().toString(36).slice(2, 8);
  const filename = `${newsletterSectionSlug(title)}-${takenOn.replace(/-/g, "")}-${short}.${ext}`;
  const directory = path.join(process.cwd(), "public", "newsletter");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  return `/newsletter/${filename}`;
}

async function removePublicImage(imageUrl: string | null | undefined) {
  if (!imageUrl?.startsWith("/newsletter/")) return;
  const filename = imageUrl.slice("/newsletter/".length);
  if (!filename || filename.includes("..") || filename.includes("/") || filename.includes("\\")) return;
  try {
    await unlink(path.join(process.cwd(), "public", "newsletter", filename));
  } catch {
    // Missing file is fine when replacing or cleaning up.
  }
}

export type NewsletterAssetListItem = {
  id: string;
  title: NewsletterSectionTitle;
  label: string;
  summary: string;
  instruction: string;
  summaryInstruction: string;
  useAsBackground: boolean;
  imageUrl: string;
  takenOn: string;
  createdAt: string;
};

export type NewsletterSectionSettingsMap = Partial<Record<NewsletterSectionTitle, string>>;

function mapAsset(row: {
  id: string;
  title: string;
  label: string;
  summary: string;
  instruction?: string | null;
  summary_instruction?: string | null;
  use_as_background?: boolean | null;
  image_url: string;
  taken_on: string;
  created_at: string;
}): NewsletterAssetListItem | null {
  if (!isNewsletterSectionTitle(row.title)) return null;
  return {
    id: row.id,
    title: row.title,
    label: row.label,
    summary: row.summary,
    instruction: row.instruction ?? "",
    summaryInstruction: row.summary_instruction ?? "",
    useAsBackground: Boolean(row.use_as_background),
    imageUrl: row.image_url,
    takenOn: row.taken_on,
    createdAt: row.created_at,
  };
}

const ASSET_SELECT =
  "id, title, label, summary, instruction, summary_instruction, use_as_background, image_url, taken_on, created_at";

export async function listNewsletterAssets(options?: {
  title?: NewsletterSectionTitle;
  takenOnFrom?: string;
  takenOnTo?: string;
  limit?: number;
}): Promise<NewsletterAssetListItem[]> {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) return [];

  const limit = Math.min(Math.max(options?.limit ?? 100, 1), 500);
  let query = admin.supabase
    .from("newsletter_assets")
    .select(ASSET_SELECT)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.title && isNewsletterSectionTitle(options.title)) {
    query = query.eq("title", options.title);
  }
  if (options?.takenOnFrom && /^\d{4}-\d{2}-\d{2}$/.test(options.takenOnFrom)) {
    query = query.gte("taken_on", options.takenOnFrom);
  }
  if (options?.takenOnTo && /^\d{4}-\d{2}-\d{2}$/.test(options.takenOnTo)) {
    query = query.lte("taken_on", options.takenOnTo);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(mapAsset).filter((item): item is NewsletterAssetListItem => Boolean(item));
}

export async function listNewsletterSectionSettings(): Promise<NewsletterSectionSettingsMap> {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) return {};

  const { data, error } = await admin.supabase.from("newsletter_section_settings").select("title, instruction");
  if (error || !data) return {};

  const map: NewsletterSectionSettingsMap = {};
  for (const row of data) {
    if (!isNewsletterSectionTitle(row.title)) continue;
    map[row.title] = row.instruction ?? "";
  }
  return map;
}

export async function upsertNewsletterSectionInstruction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) {
    return { ok: false as const, error: admin.error ?? "Sign in as an admin." };
  }

  const titleRaw = String(formData.get("title") ?? "").trim();
  const instruction = String(formData.get("instruction") ?? "").trim();
  if (!isNewsletterSectionTitle(titleRaw)) {
    return { ok: false as const, error: "Invalid section title." };
  }
  if (instruction.length > 4000) {
    return { ok: false as const, error: "Keep the section instruction under 4000 characters." };
  }

  const { error } = await admin.supabase.from("newsletter_section_settings").upsert(
    {
      title: titleRaw,
      instruction,
      updated_at: new Date().toISOString(),
      updated_by: admin.userId,
    },
    { onConflict: "title" },
  );

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/admin/newsletter");
  return { ok: true as const, title: titleRaw as NewsletterSectionTitle, instruction };
}

function parseAssetFields(formData: FormData) {
  const titleRaw = String(formData.get("title") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const instruction = String(formData.get("instruction") ?? "").trim();
  const summaryInstruction = String(formData.get("summaryInstruction") ?? "").trim();
  const useAsBackground = parseCheckbox(formData.get("useAsBackground"));
  const takenOnRaw = String(formData.get("takenOn") ?? "").trim() || todayLocalIsoDate();
  const image = formData.get("image");
  const file = image instanceof File && image.size > 0 ? image : null;

  if (!titleRaw) return { ok: false as const, error: "Choose a newsletter section title." };
  if (!isNewsletterSectionTitle(titleRaw)) return { ok: false as const, error: "Invalid section title." };
  if (label.length < 2) return { ok: false as const, error: "Enter a long label (header title + subtitle)." };
  if (summary.length < 2) return { ok: false as const, error: "Enter topic content in the summary." };
  if (instruction.length > 2000) return { ok: false as const, error: "Keep the photo instruction under 2000 characters." };
  if (summaryInstruction.length > 2000) {
    return { ok: false as const, error: "Keep the summary instruction under 2000 characters." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(takenOnRaw)) {
    return { ok: false as const, error: "Date taken must be YYYY-MM-DD." };
  }

  return {
    ok: true as const,
    title: titleRaw,
    label,
    summary,
    instruction,
    summaryInstruction,
    useAsBackground,
    takenOn: takenOnRaw,
    file,
  };
}

export async function createNewsletterAsset(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) {
    return { ok: false as const, error: admin.error ?? "Sign in as an admin." };
  }

  const parsed = parseAssetFields(formData);
  if (!parsed.ok) return parsed;
  if (!parsed.file) return { ok: false as const, error: "Upload an image." };

  let imageUrl: string;
  try {
    imageUrl = await saveImage(parsed.file, parsed.title, parsed.takenOn);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not save the image." };
  }

  const { data, error } = await admin.supabase
    .from("newsletter_assets")
    .insert({
      title: parsed.title,
      label: parsed.label,
      summary: parsed.summary,
      instruction: parsed.instruction,
      summary_instruction: parsed.summaryInstruction,
      use_as_background: parsed.useAsBackground,
      image_url: imageUrl,
      taken_on: parsed.takenOn,
      created_by: admin.userId,
    })
    .select(ASSET_SELECT)
    .single();

  if (error || !data) {
    await removePublicImage(imageUrl);
    return { ok: false as const, error: error?.message ?? "Could not save the asset." };
  }

  const asset = mapAsset(data);
  if (!asset) return { ok: false as const, error: "Saved row has an invalid section title." };

  revalidatePath("/admin/newsletter");
  revalidatePath("/admin");
  return { ok: true as const, asset };
}

export async function updateNewsletterAsset(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) {
    return { ok: false as const, error: admin.error ?? "Sign in as an admin." };
  }

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return { ok: false as const, error: "Missing asset id." };

  const parsed = parseAssetFields(formData);
  if (!parsed.ok) return parsed;

  const { data: existing, error: existingError } = await admin.supabase
    .from("newsletter_assets")
    .select("id, image_url")
    .eq("id", id)
    .maybeSingle();
  if (existingError || !existing) {
    return { ok: false as const, error: existingError?.message ?? "That asset was not found." };
  }

  let imageUrl = existing.image_url;
  let replacedImage: string | null = null;
  if (parsed.file) {
    try {
      replacedImage = await saveImage(parsed.file, parsed.title, parsed.takenOn);
      imageUrl = replacedImage;
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "Could not save the image." };
    }
  }

  const { data, error } = await admin.supabase
    .from("newsletter_assets")
    .update({
      title: parsed.title,
      label: parsed.label,
      summary: parsed.summary,
      instruction: parsed.instruction,
      summary_instruction: parsed.summaryInstruction,
      use_as_background: parsed.useAsBackground,
      image_url: imageUrl,
      taken_on: parsed.takenOn,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(ASSET_SELECT)
    .single();

  if (error || !data) {
    if (replacedImage) await removePublicImage(replacedImage);
    return { ok: false as const, error: error?.message ?? "Could not update the asset." };
  }

  if (replacedImage && existing.image_url !== replacedImage) {
    await removePublicImage(existing.image_url);
  }

  const asset = mapAsset(data);
  if (!asset) return { ok: false as const, error: "Updated row has an invalid section title." };

  revalidatePath("/admin/newsletter");
  revalidatePath("/admin");
  return { ok: true as const, asset };
}

export async function deleteNewsletterAsset(input: { id: string }) {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) {
    return { ok: false as const, error: admin.error ?? "Sign in as an admin." };
  }

  const id = input.id.trim();
  if (!id) return { ok: false as const, error: "Missing asset id." };

  // Prefer returning=representation so a blocked RLS delete is not a silent no-op.
  const { data: deleted, error } = await admin.supabase
    .from("newsletter_assets")
    .delete()
    .eq("id", id)
    .select("id, image_url")
    .maybeSingle();

  if (error) return { ok: false as const, error: error.message };
  if (!deleted) {
    return {
      ok: false as const,
      error: "Could not remove that photo. Sign in as an admin and try again.",
    };
  }

  await removePublicImage(deleted.image_url);
  revalidatePath("/admin/newsletter");
  revalidatePath("/admin");
  return { ok: true as const, id: deleted.id };
}
