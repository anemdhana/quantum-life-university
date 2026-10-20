"use server";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
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

function safeSlug(value: string) {
  return (
    value
      .normalize("NFKD")
      .replace(/[^\w\s-]+/g, "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "asset"
  );
}

async function saveImage(file: File, title: string, takenOn: string) {
  if (!file.type.startsWith("image/")) throw new Error("Choose a JPEG, PNG, or WebP image.");
  if (file.size > 5_000_000) throw new Error("Use an image smaller than 5 MB.");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const short = Math.random().toString(36).slice(2, 8);
  const filename = `${safeSlug(title)}-${takenOn.replace(/-/g, "")}-${short}.${ext}`;
  const directory = path.join(process.cwd(), "public", "newsletter");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  return `/newsletter/${filename}`;
}

export type NewsletterAssetListItem = {
  id: string;
  title: string;
  label: string;
  summary: string;
  imageUrl: string;
  takenOn: string;
  createdAt: string;
};

export async function listNewsletterAssets(): Promise<NewsletterAssetListItem[]> {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) return [];

  const { data, error } = await admin.supabase
    .from("newsletter_assets")
    .select("id, title, label, summary, image_url, taken_on, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    title: row.title,
    label: row.label,
    summary: row.summary,
    imageUrl: row.image_url,
    takenOn: row.taken_on,
    createdAt: row.created_at,
  }));
}

export async function createNewsletterAsset(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin.supabase || !admin.userId) {
    return { ok: false as const, error: admin.error ?? "Sign in as an admin." };
  }

  const title = String(formData.get("title") ?? "").trim();
  const label = String(formData.get("label") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const takenOnRaw = String(formData.get("takenOn") ?? "").trim() || todayLocalIsoDate();
  const image = formData.get("image");
  const file = image instanceof File ? image : null;

  if (title.length < 2) return { ok: false as const, error: "Enter a title (at least 2 characters)." };
  if (label.length < 2) return { ok: false as const, error: "Enter a long label / caption." };
  if (summary.length < 2) return { ok: false as const, error: "Enter a short summary." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(takenOnRaw)) {
    return { ok: false as const, error: "Date taken must be YYYY-MM-DD." };
  }
  if (!file || file.size === 0) return { ok: false as const, error: "Upload an image." };

  let imageUrl: string;
  try {
    imageUrl = await saveImage(file, title, takenOnRaw);
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : "Could not save the image." };
  }

  const { data, error } = await admin.supabase
    .from("newsletter_assets")
    .insert({
      title,
      label,
      summary,
      image_url: imageUrl,
      taken_on: takenOnRaw,
      created_by: admin.userId,
    })
    .select("id, title, label, summary, image_url, taken_on, created_at")
    .single();

  if (error || !data) return { ok: false as const, error: error?.message ?? "Could not save the asset." };

  revalidatePath("/admin/newsletter");
  return {
    ok: true as const,
    asset: {
      id: data.id,
      title: data.title,
      label: data.label,
      summary: data.summary,
      imageUrl: data.image_url,
      takenOn: data.taken_on,
      createdAt: data.created_at,
    } satisfies NewsletterAssetListItem,
  };
}
