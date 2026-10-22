# QLU Newsletter Composer — Phased roadmap

> Reference for evolving from **ChatGPT-assisted PDF** toward an **in-app A4 composer** with less AI for layout.  
> Companions: [README](./QLU-MONTHLY-NEWSLETTER-README.md) · [Requirements](./QLU-MONTHLY-NEWSLETTER-REQUIREMENTS.md) · [Technical](./QLU-MONTHLY-NEWSLETTER-TECHNICAL.md) · [Look & feel](./QLU-NEWSLETTER-LOOK-AND-FEEL.md)

**Admin route (Phase 1):** `/admin/newsletter/composer`  
**Asset library (unchanged):** `/admin/newsletter`  
**Nav label:** Composer  
**UI look:** Match Self Knowledge Reading soft-paper home (gold kicker, warm gradient panels, serif titles, paper A4 canvas) — same tokens as [Look & feel](./QLU-NEWSLETTER-LOOK-AND-FEEL.md) / `app/page.tsx`.  


---

## Goal

Editors choose **page layouts**, place **photos** and **text**, and produce the monthly Telugu PDF mostly **without ChatGPT**. AI stays optional for Telugu polish on a single block.

Layout language already proven via section / photo / summary **Instructions** becomes **named templates + slots**.

---

## Phase overview

| Phase | Status | Outcome |
|-------|--------|---------|
| **0 — Asset library + AI pack** | **Done** | Global photos, instructions, zip + ChatGPT prompts |
| **1 — Visual composer (templates)** | **Done (v1)** | A4 pages, fixed layouts, place assets, edit text, browser print PDF, local draft |
| **2 — Durable issues + server PDF** | Planned | DB-backed issue/pages; Chromium PDF with Telugu fonts |
| **3 — Light AI assist** | Planned | Optional Telugu rewrite / shorten on one slot |
| **4 — Polish & distribution** | Planned | Richer layouts, archive, email/WhatsApp handoff |

---

## Phase 0 — Asset library + AI pack (done)

**What exists**

- Admin → Newsletter: section nav, upload, label / summary / photo & summary instructions, use-as-background, section instruction  
- Prepare PDF: date range, zip (`00-LOOK-AND-FEEL`, brief, layout directives, sections, images), first / follow-up prompts  

**Keep forever:** photo library remains the media source for Composer and for optional AI export.

---

## Phase 1 — Visual composer (done — enhance here first)

**What exists**

| Piece | Location / behaviour |
|-------|----------------------|
| Route | `/admin/newsletter/composer` |
| Model | `lib/newsletter/composer.ts` — issue, pages, slots, layouts |
| UI | `components/admin/NewsletterComposer.tsx` |
| Draft persistence | `localStorage` key `qlu-newsletter-composer:{YYYY-MM}` |
| PDF | Browser **Print / Save PDF** (all pages) |

**Layouts (templates)**

| Id | Name | Slots |
|----|------|--------|
| `masthead` | Masthead | heading |
| `hero-split` | Hero split | media + copy (photo left / text right) |
| `article` | Article | media above + copy below |
| `tiles-2` | Two tiles | two cards |
| `tiles-3` | Three tiles | three cards |
| `bg-soft` | Soft background | washed photo + foreground copy |

**Editor workflow**

1. Pick **issue month**  
2. Add pages (layout chips) / reorder / remove  
3. Select page → change layout, optional section heading, page label  
4. Click a slot on the A4 canvas → edit title / subtitle / body; pick photo from library  
5. **Print / Save PDF** when ready  

**Explicitly out of Phase 1**

- Saving drafts to Supabase  
- Server-side PDF (Playwright)  
- Free-form drag-and-drop / pixel positioning  
- Multi-user conflict resolution  
- Replacing ChatGPT export (still available under Newsletter)  

### Phase 1 follow-ups (small enhancements)

Use this checklist before starting Phase 2:

- [ ] More templates (e.g. quote band, closing/blessing page, 2×2 grid)  
- [ ] “Fill page from section” — pull N assets for a newsletter section into tiles  
- [ ] Respect `useAsBackground` more strongly on hero/article (auto-switch or wash media)  
- [ ] Better print CSS (exact 210×297 mm margins, hide selection chrome)  
- [ ] Export composed issue as HTML zip (for offline polish)  
- [ ] Undo / redo for page edits  
- [ ] Clear draft / reset issue month  

