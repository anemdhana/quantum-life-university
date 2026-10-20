# QLU Monthly Newsletter — Requirements Specification

| Field | Value |
|--------|--------|
| **Product** | Quantum Life University (QLU) Monthly Newsletter |
| **Format** | Soft copy PDF |
| **Cadence** | 1st of every month |
| **Primary language** | Telugu (v1) |
| **Status** | Draft — admin asset intake in progress |
| **Owner** | QLU Communications / Editorial |
| **Related** | [README](./QLU-MONTHLY-NEWSLETTER-README.md) · [Technical](./QLU-MONTHLY-NEWSLETTER-TECHNICAL.md) · [API](./QLU-MONTHLY-NEWSLETTER-API.md) · [Look & feel](./QLU-NEWSLETTER-LOOK-AND-FEEL.md) |

---

## 1. Purpose

A monthly soft-copy PDF that summarizes QLU’s teaching, community life, and institutional updates for the previous calendar month, delivered to subscribers on the **1st of each month**.

**Goals**

- Keep sadhakas connected to themes taught that month without replaying every class.
- Celebrate participant experience and reinforce sangha.
- Report Dr. Newton’s travel/classes, Vanya Maitreya, and campus (Goloka / Sahasrara / QLU) progress.
- Announce what is coming next so readers can plan.
- Collect photos and captions in an **admin asset library** so editors can assemble issues without hunting files across chats.
- Near **month-end**, **download** accumulated resources as **Markdown + images** so any AI (ChatGPT, Grok, etc.) can draft the newsletter from files plus the static look-and-feel brief.

**Non-goals (v1)**

- Full class transcripts or video embeds inside the PDF.
- Server-side final PDF generation (AI / designer produces the PDF from the export pack).
- Interactive public web app for the newsletter (PDF is the deliverable; archive may come later).
- Automated translation of all sections (Telugu-first editorial voice).

---

## 2. Audience

| Segment | Need |
|---------|------|
| Regular Jnanodayam / QLU participants | Month-in-review, highlights, upcoming dates |
| Occasional / remote participants | Catch up on themes and visits they missed |
| Donors / well-wishers | Institutional updates (Goloka, Sahasrara, QLU) |
| Newcomers (forwarded PDF) | Clear, respectful introduction; no assumed jargon without brief gloss |
| Newsletter editors (admin) | Fast intake of titled photos with long labels, summaries, and dates |

**Tone:** Warm, clear, guru-respectful; knowledge-forward; not promotional noise. Prefer short paragraphs and scannable headings.

---

## 3. Cadence & Coverage Window

| Item | Rule |
|------|------|
| **Issue date** | Soft PDF ready for distribution by **00:00–09:00 IST on the 1st** of the month (or previous business day if 1st is a holiday — decide in §12). |
| **Content window** | Previous calendar month (e.g. April issue covers 1–31 March). |
| **Cutoff for submissions** | Editorial freeze **T−4 days** before issue date (e.g. 28th for a 1st issue). |
| **Late additions** | Only critical announcements (cancellations, emergency schedule) after freeze, with editor approval. |
| **Asset intake** | Editors may upload assets anytime; freeze still applies to what enters the PDF. |

---

## 4. Language

### 4.1 V1 — Telugu first

- Entire newsletter body in **Telugu**.
- Proper names (Dr. Newton, place names, program titles) may keep established English / Sanskrit forms as already used in QLU materials.
- Optional one-line English subtitle under the masthead (series name / month) for forwarding clarity.
- Admin asset fields (**title**, **label**, **summary**) accept Telugu (and Latin script for names). UI chrome may stay English like the rest of admin.

### 4.2 Later (out of scope until approved)

- Parallel English PDF, or bilingual facing pages.
- Same structure and section IDs so translation is systematic.

---

## 5. Delivery

| Requirement | Detail |
|-------------|--------|
| **Artifact** | Single PDF per issue |
| **File naming** | `QLU-Newsletter-YYYY-MM-te.pdf` (e.g. `QLU-Newsletter-2026-04-te.pdf`) |
| **Channels (v1)** | Email to subscriber list; optional WhatsApp / Telegram broadcast of the same file or link |
| **Size target** | Prefer **≤ 8 MB**; aim **8–16 pages** A4 (adjust if photo-heavy) |
| **Accessibility** | Selectable text (not scan-only); embedded Telugu-capable fonts; bookmarks for major sections |
| **Archive** | Store each issue in a designated drive/folder; optional later web archive index |

