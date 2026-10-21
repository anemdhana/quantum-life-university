/** Closed set — requirements §7.4 / technical §2.2 */
export const NEWSLETTER_SECTION_TITLES = [
  "Global Assets",
  "Summary of the themes covered in that month",
  "Highlight classes of the month",
  "Few Experiences from Participants",
  "Dr. Newton's visits and classes in other places",
  "Vanya Maitreya Highlights",
  "Goloka, Sahasrara and QLU Updates",
  "Upcoming Programs/Announcements",
] as const;

export type NewsletterSectionTitle = (typeof NEWSLETTER_SECTION_TITLES)[number];

/** Default title for new assets — reusable across any newsletter body section. */
export const DEFAULT_NEWSLETTER_SECTION_TITLE: NewsletterSectionTitle = "Global Assets";

/** Short editor guidance shown under each section title in the wizard. */
export const NEWSLETTER_SECTION_HINTS: Record<NewsletterSectionTitle, string> = {
  "Global Assets":
    "Shared photos usable in any body section (masthead, campus, travel, etc.). Not a printed heading — editors place these where they fit.",
  "Summary of the themes covered in that month":
    "Month themes only — short bullets or mini-paragraphs, not a day-by-day log.",
  "Highlight classes of the month":
    "Standout sessions: date, topic, and why they mattered (3–6 per issue).",
  "Few Experiences from Participants":
    "Short sharings with consent. Preserve voice; light polish only.",
  "Dr. Newton's visits and classes in other places":
    "Place, dates, program nature, brief outcome. Mark completed vs announced.",
  "Vanya Maitreya Highlights":
    "Official Vanya Maitreya happenings or messages for the month only.",
  "Goloka, Sahasrara and QLU Updates":
    "Campus / project progress and institutional facts — dated, not speculative.",
  "Upcoming Programs/Announcements":
    "Next 4–8 weeks: dates, place/online, who it’s for, how to join.",
};

export function isNewsletterSectionTitle(value: unknown): value is NewsletterSectionTitle {
  return typeof value === "string" && (NEWSLETTER_SECTION_TITLES as readonly string[]).includes(value);
}

export function newsletterSectionSlug(title: NewsletterSectionTitle): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}
