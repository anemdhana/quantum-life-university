# QLU Monthly Newsletter

Telugu-first soft PDF, published on the **1st of each month**. Editors bank photos with **header title/subtitle (Label)** and **topic content (Summary)** in a **global admin library**, then near month-end **download Markdown + images** and hand that pack to any AI (ChatGPT, Grok, …) with the look-and-feel brief — choosing **Tiles** (compact grid) or **Article** layout — to produce the PDF.

No server-side PDF render in v1 — the export pack is the source of truth for drafting.

---

## Documents

| Doc | Audience | What it covers |
|-----|----------|----------------|
| **[Requirements](./QLU-MONTHLY-NEWSLETTER-REQUIREMENTS.md)** | Product / editorial | Purpose, cadence, fixed sections, asset fields, export workflow, consent, acceptance |
| **[Technical](./QLU-MONTHLY-NEWSLETTER-TECHNICAL.md)** | Engineering | `newsletter_assets` schema, storage, admin UI, zip layout, roadmap |
| **[API](./QLU-MONTHLY-NEWSLETTER-API.md)** | Engineering | Server actions, types, export contract, proposed REST |
| **[Look & feel](./QLU-NEWSLETTER-LOOK-AND-FEEL.md)** | Humans + AI | Colours, fonts, logos, heading order, content budgets, PDF rules |

---

## How it works

```
All month          Admin → Newsletter
                   upload photo + section title + label + summary + date taken
                        ↓
Near month-end     Admin → Newsletter → Prepare PDF
                   Download zip + Copy prompt → ChatGPT
                        ↓
                   First chat: full prompt + whole zip
                   Later months: short prompt + sections/images only
                        ↓
1st of next month  QLU-Newsletter-YYYY-MM-te.pdf → email / WhatsApp
```

### Admin (v1)

- Route: `/admin/newsletter`
- Assets are **global** (not tied to one issue). Section left nav + searchable photo rows.
- **Title** is a closed list: **Global Assets** (default, usable in any section) plus the seven body sections.
- **Prepare PDF**: download resource zip; copy **First PDF** or **Next month** ChatGPT prompt.

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

## Status (v1)

| Done / specified | Later |
|------------------|--------|
| Global asset create / update / delete (admin gallery) | Email / WhatsApp automation |
| Export zip + first / follow-up ChatGPT prompts | Server-side PDF render |
| Section-title allow-list + Global Assets | Public archive |
| Docs for export + look-and-feel | |

App entry: `quantum-life-university` (Self Knowledge Reading). See repo root [README](../README.md) for local run.
