/**
 * ChatGPT prompts for monthly newsletter PDF prep.
 * First chat: full instructions + ask to attach the resource zip / look-and-feel.
 * Later chats (same project or after the model already saw the brief): short delta prompt.
 */

export function coverageMonthLabel(from: string, to: string) {
  if (!from && !to) return "all assets in the library";
  if (from && to) return `${from} → ${to}`;
  if (from) return `from ${from}`;
  return `through ${to}`;
}

function instructionPriorityBlock(): string {
  return `CRITICAL — layout directives (read \`02-LAYOUT-DIRECTIVES.md\` first)
Layout comes from the editor’s instructions — there is no separate Article/Tiles toggle.
Priority (highest first):
1. **Section Instruction** — how the whole section looks (2/3 grids, content placement, background colour/image, density). Apply to that section unless a photo Instruction narrows it.
2. **Photo Instruction** — mandatory look for that item (full page, left/right split, circular crop, etc.).
3. **Summary Instruction** — how that item’s **Summary text** should be presented (bullets vs paragraph, length, pull-quote, tone). Does **not** add facts.
4. **Use as background image = yes** — soft washed background (~20–35% strength) so Telugu text stays primary.
5. If a section has **no** Instruction: calm single-column reading flow (soft paper, gold accents) — do not invent a busy grid.

Confirm each applied rule with \`[Layout applied: …]\` (section / photo / summary). Do **not** invent teachings from Instructions — presentation only.`;
}

function fieldMappingBlock(): string {
  return `Field mapping
* **Section Instruction** (top of each \`sections/*.md\` and in \`02-LAYOUT-DIRECTIVES.md\` §A) → whole-section layout.
* **Label** → header title + subtitle.
* **Summary** → topic content (facts).
* **Photo Instruction** → mandatory look for the photo/layout.
* **Summary Instruction** → mandatory presentation of Summary text (not new facts).
* **Use as background image** → soft transparent/washed background; content priority.
* **Image** → path under \`images/\`.`;
}

/** First PDF in a new ChatGPT chat — attach the export zip (or its folders). */
export function firstNewsletterPdfPrompt(input: {
  issueMonth: string; // YYYY-MM of the PDF issue (usually next month after coverage)
  takenOnFrom?: string;
  takenOnTo?: string;
}): string {
  const window = coverageMonthLabel(input.takenOnFrom ?? "", input.takenOnTo ?? "");
  return `Create the Quantum Life University monthly newsletter soft PDF for issue **${input.issueMonth}** (Telugu-first).

I am attaching the resource pack from Admin → Newsletter (zip or folder). Use it as follows:

Attachments to use (read in this order)
1. \`02-LAYOUT-DIRECTIVES.md\` — **mandatory** section + photo layout rules (including background flags).
2. \`00-LOOK-AND-FEEL.md\` — colours, fonts, section order (defaults only).
3. \`01-BRIEF.md\` + \`MANIFEST.md\` — coverage window and counts.
4. \`sections/*.md\` + \`images/*\` — facts + images. Obey every **MUST FOLLOW** blockquote.

${instructionPriorityBlock()}

${fieldMappingBlock()}

Requirements
* A4 portrait soft PDF (or a complete Telugu draft ready to paste into a PDF tool), paper \`#fffdf8\`, ink \`#352d26\`, gold \`#a17b43\`, calm masthead (unless a directive redesigns a hero page).
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
2. For every section/photo directive: \`[Layout applied: …]\` plus image notes like \`[Image: images/….jpg — title: …]\`.
3. If you can export PDF with Telugu-capable fonts, produce the PDF; otherwise give the full draft + placement notes for the designer.

After this first issue, I will only send a shorter prompt plus a new month’s \`sections/\` + \`images/\` (look-and-feel stays the same).`;
}

/** Later months / same ChatGPT project — assume look-and-feel already known. */
export function followUpNewsletterPdfPrompt(input: {
  issueMonth: string;
  takenOnFrom?: string;
  takenOnTo?: string;
}): string {
  const window = coverageMonthLabel(input.takenOnFrom ?? "", input.takenOnTo ?? "");
  return `New QLU monthly newsletter issue **${input.issueMonth}** (Telugu-first soft PDF).

Same colours/fonts and seven body headings as before. Do not re-read a long style brief unless I attach an updated \`00-LOOK-AND-FEEL.md\`.

**First:** open \`02-LAYOUT-DIRECTIVES.md\` and every **MUST FOLLOW** blockquote in \`sections/*.md\`.
Priority: section Instruction → photo Instruction → summary Instruction → Use as background (soft washed) → calm single-column if none.
Confirm with \`[Layout applied: …]\`.

Facts: Label = title/subtitle, Summary = topic body. Instructions = presentation only (no new facts).

I am attaching this month’s resource delta:
* \`01-BRIEF.md\` + \`02-LAYOUT-DIRECTIVES.md\` + \`MANIFEST.md\` (optional but preferred)
* \`sections/*.md\` + \`images/*\`

Coverage window: ${window}.
Output: \`QLU-Newsletter-${input.issueMonth}-te.pdf\` (or full Telugu draft + placement notes).
Empty sections → one line: ఈ నెలలో ప్రత్యేక నివేదిక లేదు`;
}
