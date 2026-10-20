import type { Language } from "@/types/content";

export function readingPath(series: string, dayNumber: number, language: Language, section?: number, spread?: number) {
  const params = new URLSearchParams({ lang: language });
  if (section) params.set("section", String(section));
  if (spread) params.set("spread", String(spread));
  return `/series/${series}/day/${dayNumber}?${params}`;
}

export function slugify(name: string) {
  const ascii = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return ascii || "series";
}
