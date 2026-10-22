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

Instructions are for **you** (the designer). Never print \`[Layout applied: …]\`, \`[Image: …]\`, file paths, or MUST FOLLOW quotes inside the PDF.`;
}

function fieldMappingBlock(): string {
  return `Field mapping
* **Section Instruction** (top of each \`sections/*.md\` and in \`02-LAYOUT-DIRECTIVES.md\` §A) → whole-section layout.
* **Label** → visible header title + subtitle only (never print raw “DrNewton” slug-like labels if a real title exists; if Label is a useless slug and Summary is empty/placeholder, **omit that asset**).
* **Summary** → topic content (facts). Skip assets whose Summary is empty, \`Add summary…\`, \`TODO\`, or similarly unfinished.
* **Photo Instruction** → mandatory look for the photo/layout.
* **Summary Instruction** → mandatory presentation of Summary text (not new facts).
* **Use as background image** → soft transparent/washed background; content priority.
* **Image** → embed the actual pixels from \`images/\` — never print the path as body text.
* **Global Assets** → logo / small founder strip only (see PDF craft rules). Not a multi-page biography dump.`;
}

function pdfCraftBlock(issueMonth: string): string {
  return `PDF craft rules (make it look like a finished soft magazine page — not a debug export)
* **Final PDF only.** No bracketed meta, no layout logs, no markdown fences, no “I applied…” prose.
* **Embed Telugu-capable fonts** (e.g. Noto Sans Telugu + a calm Latin companion). No tofu / missing glyphs / broken conjuncts.
* **Paper** \`#fffdf8\`, ink \`#352d26\`, headings \`#6b4a25\`, gold \`#a17b43\`, lines \`#e8dfd0\`. Soft panel \`#f6f1e8\` sparingly.
* **No full-page content cage.** Do not wrap the whole page in one large empty rectangle. Use hairline gold rules under section titles; optional soft cards only for true tile grids when Instruction asks.
* **Tight vertical rhythm.** Avoid huge empty lower halves. If a section is short, continue the next section on the same page. Prefer well-filled pages over sparse shells.
* **Cover / page 1:** calm masthead only — logo or wordmark, Telugu title నెలవారీ వార్తాపత్రిక, month/year. Optional one soft hero image **or** a short founders line — not a long bio filling a framed box. Start body sections by page 2.
* **Global Assets** (founders photo, logo, long bios): use logo in masthead; at most a **compact** founders strip (photo + 2–4 short lines). Do not spend pages 1–2 on the full Global Assets summary.
* **Photos:** show the image; caption with Label title/subtitle. Never print \`[Image: images/…]\`. Max ~1–3 images per section unless Instruction asks denser.
* **Empty / thin sections:** if no usable assets, either omit the heading entirely **or** one quiet line ఈ నెలలో ప్రత్యేక నివేదిక లేదు — never stack three empty sections with layout notes.
* **No placeholder leakage:** never print \`Add summary…\`, unfinished English stubs, or “no details were provided…” essays. If thin, use the quiet Telugu line or omit.
* **Do not invent** teachings, visits, or experiences. Do not duplicate the same photo across unrelated sections unless the pack truly has distinct files for each.
* **Footer:** \`Quantum Life University · ${issueMonth}\` · page number. No other chrome.`;
}

const SECTION_ORDER = `Fixed section order (do not reorder). Skip a section heading if it has zero usable assets and you choose omit (preferred over filler):
  1. Summary of the themes covered in that month
  2. Highlight classes of the month
  3. Few Experiences from Participants
  4. Dr. Newton's visits and classes in other places
  5. Vanya Maitreya Highlights
  6. Goloka, Sahasrara and QLU Updates
  7. Upcoming Programs/Announcements
  8. Short Closing (blessing + qluglobal.org) — keep to a few lines`;

