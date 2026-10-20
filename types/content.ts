export type Language = "te" | "en";

export type ReaderSection = {
  id: string;
  sectionOrder: number;
  title: string;
  content: string[];
  minutes: number | null;
  startSec: number | null;
};

/** Nav/list row without paragraph payloads. */
export type SectionOutline = {
  id: string;
  sectionOrder: number;
  title: string;
  minutes: number | null;
  startSec: number | null;
};

export type ReaderDay = {
  dayNumber: number;
  language: Language;
  series: string;
  seriesName: string;
  title: string;
  subtitle: string;
  coverUrl: string | null;
  youtubeId: string | null;
  sections: ReaderSection[];
};

export type LibraryDay = {
  dayNumber: number;
  title: string;
  coverUrl: string | null;
  languages: Language[];
};

export type LibrarySeries = {
  slug: string;
  name: string;
  days: LibraryDay[];
};

export const SECTION_PLACEHOLDER = "Paragraphs not generated yet.";
