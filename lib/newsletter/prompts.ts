/**
 * ChatGPT prompts for monthly newsletter PDF prep.
 * First chat: full instructions + ask to attach the resource zip / look-and-feel.
 * Later chats (same project or after the model already saw the brief): short delta prompt.
 */

export type NewsletterPdfLayout = "article" | "tiles";

export function coverageMonthLabel(from: string, to: string) {
  if (!from && !to) return "all assets in the library";
  if (from && to) return `${from} → ${to}`;
  if (from) return `from ${from}`;
  return `through ${to}`;
}

function layoutInstructions(layout: NewsletterPdfLayout): string {
  if (layout === "tiles") {
    return `Default layout preference: **Tiles (compact grid)** when there is enough material
* Preferred when a section has **several** items with enough Summary text to fill soft tiles.
* Then: soft **2-column** tile grid on A4, ~8–10 mm gutters, calm table-like density (spiritual news, not a spreadsheet).
* Each default tile: photo → **Header title** → muted **Subtitle** → **Summary** as short topic body.
* **Do not force tiles** when content is thin: fall back to article flow for that section.
* **Exception:** any item with a **LAYOUT INSTRUCTION** must follow that instruction exactly (full page, split grids, circular photo, etc.) even if it breaks Tiles.`;
  }
  return `Default layout preference: **Article (reading flow)**
* Single-column soft reading layout: photo, then header title + subtitle, then Summary as the topic paragraph.
* Generous spacing between items; about 1–3 photos per section unless the pack is photo-heavy.
* **Exception:** any item with a **LAYOUT INSTRUCTION** must follow that instruction exactly.`;
}

function instructionPriorityBlock(): string {
  return `CRITICAL — per-item LAYOUT INSTRUCTION (do this first)
* Open \`02-LAYOUT-DIRECTIVES.md\` and every \`sections/*.md\` blockquote marked **MUST FOLLOW — LAYOUT INSTRUCTION**.
* These are **mandatory layout directives** from the editor. They **override** Article/Tiles defaults, default rectangular framing, and generic spacing for that item only.
* Examples you must execute literally when written:
  - “occupy entire 1st page, 2 grids, left photo / right summary” → dedicate page 1 to that item; two columns; photo left, Summary text right.
  - “nice curved circle” / “circular photo” → crop/mask the photo in a soft circle (warm gold or paper-edge ring OK); do not keep a plain rectangle for that item.
* If an Instruction conflicts with the look-and-feel defaults, **Instruction wins** for that item. Keep QLU colours/fonts.
* In the deliverable, for every directed item write: \`[Layout applied: <quote or paraphrase of Instruction>]\` so editors can verify.
* Do **not** invent teachings from Instruction — only presentation.`;
}

function fieldMappingBlock(): string {
  return `Field mapping (every asset in \`sections/*.md\`)
* **Label** → printed **header title** (first line) and **subtitle** (further lines, or after \`—\` / \`|\` on one line).
* **Summary** → **topic content** (who / what / why). Expand into natural Telugu; do not invent facts beyond Summary + Label.
* **Instruction** → **mandatory look** for that item (page placement, grids, circular crop, emphasis). See CRITICAL block above.
* **Image** → place per Instruction when present; otherwise per Article/Tiles defaults.`;
}

