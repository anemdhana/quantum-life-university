# QLU Monthly Newsletter

Telugu-first soft PDF, published on the **1st of each month**. Editors bank photos in a **global admin library**, then either:

1. **Composer (preferred going forward)** — Admin → **Composer**: pick A4 layouts, place photos/text, Print / Save PDF (ChatGPT optional), or  
2. **AI pack (fallback)** — download Markdown + images and hand that pack to ChatGPT / Grok with the look-and-feel brief.

Phased plan (0→4): **[Composer roadmap](./QLU-NEWSLETTER-COMPOSER.md)**.

---

## Documents

| Doc | Audience | What it covers |
|-----|----------|----------------|
| **[Composer roadmap](./QLU-NEWSLETTER-COMPOSER.md)** | Product + engineering | Phases 0–4: library → Composer → DB/PDF → light AI → distribution |
| **[Requirements](./QLU-MONTHLY-NEWSLETTER-REQUIREMENTS.md)** | Product / editorial | Purpose, cadence, fixed sections, asset fields, export workflow, consent, acceptance |
| **[Technical](./QLU-MONTHLY-NEWSLETTER-TECHNICAL.md)** | Engineering | `newsletter_assets` schema, storage, admin UI, zip layout, roadmap |
| **[API](./QLU-MONTHLY-NEWSLETTER-API.md)** | Engineering | Server actions, types, export contract, proposed REST |
| **[Look & feel](./QLU-NEWSLETTER-LOOK-AND-FEEL.md)** | Humans + AI | Colours, fonts, logos, heading order, content budgets, PDF rules |

---

## How it works

```
All month          Admin → Newsletter
                   upload photo + section title + label + summary (+ instructions)
                        ↓
Near month-end     Path A (Composer)          Path B (AI pack, optional)
                   Admin → Composer            Prepare PDF → zip + prompt
                   layouts + place assets     → ChatGPT / Grok
                   → Print / Save PDF
                        ↓
1st of next month  QLU-Newsletter-YYYY-MM-te.pdf → email / WhatsApp
```

### Admin

- **Assets:** `/admin/newsletter` — global library; section left nav; searchable photo rows.  
- **Composer:** `/admin/newsletter/composer` — A4 templates, slots, local draft per issue month, browser PDF.  
- **Title** is a closed list: **Global Assets** (default) plus the seven body sections.  
- **Prepare PDF** (on assets page): zip + **First PDF** / **Next month** ChatGPT prompts (fallback).

### Export pack (for AI)

| Path | Role |
|------|------|
| `00-LOOK-AND-FEEL.md` | Copy of the static design brief — do not invent style |
| `01-BRIEF.md` | Month window, issue id, editor notes |
| `MANIFEST.md` | Inventory of included assets |
| `sections/*.md` | Facts only — one file per section (incl. Global Assets) |
| `images/*` | Referenced photos |

Prompts: `lib/newsletter/prompts.ts` — first chat attaches the full pack; follow-ups skip re-attaching look-and-feel.

---

## Fixed section order

Every issue keeps this map (empty sections get one quiet Telugu placeholder line):

1. Cover / masthead  
2. Summary of the themes covered in that month  
3. Highlight classes of the month  
4. Few Experiences from Participants  
5. Dr. Newton's visits and classes in other places  
6. Vanya Maitreya Highlights  
7. Goloka, Sahasrara and QLU Updates  
8. Upcoming Programs/Announcements  
9. Closing (recommended)

Asset **titles** map to body items 2–8, or **Global Assets** for photos that may appear under any section.

---

## Visual snapshot

| Spec | Value |
|------|--------|
| Page | A4 portrait, ~8–16 pages, prefer ≤ 8 MB |
| Palette | Soft paper `#fffdf8`, gold `#a17b43`, ink `#352d26` |
| Language | Telugu body; established English / Sanskrit proper names as used in QLU materials |
| File name | `QLU-Newsletter-YYYY-MM-te.pdf` |

Full rules: **[Look & feel](./QLU-NEWSLETTER-LOOK-AND-FEEL.md)**.

---

## Status

| Done | Later (see [Composer roadmap](./QLU-NEWSLETTER-COMPOSER.md)) |
|------|--------|
| Global asset library + instructions + background flag | Phase 2: DB issues + Playwright PDF |
| Export zip + ChatGPT prompts (fallback) | Phase 3: per-slot Telugu AI assist |
| **Composer Phase 1** — templates, place assets, print PDF | Phase 4: archive / send automation |
| Docs: look-and-feel + composer phases | |

App entry: `quantum-life-university` (Self Knowledge Reading). See repo root [README](../README.md) for local run.
