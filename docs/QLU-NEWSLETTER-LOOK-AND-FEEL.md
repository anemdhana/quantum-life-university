# QLU Monthly Newsletter — Look & Feel Instructions

> **Static design brief** for humans and AI (ChatGPT, Grok, etc.).  
> Bundle this file unchanged in every end-of-month resource export.  
> Produce a **Telugu-first soft PDF** (A4) unless the brief says otherwise.

**Companions:** [README](./QLU-MONTHLY-NEWSLETTER-README.md) · [Requirements](./QLU-MONTHLY-NEWSLETTER-REQUIREMENTS.md) · [Technical](./QLU-MONTHLY-NEWSLETTER-TECHNICAL.md) · [API](./QLU-MONTHLY-NEWSLETTER-API.md)

---

## 1. Product identity

| Item | Value |
|------|--------|
| Publisher | Quantum Life University (QLU) |
| Product name | నెలవారీ వార్తాపత్రిక / Monthly Newsletter |
| Voice | Warm, clear, guru-respectful; knowledge-forward; not salesy |
| Language (v1) | **Telugu** body; English proper names as commonly used (Dr. Newton, Goloka, Sahasrara, Vanya Maitreya, Jnanodayam) |

Do **not** invent teachings. Use only the provided `.md` asset files and images. If a section has no assets, insert one quiet Telugu line: *ఈ నెలలో ప్రత్యేక నివేదిక లేదు.*

---

## 2. Page & document

| Spec | Value |
|------|--------|
| Page size | **A4** (210 × 297 mm) |
| Orientation | Portrait |
| Margins | ≥ 16 mm all sides; prefer 18–20 mm for Telugu line length (**≥ 12 mm** in Tiles mode) |
| Length | Target **8–16 pages** (Tiles may land shorter); prefer under **8 MB** PDF |
| Columns | **Article:** single column. **Tiles:** soft **2-column** item grid within each section |
| Page numbers | Footer centre or outer: `పేజీ X / Y` or `X / Y` |
| Footer brand | `Quantum Life University` · issue id e.g. `2026-04` |

### 2.1 Layout modes (choose one per issue — set in Admin → Prepare PDF)

**Article (reading flow)** — default for long experiences. One item after another: photo, header title, subtitle, then Summary as the topic paragraph. Generous vertical rhythm.

**Tiles (compact grid)** — denser “spiritual news” pages **when there is enough material**. Within each section, arrange items as a soft **2-column tile grid** (table-like density, not a spreadsheet):

- Gutters ~8–10 mm; optional light `#f6f1e8` tile wash or thin `#e8dfd0` frame  
- Per tile: photo → **Header title** → muted **Subtitle** → **Summary** as short topic body  
- Section headings stay full-width gold/brown; only *items* tile  
- Aim to keep several stories on the same page while Telugu stays ≥ 9–10 pt  
- Still warm and calm — no harsh gridlines, no purple UI chrome, no emoji stickers  

**If content is thin** (one or two short items in a section, or sparse Summaries): **do not force tiles**. Use Article flow for that section (or the whole issue) so pages do not look empty or artificially padded.

### 2.2 Per-item Instruction (highest layout priority)

Admin **Instruction** text (exported in `02-LAYOUT-DIRECTIVES.md` and as **MUST FOLLOW** blockquotes in `sections/*.md`) is a **mandatory layout directive** for that photo only. It overrides Article/Tiles defaults and the default rectangular image treatment when it asks for something else (e.g. full first page, left photo / right summary, circular crop). Keep QLU colours and Telugu voice; change composition as directed.

---

## 3. Colour palette (soft paper / gold)

Match the Self Knowledge Reading / QLU soft-paper look. Avoid purple gradients, heavy glow, or harsh black.

| Token | Hex | Use |
|-------|-----|-----|
| Paper | `#fffdf8` | Page background |
| Side / soft panel | `#f6f1e8` | Masthead strip, pull-quotes, soft cards |
| Ink | `#352d26` | Body text |
| Heading brown | `#6b4a25` | Section titles, subheads |
| Muted | `#7c6e5d` / `#6f6252` | Captions, meta, dates |
| Gold | `#a17b43` | Accents, rules, brand wordmark, active emphasis |
| Line | `#e8dfd0` | Hairline rules, photo frames |

**Background:** Flat paper colour or a *very* subtle warm grain. No busy patterns behind Telugu paragraphs. Optional thin gold rule under the masthead.

---

## 4. Typography

| Role | Guidance |
|------|----------|
| Brand / masthead | Small caps or tracked Latin: `QUANTUM LIFE UNIVERSITY` · gold · ~10–11 pt · letter-spacing ~0.12em |
| Document title | Telugu display or serif · `#6b4a25` · ~18–22 pt · bold/semibold |
| Section headings (H1 in body) | Exact English section titles from the asset pack *or* agreed Telugu equivalents · `#6b4a25` · ~14–16 pt · semibold · space above |
| Subheads | Slightly smaller; muted brown |
| Body | Telugu-capable sans (e.g. Noto Sans Telugu) · `#352d26` · **≥ 11 pt** · line-height ~1.45–1.6 |
| Captions / labels | 9–10 pt · muted · italic optional for English photo credit only |
| Avoid | Decorative scripts for long Telugu; all-caps Telugu; tiny footnotes for main content |