/** First PDF in a new ChatGPT chat — attach the export zip (or its folders). */
export function firstNewsletterPdfPrompt(input: {
  issueMonth: string; // YYYY-MM of the PDF issue (usually next month after coverage)
  takenOnFrom?: string;
  takenOnTo?: string;
  layout?: NewsletterPdfLayout;
}): string {
  const layout = input.layout ?? "article";
  const window = coverageMonthLabel(input.takenOnFrom ?? "", input.takenOnTo ?? "");
  return `Create the Quantum Life University monthly newsletter soft PDF for issue **${input.issueMonth}** (Telugu-first).

I am attaching the resource pack from Admin → Newsletter (zip or folder). Use it as follows:

Attachments to use (read in this order)
1. \`02-LAYOUT-DIRECTIVES.md\` — **mandatory** per-item layout rules (if any). Apply before designing pages.
2. \`00-LOOK-AND-FEEL.md\` — colours, fonts, section order (defaults only; Instructions may override layout).
3. \`01-BRIEF.md\` + \`MANIFEST.md\` — coverage window and counts.
4. \`sections/*.md\` + \`images/*\` — facts + images. Obey any **MUST FOLLOW — LAYOUT INSTRUCTION** blockquotes.

${instructionPriorityBlock()}

${fieldMappingBlock()}

${layoutInstructions(layout)}

Requirements
* A4 portrait soft PDF (or a complete Telugu draft ready to paste into a PDF tool), paper \`#fffdf8\`, ink \`#352d26\`, gold \`#a17b43\`, calm masthead (unless an Instruction redesigns page 1 for a hero item).
* Body language: **Telugu**. Keep established English / Sanskrit names (Dr. Newton, Goloka, Sahasrara, Vanya Maitreya, Jnanodayam).
* Fixed section order (do not reorder). If a section has no assets, one quiet Telugu line: ఈ నెలలో ప్రత్యేక నివేదిక లేదు
  1. Summary of the themes covered in that month
  2. Highlight classes of the month
  3. Few Experiences from Participants
  4. Dr. Newton's visits and classes in other places
  5. Vanya Maitreya Highlights
  6. Goloka, Sahasrara and QLU Updates
  7. Upcoming Programs/Announcements
  8. Short Closing (blessing + contact) if space allows
* Do **not** invent teachings, visits, or experiences beyond the attached Summaries/Labels.
* File name: \`QLU-Newsletter-${input.issueMonth}-te.pdf\`
* Coverage of assets in this pack: ${window}.

Deliverable
1. Complete Telugu newsletter content with the headings above.
2. For every item that had an Instruction: \`[Layout applied: …]\` plus image notes like \`[Image: images/….jpg — title: …]\`.
3. If you can export PDF with Telugu-capable fonts, produce the PDF; otherwise give the full draft + placement notes for the designer.

After this first issue, I will only send a shorter prompt plus a new month’s \`sections/\` + \`images/\` (look-and-feel stays the same).`;
}

/** Later months / same ChatGPT project — assume look-and-feel already known. */
export function followUpNewsletterPdfPrompt(input: {
  issueMonth: string;
  takenOnFrom?: string;
  takenOnTo?: string;
  layout?: NewsletterPdfLayout;
}): string {
  const layout = input.layout ?? "article";
  const window = coverageMonthLabel(input.takenOnFrom ?? "", input.takenOnTo ?? "");
  const layoutOneLiner =
    layout === "tiles"
      ? "Default layout: **Tiles** when enough content; if thin, article flow."
      : "Default layout: **Article** reading flow.";
  return `New QLU monthly newsletter issue **${input.issueMonth}** (Telugu-first soft PDF).

Same colours/fonts and seven body headings as before. Do not re-read a long style brief unless I attach an updated \`00-LOOK-AND-FEEL.md\`.

**First:** open \`02-LAYOUT-DIRECTIVES.md\` and any **MUST FOLLOW — LAYOUT INSTRUCTION** blockquotes in \`sections/*.md\`. Execute those layouts exactly (full page, left/right grids, circular photo, etc.). They override the default layout for that item. Confirm each with \`[Layout applied: …]\`.

${layoutOneLiner}
Facts: Label = title/subtitle, Summary = topic body. Instruction = look only (no new facts).

I am attaching this month’s resource delta:
* \`01-BRIEF.md\` + \`02-LAYOUT-DIRECTIVES.md\` + \`MANIFEST.md\` (optional but preferred)
* \`sections/*.md\` + \`images/*\`

Coverage window: ${window}.
Output: \`QLU-Newsletter-${input.issueMonth}-te.pdf\` (or full Telugu draft + placement notes).
Empty sections → one line: ఈ నెలలో ప్రత్యేక నివేదిక లేదు`;
}
