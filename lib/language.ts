import type { Language } from "@/types/content";

export const LANGUAGES: Language[] = ["te", "en", "kn", "hi"];

const LABELS: Record<Language, string> = {
  te: "Telugu",
  en: "English",
  kn: "Kannada",
  hi: "Hindi",
};

const SHORT: Record<Language, string> = {
  te: "TE",
  en: "EN",
  kn: "KN",
  hi: "HI",
};

const SWITCH: Record<Language, string> = {
  te: "తె",
  en: "EN",
  kn: "ಕ",
  hi: "हि",
};

export function isLanguage(value: unknown): value is Language {
  return value === "te" || value === "en" || value === "kn" || value === "hi";
}

export function parseLanguage(value: unknown, fallback: Language = "te"): Language {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return isLanguage(normalized) ? normalized : fallback;
}

export function languageLabel(language: Language): string {
  return LABELS[language];
}

export function languageCode(language: Language): string {
  return SHORT[language];
}

export function languageSwitchLabel(language: Language): string {
  return SWITCH[language];
}

export function preferredLanguage(languages: Language[], fallback: Language = "te"): Language {
  if (languages.includes("te")) return "te";
  if (languages.includes("en")) return "en";
  if (languages.includes("kn")) return "kn";
  if (languages.includes("hi")) return "hi";
  return languages[0] ?? fallback;
}

export function sortLanguages(languages: Language[]): Language[] {
  return [...new Set(languages)].sort((a, b) => LANGUAGES.indexOf(a) - LANGUAGES.indexOf(b));
}
