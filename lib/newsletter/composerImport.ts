import JSZip from "jszip";
import {
  createComposerIssue,
  createComposerPage,
  emptySlot,
  type ComposerIssue,
  type ComposerLayoutId,
  type ComposerMarkdownSource,
  type ComposerPage,
  type ComposerSlot,
} from "@/lib/newsletter/composer";
import { isNewsletterSectionTitle, type NewsletterSectionTitle } from "@/lib/newsletter/sections";

export type ParsedMdItem = {
  title: string;
  subtitle: string;
  body: string;
  useAsBackground: boolean;
  imageRef: string | null;
};

export type ParsedMdSection = {
  sectionTitle: string;
  filename: string;
  content: string;
  items: ParsedMdItem[];
};

function fieldValue(block: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = block.match(new RegExp(`^-\\s*\\*\\*${escaped}:\\*\\*\\s*(.+)$`, "im"));
  return match?.[1]?.trim() ?? "";
}

function parseItemBlock(block: string): ParsedMdItem {
  const headerTitle = fieldValue(block, "Header title");
  const subtitle = fieldValue(block, "Subtitle");
  const summary =
    fieldValue(block, "Topic content (Summary)") || fieldValue(block, "Summary");
  const labelRaw = fieldValue(block, "Label (raw)") || fieldValue(block, "Label");
  const image =
    fieldValue(block, "Image") ||
    block.match(/!\[[^\]]*]\(([^)]+)\)/)?.[1]?.trim() ||
    null;
  const bg = fieldValue(block, "Use as background image").toLowerCase() === "yes";

  let title = headerTitle;
  let sub = subtitle.replace(/^_\(.*\)_$/, "").trim();
  if ((!title || title.startsWith("_")) && labelRaw) {
    const lines = labelRaw.split(/\s+\/\s+/).map((part) => part.trim()).filter(Boolean);
    title = lines[0] || labelRaw;
    sub = lines.slice(1).join(" — ");
  }
  if (title.startsWith("_")) title = "";

  return {
    title,
    subtitle: sub,
    body: summary.replace(/^_\(.*\)_$/, "").trim(),
    useAsBackground: bg,
    imageRef: image,
  };
}