---

## 6. Content Structure (fixed section order)

Every issue **must** include these sections in this order. If a section has no content for that month, publish a one-line note (“ఈ నెలలో ప్రత్యేక నివేదిక లేదు”) rather than omitting the heading — so readers learn the map of the newsletter.

### 6.1 Cover / Masthead

- QLU identity (name + subtle mark if available)
- Title: నెలవారీ వార్తాపత్రిక / Monthly Newsletter
- Month + year (Telugu calendar label optional)
- Issue number (sequential from launch)

### 6.2 Summary of themes covered that month

- 4–8 short theme bullets or mini-paragraphs drawn from main teaching streams (e.g. Jnanodayam, special series).
- Not a day-by-day log; **themes**, not full outlines.
- Optional: 1 “theme of the month” callout.

### 6.3 Highlight classes of the month

- 3–6 standout sessions (date, topic/title, 2–4 sentence why it mattered).
- Prefer classes with unusual depth, guest context, or high community response.
- Link or pointer to where recordings live (channel name / playlist) — no need to embed video.

### 6.4 Few experiences from participants

- 2–5 short sharings (name or initials + place optional; editor may anonymize on request).
- Consent required before publishing identifiable stories (see §9).
- Length guide: 80–180 words Telugu each; light editorial polish only (preserve voice).

### 6.5 Dr. Newton’s visits and classes in other places

- Chronological or geographic list: place, date(s), nature of program, brief outcome.
- Photo optional (1–2 max in this section unless photo essay is planned).
- Distinguish **completed** visits vs **announced** future travel (future travel may also appear under Upcoming).

### 6.6 Vanya Maitreya highlights

- Key happenings, practices, or messages from Vanya Maitreya for the month.
- Keep aligned with official Vanya Maitreya communications; no unverified claims.

### 6.7 Goloka, Sahasrara and QLU updates

- Campus / project progress (construction, sankalpa milestones, openings, volunteer notes).
- Institutional QLU updates (programs, infrastructure, collaborations).
- Prefer factual, dated updates; avoid speculative timelines.

### 6.8 Upcoming programs / announcements

- Next 4–8 weeks of relevant events (dates, place/online, who it’s for, how to join).
- Clear CTAs: registration link, contact, or “watch Jnanodayam as usual”.
- Deadline-sensitive items first.

### 6.9 Closing (recommended)

- Short blessing / resolve line
- Editorial contact for corrections and experience submissions
- Social / YouTube / website pointers

---

## 7. Admin — Global newsletter asset library (v1 product requirements)

Editors need a place inside **Self Knowledge Reading admin** to bank **photo snapshots** and captions as they happen. Assets are **global**: one shared library reused across **all** monthly newsletters (not owned by a single issue). When assembling a given month’s PDF, editors select relevant globals (typically filtered by **date taken** and **title / section**).

### 7.1 Scope of “global”

| Rule | Meaning |
|------|---------|
| **Not per-issue** | No required `issue_month` on create; an asset can appear in any future (or past) newsletter that needs it. |
| **Reusable** | Same photo + label + summary may be referenced again if still relevant (e.g. evergreen campus shot). |
| **Section-classified** | **Title** places the asset under one of the fixed newsletter body sections (§6.2–6.8). |
| **Time hint only** | **Date taken** helps editors find “what happened in March”; it does not bind the row to the March PDF exclusively. |

### 7.2 User story

> As a QLU editor, I can open **Admin → Newsletter**, choose a **section title** from the fixed list, upload a **photo snapshot**, write a **long label** (caption) and a **summary**, set **date taken** (default today), and save — so the asset sits in the **global** library for any newsletter that needs that section.

### 7.3 Fields

