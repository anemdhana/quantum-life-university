import { NEWSLETTER_BODY_SECTION_TITLES, type NewsletterSectionTitle } from "@/lib/newsletter/sections";

export const COMPOSER_STORAGE_PREFIX = "qlu-newsletter-composer:";

export type ComposerLayoutId =
  | "masthead"
  | "hero-split"
  | "article"
  | "tiles-2"
  | "tiles-3"
  | "bg-soft";

export type ComposerSlotKind = "heading" | "media" | "copy" | "card";

export type ComposerLayoutDef = {
  id: ComposerLayoutId;
  name: string;
  description: string;
  slotKinds: ComposerSlotKind[];
};

export const COMPOSER_LAYOUTS: readonly ComposerLayoutDef[] = [
  {
    id: "masthead",
    name: "Masthead",
    description: "Brand band + issue title",
    slotKinds: ["heading"],
  },
  {
    id: "hero-split",
    name: "Hero split",
    description: "Full page — photo left, text right",
    slotKinds: ["media", "copy"],
  },
  {
    id: "article",
    name: "Article",
    description: "Photo above, reading text below",
    slotKinds: ["media", "copy"],
  },
  {
    id: "tiles-2",
    name: "Two tiles",
    description: "Soft 2-column grid",
    slotKinds: ["card", "card"],
  },
  {
    id: "tiles-3",
    name: "Three tiles",
    description: "Soft 3-column grid",
    slotKinds: ["card", "card", "card"],
  },
  {
    id: "bg-soft",
    name: "Soft background",
    description: "Washed photo behind text",
    slotKinds: ["media", "copy"],
  },
] as const;

export type ComposerSlot = {
  id: string;
  kind: ComposerSlotKind;
  assetId: string | null;
  title: string;
  subtitle: string;
  body: string;
  useAsBackground: boolean;
};

export type ComposerPage = {
  id: string;
  layoutId: ComposerLayoutId;
  /** Optional body section this page belongs to (for headings). */
  sectionTitle: NewsletterSectionTitle | "";
  heading: string;
  slots: ComposerSlot[];
};

export type ComposerIssue = {
  issueMonth: string;
  pages: ComposerPage[];
  updatedAt: string;
};

export const COMPOSER_SECTION_OPTIONS: readonly (NewsletterSectionTitle | "")[] = [
  "",
  ...NEWSLETTER_BODY_SECTION_TITLES,
];

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getComposerLayout(id: ComposerLayoutId): ComposerLayoutDef {
  return COMPOSER_LAYOUTS.find((layout) => layout.id === id) ?? COMPOSER_LAYOUTS[1];
}

export function emptySlot(kind: ComposerSlotKind): ComposerSlot {
  return {
    id: uid("slot"),
    kind,
    assetId: null,
    title: "",
    subtitle: "",
    body: "",
    useAsBackground: kind === "media" ? false : false,
  };
}

export function slotsForLayout(layoutId: ComposerLayoutId): ComposerSlot[] {
  return getComposerLayout(layoutId).slotKinds.map((kind) => emptySlot(kind));
}

export function createComposerPage(input?: {
  layoutId?: ComposerLayoutId;
  sectionTitle?: NewsletterSectionTitle | "";
  heading?: string;
}): ComposerPage {
  const layoutId = input?.layoutId ?? "hero-split";
  return {
    id: uid("page"),
    layoutId,
    sectionTitle: input?.sectionTitle ?? "",
    heading: input?.heading ?? "",
    slots: slotsForLayout(layoutId),
  };
}

export function createComposerIssue(issueMonth: string): ComposerIssue {
  const masthead = createComposerPage({
    layoutId: "masthead",
    heading: `నెలవారీ వార్తాపత్రిక · ${issueMonth}`,
  });
  return {
    issueMonth,
    pages: [masthead],
    updatedAt: new Date().toISOString(),
  };
}

export function applyLayoutToPage(page: ComposerPage, layoutId: ComposerLayoutId): ComposerPage {
  if (page.layoutId === layoutId) return page;
  const nextSlots = slotsForLayout(layoutId);
  // Preserve filled content where kinds align, in order.
  const previous = [...page.slots];
  for (const slot of nextSlots) {
    const matchIndex = previous.findIndex((item) => item.kind === slot.kind);
    if (matchIndex >= 0) {
      const matched = previous.splice(matchIndex, 1)[0];
      slot.assetId = matched.assetId;
      slot.title = matched.title;
      slot.subtitle = matched.subtitle;
      slot.body = matched.body;
      slot.useAsBackground = matched.useAsBackground;
    }
  }
  return { ...page, layoutId, slots: nextSlots };
}

export function storageKeyForIssue(issueMonth: string) {
  return `${COMPOSER_STORAGE_PREFIX}${issueMonth}`;
}

export function loadComposerIssue(issueMonth: string): ComposerIssue | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKeyForIssue(issueMonth));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ComposerIssue;
    if (!parsed?.issueMonth || !Array.isArray(parsed.pages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveComposerIssue(issue: ComposerIssue) {
  if (typeof window === "undefined") return;
  const payload: ComposerIssue = { ...issue, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(storageKeyForIssue(issue.issueMonth), JSON.stringify(payload));
}