/** Parse QLU export section markdown (or simple # / ## markdown). */
export function parseNewsletterSectionMarkdown(content: string, filename = "section.md"): ParsedMdSection {
  const trimmed = content.replace(/^\uFEFF/, "").trim();
  const titleMatch = trimmed.match(/^#\s+(.+)$/m);
  const sectionTitle = titleMatch?.[1]?.trim() || filename.replace(/\.md$/i, "");

  const itemParts = trimmed.split(/^##\s+/m).slice(1);
  const items: ParsedMdItem[] = [];

  if (itemParts.length > 0) {
    for (const part of itemParts) {
      const block = part.trim();
      if (!block || /no items in this export/i.test(block)) continue;
      items.push(parseItemBlock(block));
    }
  } else {
    // Fallback: treat whole file as one article body under H1.
    const body = trimmed.replace(/^#\s+.+$/m, "").trim();
    if (body) {
      items.push({
        title: sectionTitle,
        subtitle: "",
        body,
        useAsBackground: false,
        imageRef: null,
      });
    }
  }

  return { sectionTitle, filename, content: trimmed, items };
}

function basename(path: string) {
  return path.split(/[/\\]/).pop() || path;
}

function fillMediaCopySlots(item: ParsedMdItem, imageUrl: string | null, layoutId: ComposerLayoutId): ComposerSlot[] {
  if (layoutId === "tiles-2" || layoutId === "tiles-3") {
    const card = emptySlot("card");
    card.title = item.title;
    card.subtitle = item.subtitle;
    card.body = item.body;
    card.useAsBackground = item.useAsBackground;
    card.importedImageUrl = imageUrl;
    return [card];
  }

  const media = emptySlot("media");
  const copy = emptySlot("copy");
  media.importedImageUrl = imageUrl;
  media.useAsBackground = item.useAsBackground || layoutId === "bg-soft";
  copy.title = item.title;
  copy.subtitle = item.subtitle;
  copy.body = item.body;
  return [media, copy];
}

function layoutForItem(item: ParsedMdItem, itemCountInSection: number): ComposerLayoutId {
  if (item.useAsBackground) return "bg-soft";
  if (itemCountInSection >= 3) return "article";
  return "hero-split";
}

function resolveImage(
  imageRef: string | null,
  imageMap: Map<string, string>,
): string | null {
  if (!imageRef) return null;
  const name = basename(imageRef);
  return imageMap.get(name) || imageMap.get(imageRef) || null;
}

export function pagesFromParsedSections(
  sections: ParsedMdSection[],
  imageMap: Map<string, string>,
  issueMonth: string,
): { pages: ComposerPage[]; sources: ComposerMarkdownSource[] } {
  const pages: ComposerPage[] = [
    createComposerPage({
      layoutId: "masthead",
      heading: `నెలవారీ వార్తాపత్రిక · ${issueMonth}`,
    }),
  ];
  const sources: ComposerMarkdownSource[] = [];

  for (const section of sections) {
    if (section.items.length === 0) continue;
    sources.push({ filename: section.filename, content: section.content });

    const sectionTitle = isNewsletterSectionTitle(section.sectionTitle)
      ? (section.sectionTitle as NewsletterSectionTitle)
      : "";

    // Group into tile pages when many short items; otherwise one page per item.
    const useTiles = section.items.length >= 4 && section.items.every((item) => item.body.length < 320);
    if (useTiles) {
      for (let i = 0; i < section.items.length; i += 2) {
        const chunk = section.items.slice(i, i + 2);
        const layoutId: ComposerLayoutId = chunk.length === 1 ? "article" : "tiles-2";
        const page = createComposerPage({
          layoutId,
          sectionTitle,
          heading: section.sectionTitle,
        });
        if (layoutId === "tiles-2") {
          page.slots = chunk.map((item) => {
            const url = resolveImage(item.imageRef, imageMap);
            return fillMediaCopySlots(item, url, "tiles-2")[0];
          });
          while (page.slots.length < 2) page.slots.push(emptySlot("card"));
        } else {
          const item = chunk[0];
          const url = resolveImage(item.imageRef, imageMap);
          page.slots = fillMediaCopySlots(item, url, "article");
        }
        pages.push(page);
      }
      continue;
    }

    for (const item of section.items) {
      const layoutId = layoutForItem(item, section.items.length);
      const page = createComposerPage({
        layoutId,
        sectionTitle,
        heading: section.sectionTitle,
      });
      const url = resolveImage(item.imageRef, imageMap);
      page.slots = fillMediaCopySlots(item, url, layoutId);
      pages.push(page);
    }
  }

  return { pages, sources };
}

async function fileToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image."));
    reader.readAsDataURL(blob);
  });
}

export async function importNewsletterMarkdownFiles(
  files: File[],
  issueMonth: string,
): Promise<ComposerIssue> {
  const mdFiles = files.filter((file) => /\.md$/i.test(file.name));
  const imageFiles = files.filter((file) => /\.(jpe?g|png|webp|gif)$/i.test(file.name));
  const imageMap = new Map<string, string>();

  for (const file of imageFiles) {
    imageMap.set(file.name, await fileToDataUrl(file));
  }

  const sections: ParsedMdSection[] = [];
  for (const file of mdFiles) {
    const text = await file.text();
    sections.push(parseNewsletterSectionMarkdown(text, file.name));
  }

  if (sections.length === 0) {
    throw new Error("Choose one or more .md files (export sections/*.md).");
  }

  const { pages, sources } = pagesFromParsedSections(sections, imageMap, issueMonth);
  const issue = createComposerIssue(issueMonth);
  return { ...issue, pages, sources, updatedAt: new Date().toISOString() };
}