| Field | Required | Notes |
|-------|----------|--------|
| **Title** | Yes | **Must be exactly one** of the allowed section titles below (UI: dropdown / select — not free text). |
| **Image** (photo snapshot) | Yes (on create) | JPEG / PNG / WebP; max 5 MB. Stored under the app’s public newsletter assets path. |
| **Label** | Yes | Long caption / label text for the PDF (Telugu-friendly; multi-line). |
| **Summary** | Yes | Short paragraph explaining context (who, where, why it matters under that section). |
| **Date taken** | Yes | Calendar date; **defaults to today** in the form; editable. |

### 7.4 Allowed values for **Title** (closed list)

These align 1:1 with newsletter body sections (§6.2–6.8). Masthead / closing are **not** title options for assets.

1. Summary of the themes covered in that month  
2. Highlight classes of the month  
3. Few Experiences from Participants  
4. Dr. Newton's visits and classes in other places  
5. Vanya Maitreya Highlights  
6. Goloka, Sahasrara and QLU Updates  
7. Upcoming Programs/Announcements  

### 7.5 Behaviours

- Admin-only (same role as library / prepare).
- After save: show success and list newest assets first (global list).
- List shows thumbnail, **section title**, date taken, truncated label.
- List filters (nice-to-have v1 / required v1.1): by title (section), by date range.
- Edit / delete of existing assets: **v1.1**.
- Assembling a PDF: editor picks from the global pool; no automatic exclusivity lock per issue in v1.

### 7.6 Out of scope for asset UI v1

- Binding an asset permanently to one newsletter issue
- Drag-and-drop PDF composition inside the app
- Cropping / filters
- Public gallery of assets

---

## 8. End-of-month resource export (for AI / designer)

### 8.1 Purpose

Download **everything added so far** in the global library (optionally filtered by **date taken** window for the coverage month) as a portable pack of **`.md` files + images**. Editors upload that pack into ChatGPT, Grok, or similar, together with the look-and-feel instructions, to prepare the monthly newsletter PDF.

### 8.2 When

- **Primary:** near **end of the coverage month** (e.g. 28th–30th), before editorial freeze.
- **Also allowed:** anytime (full global dump or filtered range) for ad-hoc drafts.

### 8.3 Pack contents (required)

| Path in zip | Content |
|-------------|---------|
| `00-LOOK-AND-FEEL.md` | Copy of [QLU-NEWSLETTER-LOOK-AND-FEEL.md](./QLU-NEWSLETTER-LOOK-AND-FEEL.md) (canonical design brief) |
| `01-BRIEF.md` | Generated: coverage month, language (te), issue target date, reminder of seven headings |
| `sections/*.md` | One Markdown file per section title that has ≥1 asset (or empty stub with “no items”) |
| `images/*` | Image binaries referenced by relative paths from the section markdown |
| `MANIFEST.md` | Counts, date filter used, export timestamp |

### 8.4 Section Markdown shape (per asset)

Each `sections/….md` groups assets under that section title:

```markdown
# Highlight classes of the month

## Item: <short id or taken_on + order>

- **Date taken:** YYYY-MM-DD
- **Label:** <long caption>
- **Summary:** <context paragraph>
- **Image:** ../images/<filename>

…
```

AI must treat **Label** as caption and **Summary** as editorial context; do not invent facts beyond these fields (plus BRIEF).

### 8.5 Admin behaviour

- Button: **Download resources (.md + images)** on Admin → Newsletter.
- Options: date range (default = current coverage month), optional “all global assets”.
- Output: single `.zip` download for the signed-in admin.

### 8.6 AI prep prompt (suggested)

> Use `00-LOOK-AND-FEEL.md` for design and structure. Use `01-BRIEF.md` and `sections/*.md` + `images/` as the only factual sources. Draft the Telugu monthly newsletter PDF content with the seven fixed headings in order. Place images with captions from Label fields.

---

## 9. Visual & PDF Spec

Full design tokens, fonts, logos, sizing: **[QLU-NEWSLETTER-LOOK-AND-FEEL.md](./QLU-NEWSLETTER-LOOK-AND-FEEL.md)** (static; ship inside every export).

