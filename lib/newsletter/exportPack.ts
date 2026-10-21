import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import type { NewsletterAssetListItem } from "@/lib/actions/newsletter";
import { NEWSLETTER_SECTION_TITLES, newsletterSectionSlug, type NewsletterSectionTitle } from "@/lib/newsletter/sections";

/** Body headings for the PDF (Global Assets is inventory-only, still exported as a section file). */
export const NEWSLETTER_BODY_SECTION_TITLES = NEWSLETTER_SECTION_TITLES.filter((title) => title !== "Global Assets");

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export { defaultCoverageRange } from "@/lib/newsletter/coverage";

function safeImageName(imageUrl: string, assetId: string) {
  const base = imageUrl.split("/").pop() || `${assetId}.jpg`;
  return base.replace(/[^\w.\-]+/g, "_");
}

/** Long label → header title (line 1) + subtitle (rest, or after — / | on one line). */
export function splitNewsletterLabel(label: string): { headerTitle: string; subtitle: string } {
  const lines = label
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return { headerTitle: "", subtitle: "" };
  if (lines.length === 1) {
    const parts = lines[0].split(/\s+[—–|]\s+/);
    if (parts.length >= 2) {
      return { headerTitle: parts[0].trim(), subtitle: parts.slice(1).join(" — ").trim() };
    }
    return { headerTitle: lines[0], subtitle: "" };
  }
  return { headerTitle: lines[0], subtitle: lines.slice(1).join(" ") };
}