**Latin companion fonts** (when needed): Source Sans 3 (UI/meta), Libre Baskerville (English display accents) — same family spirit as the reader app.

---

## 5. Logos & masthead

| Element | Instruction |
|---------|-------------|
| Wordmark | Prefer text `QUANTUM LIFE UNIVERSITY` in gold tracked caps if no official SVG is in the pack |
| Logo file | If `logos/` or `brand/` exists in the export, use the provided file; do not invent a new mark |
| Banner | Optional soft hero band (`#f6f1e8`) with title + month/year only — no promo stickers |
| First page | Brand + newsletter title + **month/year** + optional issue number — keep the first screen calm (no stats row) |

---

## 6. Fixed heading order (do not reorder)

Use these **exact English headings** as section titles in the PDF (Telugu body underneath), unless the month brief supplies official Telugu heading translations — then keep the **same order**:

1. Summary of the themes covered in that month  
2. Highlight classes of the month  
3. Few Experiences from Participants  
4. Dr. Newton's visits and classes in other places  
5. Vanya Maitreya Highlights  
6. Goloka, Sahasrara and QLU Updates  
7. Upcoming Programs/Announcements  

Then a short **Closing** (blessing + contact + links) if space allows.

Each section starts on a clear visual break (gold hairline or spacing). Do not merge sections.

---

## 7. Content sizing (per section)

| Section | Content budget |
|---------|----------------|
| Themes | 4–8 short bullets or mini-paragraphs |
| Highlight classes | 3–6 items; date + title + 2–4 sentences each |
| Experiences | 2–5 sharings; ~80–180 Telugu words each |
| Visits | Chronological list; 1–2 photos max unless pack is visit-heavy |
| Vanya Maitreya | Short highlights only; no unverified claims |
| Goloka / Sahasrara / QLU | Factual dated updates; light photo use |
| Upcoming | Next 4–8 weeks; deadlines first |

**Field mapping (every photo asset):**

| Admin field | PDF use |
|-------------|---------|
| **Long label** | **Header title** (first line, or text before `—` / `\|`) + **Subtitle** (further lines / remainder) |
| **Summary** | **Topic content** — the paragraph(s) about this item (who, what, why it matters). Expand into natural Telugu; do not invent beyond this text. |
| **Instruction** | **Mandatory layout** for that item when non-empty (page placement, grids, circular crop, emphasis). Overrides Article/Tiles defaults. Not factual content. |

**Photos:** Prefer quality over quantity. **Article:** typical max **1–3 images per section**, **≤ ~12** whole issue unless the pack is photo-heavy. **Tiles:** more items per page is OK if type stays readable — skip tiles when the pack is thin. Do not dump raw metadata strings.

---

## 8. Image treatment

- **Default:** rectangular photos; soft corner radius optional (≤ 8 px); thin `#e8dfd0` border OK  
- **When Instruction asks for circle / curved crop:** use a soft circular mask; optional thin gold (`#a17b43`) or paper ring — still calm, no neon glow  
- **When Instruction asks for split page / full page:** honour it (e.g. page-1 hero: photo left, Summary right) even if it differs from Tiles  
- No floating badges, stickers, or emoji overlays on photos  
- Hierarchy: photo + **Header title** + muted **Subtitle**; Summary is the topic body (unless Instruction places Summary beside the photo)  
- Relative paths in export: keep `images/…` next to markdown when drafting  

---

## 9. What AI should output

When given this look-and-feel file + a month’s resource folder:

1. A **complete Telugu newsletter draft** structured with the seven headings above, in the **layout mode** named in the chat prompt (Article or Tiles).  
2. Explicit **image placement notes** (`[Image: images/….jpg — title: … — subtitle: …]`).  
3. Optional: a one-page English outline for editors (secondary).  
4. **Not** required: final print-ready PDF binary unless the tool can export PDF with embedded Telugu fonts — then follow this brief.

If content is thin, say so under the section rather than inventing stories.

---

## 10. Checklist before “done”

- [ ] A4, paper `#fffdf8`, ink `#352d26`, gold accents `#a17b43`  
- [ ] Seven sections in correct order  
- [ ] Requested layout preference applied (Tiles relaxed when content is thin)  
- [ ] Telugu body; no invented teachings  
- [ ] Label → title/subtitle; Summary → topic content; Instruction → presentation only  
- [ ] Calm masthead; QLU identity present  
- [ ] Footer with brand + page numbers  
- [ ] File-size / length targets respected  

---

*Canonical path in repo: `docs/QLU-NEWSLETTER-LOOK-AND-FEEL.md`. Every export pack should include a copy named `00-LOOK-AND-FEEL.md` at the pack root.*