/** First PDF in a new ChatGPT chat — attach the export zip (or its folders). */
export function firstNewsletterPdfPrompt(input: {
  issueMonth: string; // YYYY-MM of the PDF issue (usually next month after coverage)
  takenOnFrom?: string;
  takenOnTo?: string;
}): string {
  const window = coverageMonthLabel(input.takenOnFrom ?? "", input.takenOnTo ?? "");
  return `Create the Quantum Life University monthly newsletter **print-ready soft PDF** for issue **${input.issueMonth}** (Telugu-first).

I am attaching the resource pack from Admin → Newsletter (zip or folder). Use it as follows:

Attachments to use (read in this order)
1. \`02-LAYOUT-DIRECTIVES.md\` — **mandatory** section + photo layout rules (including background flags).
2. \`00-LOOK-AND-FEEL.md\` — colours, fonts, section order, and PDF anti-patterns.
3. \`01-BRIEF.md\` + \`MANIFEST.md\` — coverage window and counts.
4. \`sections/*.md\` + \`images/*\` — facts + images. Obey every **MUST FOLLOW** blockquote in your layout choices — do not print those quotes.

${instructionPriorityBlock()}

${fieldMappingBlock()}

${pdfCraftBlock(input.issueMonth)}

Requirements
* A4 portrait PDF with embedded Telugu fonts. Colours and voice per look-and-feel.
* Body language: **Telugu**. Keep established English / Sanskrit names (Dr. Newton, Goloka, Sahasrara, Vanya Maitreya, Jnanodayam).
* ${SECTION_ORDER}
* Do **not** invent teachings, visits, or experiences beyond the attached Summaries/Labels.
* File name: \`QLU-Newsletter-${input.issueMonth}-te.pdf\`
* Coverage of assets in this pack: ${window}.

Deliverable
1. **Primary:** the finished PDF only (beautifully typeset). Open it yourself and fix sparse pages, meta leaks, or missing images before sending.
2. **Optional chat note (not in the PDF):** a short bullet list of which directives you followed.
3. If you truly cannot export PDF with Telugu fonts, say so and give a complete Telugu draft + placement notes — but prefer PDF.

After this first issue, I will only send a shorter prompt plus a new month’s \`sections/\` + \`images/\` (look-and-feel stays the same).`;
}

/** Later months / same ChatGPT project — assume look-and-feel already known. */
export function followUpNewsletterPdfPrompt(input: {
  issueMonth: string;
  takenOnFrom?: string;
  takenOnTo?: string;
}): string {
  const window = coverageMonthLabel(input.takenOnFrom ?? "", input.takenOnTo ?? "");
  return `New QLU monthly newsletter issue **${input.issueMonth}** — **print-ready Telugu-first soft PDF**.

Keep colours/fonts and section order. Re-read \`00-LOOK-AND-FEEL.md\` PDF craft / anti-patterns if needed.

**First:** open \`02-LAYOUT-DIRECTIVES.md\` and every **MUST FOLLOW** blockquote in \`sections/*.md\` (apply; do not print).
Priority: section Instruction → photo Instruction → summary Instruction → Use as background (soft washed) → calm single-column if none.

Hard rules for this PDF
* No \`[Layout applied: …]\`, no \`[Image: …]\`, no file paths, no “Add summary…” text in the PDF.
* No full-page empty frames; tight pages; skip thin/placeholder assets.
* Global Assets = logo / compact founders strip only — not a long bio cover.
* Embed Telugu fonts. Show real images from \`images/\`.
* Empty sections: omit heading or one quiet line ఈ నెలలో ప్రత్యేక నివేదిక లేదు — do not stack empty sections.

Facts: Label = title/subtitle, Summary = topic body. Instructions = presentation only (no new facts).

I am attaching this month’s resource delta:
* \`01-BRIEF.md\` + \`02-LAYOUT-DIRECTIVES.md\` + \`MANIFEST.md\` (optional but preferred)
* \`sections/*.md\` + \`images/*\`

Coverage window: ${window}.
Output: \`QLU-Newsletter-${input.issueMonth}-te.pdf\` (primary). Optional short chat checklist — never inside the PDF.`;
}
