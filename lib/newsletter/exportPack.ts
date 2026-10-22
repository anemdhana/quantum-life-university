import { readFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import type { NewsletterAssetListItem, NewsletterSectionSettingsMap } from "@/lib/actions/newsletter";
import {
  NEWSLETTER_BODY_SECTION_TITLES,
  NEWSLETTER_SECTION_TITLES,
  newsletterSectionSlug,
  type NewsletterSectionTitle,
} from "@/lib/newsletter/sections";

export { NEWSLETTER_BODY_SECTION_TITLES };

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

const BACKGROUND_DIRECTIVE =
  "Use this image as a soft **background** behind the item (or its page/section band): reduce opacity / wash it (~20–35% visual strength) so Telugu title, subtitle, and Summary stay clearly readable and take visual priority. Do not place it as a solid opaque foreground photo tile unless a photo Instruction explicitly says otherwise.";

function appendBlockquote(lines: string[], title: string, body: string) {
  lines.push(`> **${title}**`);
  lines.push(">");
  for (const line of body.split(/\r?\n/)) {
    lines.push(`> ${line}`);
  }
  lines.push("");
}

function sectionMarkdown(
  title: NewsletterSectionTitle,
  assets: NewsletterAssetListItem[],
  sectionInstruction: string,
) {
  const lines = [`# ${title}`, ""];
  const sectionDir = sectionInstruction.trim();
  if (sectionDir) {
    appendBlockquote(
      lines,
      "MUST FOLLOW — SECTION LAYOUT INSTRUCTION (applies to this whole section)",
      sectionDir,
    );
  } else {
      lines.push("_No section layout instruction — use calm single-column reading flow, then per-item rules._");
    lines.push("");
  }

  if (assets.length === 0) {
    lines.push("_No items in this export window._", "");
    return lines.join("\n");
  }
  for (const [index, asset] of assets.entries()) {
    const imageName = safeImageName(asset.imageUrl, asset.id);
    const { headerTitle, subtitle } = splitNewsletterLabel(asset.label);
    const instruction = asset.instruction.trim();
    const summaryInstruction = asset.summaryInstruction.trim();
    lines.push(`## Item: ${asset.takenOn} · ${index + 1}`);
    lines.push("");
    if (instruction) {
      appendBlockquote(
        lines,
        "MUST FOLLOW — PHOTO LAYOUT INSTRUCTION (overrides section defaults for this item)",
        instruction,
      );
    }
    if (summaryInstruction) {
      appendBlockquote(
        lines,
        "MUST FOLLOW — SUMMARY TEXT INSTRUCTION (how to present Summary — not new facts)",
        summaryInstruction,
      );
    }
    if (asset.useAsBackground) {
      appendBlockquote(lines, "MUST FOLLOW — USE AS BACKGROUND IMAGE", BACKGROUND_DIRECTIVE);
    }
    if (!instruction && !summaryInstruction && !asset.useAsBackground) {
      lines.push("_No photo/summary instructions — follow section instruction or calm single-column default._");
      lines.push("");
    }
    lines.push(`- **Date taken:** ${asset.takenOn}`);
    lines.push(`- **Header title:** ${headerTitle || "_(from Label)_"}`);
    lines.push(`- **Subtitle:** ${subtitle || "_(optional — further Label lines)_"}`);
    lines.push(`- **Topic content (Summary):** ${asset.summary}`);
    lines.push(`- **Use as background image:** ${asset.useAsBackground ? "yes" : "no"}`);
    lines.push(`- **Label (raw):** ${asset.label.replace(/\n/g, " / ")}`);
    lines.push(`- **Image:** ../images/${imageName}`);
    lines.push("");
  }
  return lines.join("\n");
}

function layoutDirectivesMarkdown(
  assets: NewsletterAssetListItem[],
  sectionSettings: NewsletterSectionSettingsMap,
) {
  const lines = [
    "# Layout directives (from Admin)",
    "",
    "Priority (highest first): **section Instruction** → **photo Instruction** → **summary Instruction** → **Use as background** → calm single-column if none → look-and-feel colours/fonts.",
    "",
    "These are **mandatory presentation rules**. Do not invent facts from them. Summary Instruction only controls how Summary text is written/placed (length, bullets, tone) — not new content.",
    "",
    "## A. Section directives",
    "",
  ];

  let sectionCount = 0;
  for (const title of NEWSLETTER_SECTION_TITLES) {
    const text = (sectionSettings[title] ?? "").trim();
    if (!text) continue;
    sectionCount += 1;
    lines.push(`### Section: ${title}`);
    lines.push("");
    lines.push("```");
    lines.push(text);
    lines.push("```");
    lines.push("");
  }
  if (sectionCount === 0) {
    lines.push("_No section instructions in this export._", "");
  }

  lines.push("## B. Photo / summary directives", "");
  const withInstructions = assets.filter(
    (asset) => asset.instruction.trim() || asset.summaryInstruction.trim() || asset.useAsBackground,
  );
  if (withInstructions.length === 0) {
    lines.push("_No per-photo instructions, summary instructions, or background flags in this export._", "");
    return lines.join("\n");
  }

  for (const [index, asset] of withInstructions.entries()) {
    const imageName = safeImageName(asset.imageUrl, asset.id);
    const { headerTitle } = splitNewsletterLabel(asset.label);
    lines.push(`### Photo ${index + 1}: ${asset.title}`);
    lines.push("");
    lines.push(`- **Item:** ${headerTitle || asset.label.split(/\r?\n/)[0] || asset.id}`);
    lines.push(`- **Date taken:** ${asset.takenOn}`);
    lines.push(`- **Image:** images/${imageName}`);
    lines.push(`- **Use as background image:** ${asset.useAsBackground ? "yes" : "no"}`);
    if (asset.useAsBackground) {
      lines.push("");
      lines.push(`**Background rule:** ${BACKGROUND_DIRECTIVE}`);
    }
    if (asset.instruction.trim()) {
      lines.push("");
      lines.push("**MUST DO (photo Instruction):**");
      lines.push("");
      lines.push("```");
      lines.push(asset.instruction.trim());
      lines.push("```");
    }
    if (asset.summaryInstruction.trim()) {
      lines.push("");
      lines.push("**MUST DO (summary Instruction — text presentation only):**");
      lines.push("");
      lines.push("```");
      lines.push(asset.summaryInstruction.trim());
      lines.push("```");
    }
    lines.push("");
  }
  return lines.join("\n");
}

export async function buildNewsletterExportZip(input: {
  assets: NewsletterAssetListItem[];
  sectionSettings?: NewsletterSectionSettingsMap;
  takenOnFrom?: string;
  takenOnTo?: string;
  issueMonth: string;
  allAssets: boolean;
}): Promise<{ filename: string; bytes: Uint8Array }> {
  const zip = new JSZip();
  const sectionSettings = input.sectionSettings ?? {};
  const lookAndFeelPath = path.join(process.cwd(), "docs", "QLU-NEWSLETTER-LOOK-AND-FEEL.md");
  const lookAndFeel = await readFile(lookAndFeelPath, "utf8");
  zip.file("00-LOOK-AND-FEEL.md", lookAndFeel);

  const windowLabel = input.allAssets
    ? "all global assets"
    : `${input.takenOnFrom ?? "…"} → ${input.takenOnTo ?? "…"}`;

  const sectionInstructionCount = NEWSLETTER_SECTION_TITLES.filter((title) =>
    (sectionSettings[title] ?? "").trim(),
  ).length;
  const photoInstructionCount = input.assets.filter((asset) => asset.instruction.trim()).length;
  const summaryInstructionCount = input.assets.filter((asset) => asset.summaryInstruction.trim()).length;
  const backgroundCount = input.assets.filter((asset) => asset.useAsBackground).length;

  const brief = `# QLU Newsletter brief — issue ${input.issueMonth}

- **Language:** Telugu (v1)
- **Issue target:** soft PDF ready around the 1st of ${input.issueMonth} (IST)
- **Asset coverage (date taken):** ${windowLabel}
- **Design:** Follow \`00-LOOK-AND-FEEL.md\` for colours/fonts/section order **and PDF anti-patterns**.
- **Facts only:** Label + Summary. Do not invent teachings. Skip placeholder Summaries (\`Add summary…\`).
- **Layout priority:** section Instruction → photo Instruction → summary Instruction → Use as background → calm single-column if none.
- See \`02-LAYOUT-DIRECTIVES.md\` (section: ${sectionInstructionCount}; photo Instruction: ${photoInstructionCount}; summary Instruction: ${summaryInstructionCount}; background: ${backgroundCount}).

## Suggested AI instruction

Read \`02-LAYOUT-DIRECTIVES.md\` first. Obey section, photo, and summary-text directives **silently** — never print \`[Layout applied: …]\` or \`[Image: …]\` in the PDF. For background-flagged images, keep text primary over a washed soft background. Facts from Label/Summary only. Global Assets = logo / compact founders strip, not a multi-page bio. Prefer a tight print-ready PDF with embedded Telugu fonts.
`;
  zip.file("01-BRIEF.md", brief);
  zip.file("02-LAYOUT-DIRECTIVES.md", layoutDirectivesMarkdown(input.assets, sectionSettings));

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
    sectionsFolder?.file(
      `${pad2(index + 1)}-${slug}.md`,
      sectionMarkdown(title, list, sectionSettings[title] ?? ""),
    );

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

  const manifest = `# MANIFEST

- Exported at: ${new Date().toISOString()}
- Issue month: ${input.issueMonth}
- Date filter: ${windowLabel}
- Asset rows: ${input.assets.length}
- Sections with Instruction: ${sectionInstructionCount}
- Items with photo Instruction: ${photoInstructionCount}
- Items with summary Instruction: ${summaryInstructionCount}
- Items flagged Use as background: ${backgroundCount}
- Images packed: ${imageCount}
- Missing image files: ${missingImages}
- Sections: ${NEWSLETTER_SECTION_TITLES.length} (includes Global Assets inventory)
- Layout directives file: \`02-LAYOUT-DIRECTIVES.md\`
`;
  zip.file("MANIFEST.md", manifest);

  const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const filename = `QLU-newsletter-resources-${input.issueMonth}.zip`;
  return { filename, bytes };
}