| Item | Guidance (summary) |
|------|---------------------|
| **Page size** | A4 |
| **Layout** | Single column Telugu body; calm masthead |
| **Typography** | Telugu sans ≥ 11 pt; headings `#6b4a25`; brand gold tracked caps |
| **Colours** | Paper `#fffdf8`, ink `#352d26`, gold `#a17b43`, side `#f6f1e8` |
| **Imagery** | From export pack; captions = Label |
| **Versioning** | Footer: QLU + issue id + page X of Y |

---

## 10. Editorial Workflow

```
Month M activities happen
        ↓
Ongoing  Upload photo snapshots to global Admin → Newsletter library
         (section title + label + summary + date taken)
        ↓
T−7…T−4  Download resource zip (.md + images + look-and-feel)
         → feed to AI (ChatGPT / Grok) or designer
        ↓
T−5   Review AI/designer draft (accuracy, tone, consent)
        ↓
T−4   Editorial freeze
        ↓
T−2   Final PDF proof (Telugu orthography, links, names)
        ↓
T−1   Upload + queue test to internal list
        ↓
1st   Send to subscribers
```

### Roles

| Role | Responsibility |
|------|----------------|
| **Editor** | Structure, Telugu voice, freeze, final approve; run export; AI prompt |
| **Theme / class summarizer** | §6.2–6.3 from class notes or designated watchers |
| **Experiences lead** | Collect, consent, shorten §6.4 |
| **Travel / programs lead** | §6.5 and §6.8 calendars |
| **Vanya Maitreya liaison** | §6.6 approved copy |
| **Campus / QLU ops** | §6.7 facts and photos; upload campus assets |
| **Asset uploaders** | Admin newsletter intake during the month |
| **Designer / PDF producer** | Layout from AI draft + look-and-feel; final PDF |
| **Distributor** | Email/WhatsApp send + archive |

---

## 11. Compliance & Consent

- Written or recorded consent for participant experiences that use real names or identifiable details.
- No medical claims beyond what the speaker stated; no fundraising pressure in experience quotes.
- Photos: people in frame should be covered by event photography norms or explicit consent for close-ups.
- Corrections: publish errata in next issue if factual error is material.

---

## 12. Inputs Checklist (per issue)

- [ ] Relevant **global** assets uploaded (section titles + dates)
- [ ] End-of-month **resource zip** downloaded (`.md` + `images/` + look-and-feel)
- [ ] AI / designer draft reviewed against consent and facts
- [ ] Upcoming calendar (verified dates) reflected in assets or BRIEF
- [ ] Masthead month/year + issue number

---

## 13. Success Criteria

- PDF delivered on schedule ≥ 11 of 12 months in the first year.
- Each required section present (or explicit empty note).
- Editors can export `.md` + images in one download for AI prep.
- Look-and-feel file is always present in the export pack.
- Editors can add a newsletter asset in under 2 minutes from Admin → Newsletter.
- Subscriber complaints on wrong dates/names &lt; 2 per issue after month 3.

---

## 14. Open Decisions

1. Exact send time on the 1st, and holiday rule.
2. Subscriber source of truth (email list tool).
3. Whether WhatsApp is primary, secondary, or not used for the PDF.
4. Issue numbering start (Vol. 1 Issue 1 = which month?).
5. English twin PDF timing.
6. Default export filter: coverage month only vs entire global library.
7. Max photos per issue (to keep file size down).
8. When to add edit/delete and optional “used in issue YYYY-MM” usage log (assets stay global).

---

## 15. Future Enhancements (backlog)

- Web archive page with past PDFs
- English edition
- Optional usage log: which global assets were used in issue `YYYY-MM` (assets remain global)
- Filter / group admin list by section title and date range
- One-click “copy AI prompt” beside Download
- Pull “highlight classes” metadata from Self Knowledge Reading / admin calendar
- Template InDesign / Google Docs / LibreOffice master file
- Automated reminder emails at T−10 / T−4 to role owners

---

## 16. Acceptance for Launch (v1 product)

Launch newsletter program when:

1. This spec is approved by QLU editorial owner.
2. Admin asset intake (§7) is usable by editors (create + list).
3. Resource export (§8) produces a zip with look-and-feel + section markdown + images.
4. One sample PDF (previous month, Telugu) is produced via AI/designer from an export pack.
5. Naming, archive folder, and distribution channel are agreed.
6. Consent process for experiences is documented in one short SOP paragraph.