async function readPublicAsset(imageUrl: string): Promise<Buffer | null> {
  if (!imageUrl.startsWith("/") || imageUrl.includes("..")) return null;
  const filePath = path.join(process.cwd(), "public", imageUrl.replace(/^\//, ""));
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

function sectionMarkdown(title: NewsletterSectionTitle, assets: NewsletterAssetListItem[]) {
  const lines = [`# ${title}`, ""];
  if (assets.length === 0) {
    lines.push("_No items in this export window._", "");
    return lines.join("\n");
  }
  for (const [index, asset] of assets.entries()) {
    const imageName = safeImageName(asset.imageUrl, asset.id);
    const { headerTitle, subtitle } = splitNewsletterLabel(asset.label);
    const instruction = asset.instruction.trim();
    lines.push(`## Item: ${asset.takenOn} · ${index + 1}`);
    lines.push("");
    if (instruction) {
      lines.push("> **MUST FOLLOW — LAYOUT INSTRUCTION (overrides Article/Tiles defaults for this item only)**");
      lines.push(">");
      for (const line of instruction.split(/\r?\n/)) {
        lines.push(`> ${line}`);
      }
      lines.push("");
    } else {
      lines.push("_No layout instruction — use the issue layout preference (Article/Tiles)._");
      lines.push("");
    }
    lines.push(`- **Date taken:** ${asset.takenOn}`);
    lines.push(`- **Header title:** ${headerTitle || "_(from Label)_"}`);
    lines.push(`- **Subtitle:** ${subtitle || "_(optional — further Label lines)_"}`);
    lines.push(`- **Topic content (Summary):** ${asset.summary}`);
    lines.push(`- **Label (raw):** ${asset.label.replace(/\n/g, " / ")}`);
    lines.push(`- **Image:** ../images/${imageName}`);
    lines.push("");
  }
  return lines.join("\n");
}

function layoutDirectivesMarkdown(assets: NewsletterAssetListItem[]) {
  const withInstructions = assets.filter((asset) => asset.instruction.trim());
  const lines = [
    "# Layout directives (from Admin → Instruction)",
    "",
    "These are **mandatory presentation rules**. They override Article/Tiles defaults and default image framing for the named item only. Do not invent facts from them.",
    "",
  ];
  if (withInstructions.length === 0) {
    lines.push("_No per-item instructions in this export._", "");
    return lines.join("\n");
  }
  for (const [index, asset] of withInstructions.entries()) {
    const imageName = safeImageName(asset.imageUrl, asset.id);
    const { headerTitle } = splitNewsletterLabel(asset.label);
    lines.push(`## Directive ${index + 1}: ${asset.title}`);
    lines.push("");
    lines.push(`- **Item:** ${headerTitle || asset.label.split(/\r?\n/)[0] || asset.id}`);
    lines.push(`- **Date taken:** ${asset.takenOn}`);
    lines.push(`- **Image:** images/${imageName}`);
    lines.push(`- **MUST DO:**`);
    lines.push("");
    lines.push("```");
    lines.push(asset.instruction.trim());
    lines.push("```");
    lines.push("");
  }
  return lines.join("\n");
}

export async function buildNewsletterExportZip(input: {
  assets: NewsletterAssetListItem[];
  takenOnFrom?: string;
  takenOnTo?: string;
  issueMonth: string;
  allAssets: boolean;
}): Promise<{ filename: string; bytes: Uint8Array }> {
  const zip = new JSZip();
  const lookAndFeelPath = path.join(process.cwd(), "docs", "QLU-NEWSLETTER-LOOK-AND-FEEL.md");
  const lookAndFeel = await readFile(lookAndFeelPath, "utf8");
  zip.file("00-LOOK-AND-FEEL.md", lookAndFeel);

  const windowLabel = input.allAssets
    ? "all global assets"
    : `${input.takenOnFrom ?? "…"} → ${input.takenOnTo ?? "…"}`;

  const brief = `# QLU Newsletter brief — issue ${input.issueMonth}

- **Language:** Telugu (v1)
- **Issue target:** soft PDF ready around the 1st of ${input.issueMonth} (IST)
- **Asset coverage (date taken):** ${windowLabel}
- **Design:** Follow \`00-LOOK-AND-FEEL.md\` exactly (colours, fonts, heading order, layout modes, budgets).
- **Facts only:** Use \`sections/*.md\` and \`images/\`. Do not invent teachings.
- **Field mapping:** Label → header title + subtitle; Summary → topic body; **Instruction → mandatory layout for that item** (see \`02-LAYOUT-DIRECTIVES.md\`).
- **Tiles:** prefer when a section has enough items/text; if content is thin, use article flow — **unless** an Instruction says otherwise.
- **Priority:** per-item Instruction > issue layout preference > look-and-feel defaults.

## Suggested AI instruction

Read \`02-LAYOUT-DIRECTIVES.md\` first and obey every directive. Then use \`00-LOOK-AND-FEEL.md\` for colours/fonts/section order. Facts only from Label/Summary. For each item: Header title + Subtitle from Label; topic prose from Summary; layout from Instruction when present. Global Assets photos may be used under any heading where they fit.
`;
  zip.file("01-BRIEF.md", brief);
  zip.file("02-LAYOUT-DIRECTIVES.md", layoutDirectivesMarkdown(input.assets));

  const byTitle = new Map<NewsletterSectionTitle, NewsletterAssetListItem[]>();
  for (const title of NEWSLETTER_SECTION_TITLES) byTitle.set(title, []);
  for (const asset of input.assets) {
    byTitle.get(asset.title)?.push(asset);
  }

  const imageFolder = zip.folder("images");
  const sectionsFolder = zip.folder("sections");
  const usedNames = new Set<string>();
  let imageCount = 0;
  let missingImages = 0;

  for (const [index, title] of NEWSLETTER_SECTION_TITLES.entries()) {
    const list = byTitle.get(title) ?? [];
    const slug = newsletterSectionSlug(title);
    sectionsFolder?.file(`${pad2(index + 1)}-${slug}.md`, sectionMarkdown(title, list));

    for (const asset of list) {
      let name = safeImageName(asset.imageUrl, asset.id);
      if (usedNames.has(name)) name = `${asset.id.slice(0, 8)}-${name}`;
      usedNames.add(name);
      const bytes = await readPublicAsset(asset.imageUrl);
      if (!bytes) {
        missingImages += 1;
        continue;
      }
      imageFolder?.file(name, bytes);
      imageCount += 1;
    }
  }

  const instructionCount = input.assets.filter((asset) => asset.instruction.trim()).length;
  const manifest = `# MANIFEST

- Exported at: ${new Date().toISOString()}
- Issue month: ${input.issueMonth}
- Date filter: ${windowLabel}
- Asset rows: ${input.assets.length}
- Items with layout Instruction: ${instructionCount}
- Images packed: ${imageCount}
- Missing image files: ${missingImages}
- Sections: ${NEWSLETTER_SECTION_TITLES.length} (includes Global Assets inventory)
- Layout directives file: \`02-LAYOUT-DIRECTIVES.md\` (mandatory when Instruction count > 0)
`;
  zip.file("MANIFEST.md", manifest);

  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const filename = `QLU-newsletter-resources-${input.issueMonth}.zip`;
  return { filename, bytes };
}
