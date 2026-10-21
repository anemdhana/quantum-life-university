import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/** Save a day cover under public/covers and return a public URL (with cache-buster). */
export async function saveCoverImage(file: File | null, slug: string, dayNumber: number, language?: string) {
  if (!file || file.size === 0) return null;
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 5_000_000) throw new Error("Use an image smaller than 5 MB.");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const langPart = language ? `-${language}` : "";
  const filename = `${slug}-day-${dayNumber}${langPart}.${ext}`;
  const directory = path.join(process.cwd(), "public", "covers");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), Buffer.from(await file.arrayBuffer()));
  return `/covers/${filename}?t=${Date.now()}`;
}