---

## Phase 2 — Durable issues + server PDF

**Product**

- One **newsletter issue** per `YYYY-MM` stored in DB (not only localStorage)  
- Pages + slots + text overrides + asset ids survive browser/device changes  
- **Generate PDF** button → A4 PDF with embedded Telugu font (e.g. Noto Sans Telugu)  

**Suggested schema (draft)**

```text
newsletter_issues
  id, issue_month (unique), status (draft|ready|sent), created_by, timestamps

newsletter_issue_pages
  id, issue_id, page_order, layout_id, section_title, heading, timestamps

newsletter_issue_slots
  id, page_id, slot_order, kind, asset_id null,
  title, subtitle, body, use_as_background
```

**Engineering**

- Load/save composer via server actions (admin RLS)  
- Migrate: “import localStorage draft → issue” once  
- PDF: render a print-only React/HTML route → **Playwright** / Puppeteer `page.pdf()`  
- File name: `QLU-Newsletter-YYYY-MM-te.pdf`  
- Optional: store PDF in Supabase Storage or `public/newsletter/issues/`  

**Acceptance**

- [ ] Two admins / two browsers see the same issue  
- [ ] PDF downloads without opening the system print dialog  
- [ ] Telugu glyphs render correctly in the PDF  
- [ ] Images resolve in headless Chromium  

---

## Phase 3 — Light AI assist (ChatGPT very little)

**Product**

Per-slot actions only (never whole-issue redesign):

- Shorten summary  
- Telugu polish (preserve facts)  
- Suggest title/subtitle from summary  

**Engineering**

- Call existing ChatGPT/API with **one block** of text + look-and-feel voice rules  
- Do **not** send layout instructions for the AI to invent grids — layout stays in Composer  

**Acceptance**

- [ ] AI cannot change layout template or photo placement  
- [ ] Editor must Accept/Reject suggested text  

---

## Phase 4 — Polish & distribution

**Ideas (pick as needed)**

- Public or gated archive of past PDFs  
- Email / WhatsApp send checklist from Admin  
- Template presets per section (“Experiences always tiles-2”)  
- Soft constraints: max images per issue, empty-section placeholder Telugu line  
- Version history / restore page  
- Mobile-friendly inspector (Phase 1 is desktop-first)  

---

## Architecture (current → target)

```
Phase 0–1 (now)
  newsletter_assets ──► Composer (localStorage issue) ──► Print PDF
                   └──► Export zip ──► ChatGPT (optional)

Phase 2+
  newsletter_assets ──► newsletter_issues / pages / slots (DB)
                              │
                              ├──► Composer UI (same templates)
                              └──► Server HTML → Playwright PDF
```

**Principle:** Templates + slots are the source of truth for layout. Markdown zip + ChatGPT remain a **fallback**, not the primary path.

---

## Code map (Phase 1)

| Path | Role |
|------|------|
| `app/admin/newsletter/composer/page.tsx` | RSC entry; loads assets |
| `components/admin/NewsletterComposer.tsx` | Pages / canvas / inspector |
| `lib/newsletter/composer.ts` | Layouts, issue model, localStorage |
| `lib/newsletter/sections.ts` | Section titles + body heading list |
| `components/admin/AdminNav.tsx` | Composer nav tab |
| `app/globals.css` | `.composer-*` + `@media print` |

---

## How to use this doc later

1. When enhancing Composer, start with **Phase 1 follow-ups** unless you need multi-device save or headless PDF → then **Phase 2**.  
2. Do not expand free-text “Instruction → ChatGPT layout” as the main path; map new looks to **new `COMPOSER_LAYOUTS` entries**.  
3. Keep [Look & feel](./QLU-NEWSLETTER-LOOK-AND-FEEL.md) as the visual contract for both Composer CSS and any PDF renderer.  
4. Update the **Phase overview** status table when a phase ships.

---

*Last aligned with Phase 1 UI in `quantum-life-university` (Admin → Composer).*