export async function importNewsletterResourceZip(file: File, issueMonth: string): Promise<ComposerIssue> {
  const zip = await JSZip.loadAsync(file);
  const imageMap = new Map<string, string>();
  const sections: ParsedMdSection[] = [];

  const entries = Object.values(zip.files);
  for (const entry of entries) {
    if (entry.dir) continue;
    const name = entry.name.replace(/\\/g, "/");
    const base = basename(name);
    if (/^images\//i.test(name) || /\/images\//i.test(name)) {
      if (!/\.(jpe?g|png|webp|gif)$/i.test(base)) continue;
      const blob = await entry.async("blob");
      imageMap.set(base, await fileToDataUrl(blob));
      continue;
    }
    if (!/\.md$/i.test(base)) continue;
    if (/look-and-feel|brief|manifest|layout-directives/i.test(base)) continue;
    // Prefer sections/ folder; also accept loose *.md
    if (!/sections\//i.test(name) && /\//.test(name) && !name.endsWith(base)) continue;
    const text = await entry.async("string");
    if (!text.trim().startsWith("#")) continue;
    sections.push(parseNewsletterSectionMarkdown(text, base));
  }

  // If no sections/ files matched, take any # markdown except meta files.
  if (sections.length === 0) {
    for (const entry of entries) {
      if (entry.dir) continue;
      const base = basename(entry.name);
      if (!/\.md$/i.test(base)) continue;
      if (/look-and-feel|brief|manifest|layout-directives/i.test(base)) continue;
      const text = await entry.async("string");
      if (!text.trim().startsWith("#")) continue;
      sections.push(parseNewsletterSectionMarkdown(text, base));
    }
  }

  if (sections.length === 0) {
    throw new Error("No section markdown found in that zip. Export from Admin → Newsletter first.");
  }

  sections.sort((a, b) => a.filename.localeCompare(b.filename));
  const { pages, sources } = pagesFromParsedSections(sections, imageMap, issueMonth);
  const issue = createComposerIssue(issueMonth);
  return { ...issue, pages, sources, updatedAt: new Date().toISOString() };
}

/** Rebuild pages from edited source markdown (keeps images already embedded in slots via re-parse + image map from previous pages). */
export function rebuildIssueFromSources(
  issue: ComposerIssue,
  sources: ComposerMarkdownSource[],
): ComposerIssue {
  const imageMap = new Map<string, string>();
  for (const page of issue.pages) {
    for (const slot of page.slots) {
      if (slot.importedImageUrl) {
        // Keep unnamed images keyed by order — match by scanning content Image lines later.
        imageMap.set(`slot-${slot.id}`, slot.importedImageUrl);
      }
    }
  }

  // Rebuild image map from previous pages by title→url when possible
  const titleToUrl = new Map<string, string>();
  for (const page of issue.pages) {
    for (const slot of page.slots) {
      if (slot.importedImageUrl && slot.title) titleToUrl.set(slot.title, slot.importedImageUrl);
    }
  }

  const sections = sources.map((source) => parseNewsletterSectionMarkdown(source.content, source.filename));
  // Attach images from prior parse by matching image basename from content when still in map —
  // also seed imageMap with any data URLs we can find from previous slots in filename order.
  const priorUrls = [...titleToUrl.values()];
  let urlIndex = 0;
  for (const section of sections) {
    for (const item of section.items) {
      if (item.imageRef) {
        const base = basename(item.imageRef);
        if (!imageMap.has(base) && urlIndex < priorUrls.length) {
          imageMap.set(base, priorUrls[urlIndex]);
        }
      } else if (item.title && titleToUrl.has(item.title)) {
        // no image ref; pagesFromParsed will leave empty unless we fake a ref
      }
      if (item.title && titleToUrl.has(item.title) && item.imageRef) {
        imageMap.set(basename(item.imageRef), titleToUrl.get(item.title)!);
      } else if (item.title && titleToUrl.has(item.title)) {
        imageMap.set(`title:${item.title}`, titleToUrl.get(item.title)!);
      }
      urlIndex += 1;
    }
  }

  // For items without image file name, resolve via title: key
  const wrappedMap = new Map(imageMap);
  const originalResolve = (ref: string | null, title: string) => {
    if (ref) {
      const hit = resolveImage(ref, wrappedMap);
      if (hit) return hit;
    }
    return wrappedMap.get(`title:${title}`) || null;
  };

  const pages: ComposerPage[] = [
    createComposerPage({
      layoutId: "masthead",
      heading: `నెలవారీ వార్తాపత్రిక · ${issue.issueMonth}`,
    }),
  ];

  for (const section of sections) {
    if (section.items.length === 0) continue;
    const sectionTitle = isNewsletterSectionTitle(section.sectionTitle)
      ? (section.sectionTitle as NewsletterSectionTitle)
      : "";
    for (const item of section.items) {
      const layoutId = layoutForItem(item, section.items.length);
      const page = createComposerPage({
        layoutId,
        sectionTitle,
        heading: section.sectionTitle,
      });
      const url = originalResolve(item.imageRef, item.title);
      page.slots = fillMediaCopySlots(item, url, layoutId);
      pages.push(page);
    }
  }

  return {
    ...issue,
    pages,
    sources,
    updatedAt: new Date().toISOString(),
  };
}
