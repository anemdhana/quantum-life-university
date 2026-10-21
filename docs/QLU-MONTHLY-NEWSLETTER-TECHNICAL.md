# QLU Monthly Newsletter — Technical Specification

| Field | Value |
|--------|--------|
| **Companions** | [README](./QLU-MONTHLY-NEWSLETTER-README.md) · [Requirements](./QLU-MONTHLY-NEWSLETTER-REQUIREMENTS.md) · [API](./QLU-MONTHLY-NEWSLETTER-API.md) · [Look & feel](./QLU-NEWSLETTER-LOOK-AND-FEEL.md) |
| **App** | `quantum-life-university` (Self Knowledge Reading) |
| **Status** | v1 — global assets + end-of-month `.md`+images export for AI |

---

## 1. Scope (engineering v1)

| In | Out |
|----|-----|
| Global table `newsletter_assets` (shared across all issues) | Per-issue ownership / exclusive lock on assets |
| Admin page `/admin/newsletter` | Public newsletter gallery |
| Create asset: section **title**, photo, long **label**, **summary**, **taken_on** | Server-side final PDF render |
| List assets newest-first (global) | Email / WhatsApp distribution automation |
| **Export zip**: look-and-feel `.md` + section `.md` + `images/` | Supabase Storage bucket (optional later) |
| Local file storage under `public/newsletter/` | |

**Design rule:** Assets are **global inventory**. Monthly newsletters **select** from this pool; they do not create private copies. `taken_on` and section `title` are filters for editors, not foreign keys to an issue row.

---

## 2. Data model

### 2.1 Table `public.newsletter_assets`

| Column | Type | Notes |
|--------|------|--------|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `title` | `text` not null | **Closed set** — newsletter section title (see §2.2). Not free-form. |
| `label` | `text` not null | Long caption / label for PDF |
| `summary` | `text` not null | Context paragraph; default `''` |
| `image_url` | `text` not null | Public URL path, e.g. `/newsletter/….jpg` |
| `taken_on` | `date` not null | Date photo was taken; default `current_date` |
| `created_by` | `uuid` null | FK → `profiles(id)` |
| `created_at` | `timestamptz` | default `now()` |
| `updated_at` | `timestamptz` | default `now()` |

**No** `issue_id` / `issue_month` on the asset row in v1 (global). Optional later: separate `newsletter_issue_asset_usage(issue_month, asset_id)` for analytics only.

Indexes:

- `(title, taken_on desc)` — filter by section + month window  
- `(taken_on desc)` — date-range browse  
- `(created_at desc)` — admin “newest first” list  

### 2.2 Allowed `title` values (enum / check constraint)

Must match requirements §7.4 exactly (English strings as stored keys):

```text
Global Assets
Summary of the themes covered in that month
Highlight classes of the month
Few Experiences from Participants
Dr. Newton's visits and classes in other places
Vanya Maitreya Highlights
Goloka, Sahasrara and QLU Updates
Upcoming Programs/Announcements
```

**Global Assets:** inventory tag for photos that apply to **any** newsletter section (not a PDF body heading). Admin UI defaults new rows to this title. Export packs should include a `sections/` file for it (or fold into a shared pool) so AI/designers can place those images where needed.

Recommended DB enforcement:

```sql
alter table public.newsletter_assets
  add constraint newsletter_assets_title_check
  check (title in (
    'Global Assets',
    'Summary of the themes covered in that month',
    'Highlight classes of the month',
    'Few Experiences from Participants',
    'Dr. Newton''s visits and classes in other places',
    'Vanya Maitreya Highlights',
    'Goloka, Sahasrara and QLU Updates',
    'Upcoming Programs/Announcements'
  ));
```

App layer: shared constant array + `<select>` only (reject free text on the server action). Default: `DEFAULT_NEWSLETTER_SECTION_TITLE = "Global Assets"`.

Stable machine keys (optional rename later without breaking UI labels):

| `title` (stored / displayed) | Suggested `section_key` (future) |
|------------------------------|----------------------------------|
| Global Assets | `global` |
| Summary of the themes… | `themes` |
| Highlight classes… | `highlight_classes` |
| Few Experiences… | `experiences` |
| Dr. Newton's visits… | `visits` |
| Vanya Maitreya Highlights | `vanya_maitreya` |
| Goloka, Sahasrara and QLU Updates | `campus_qlu` |
| Upcoming Programs/Announcements | `upcoming` |

### 2.3 RLS

- **Select / insert / update / delete:** `public.is_admin()` only.
- No anonymous read in v1 (global editorial inventory, not a public gallery).

Migration file: `supabase/migrations/20261020190000_newsletter_assets.sql`  
Follow-up migration (when implementing enum): add `newsletter_assets_title_check` if not already present.

---

## 3. File storage

| Item | Choice |
|------|--------|
| Location | `public/newsletter/` in the Next app |
| Naming | `{section-slug-or-safe}-{yyyyMMdd}-{shortid}.{ext}` |
| Types | `image/jpeg`, `image/png`, `image/webp` |
| Max size | 5 MB (same as reading covers) |
| Served as | Static files via Next (`/newsletter/...`) |

Files are global artifacts referenced by `image_url`; deleting an issue PDF never deletes the asset file unless the asset row is deleted (v1.1).

---

## 4. Application surface

Contract details (payloads, errors, proposed REST): [API specification](./QLU-MONTHLY-NEWSLETTER-API.md).

### 4.1 Routes

| Route | Type | Role |
|-------|------|------|
| `/admin/newsletter` | RSC + client form | Admin global asset create + list |

Nav: **Admin → Newsletter** (`AdminNav`).

### 4.2 Server modules

| Module | Responsibility |
|--------|----------------|
| `lib/actions/newsletter.ts` | `requireAdmin`, `createNewsletterAsset`, `listNewsletterAssets`; validate `title ∈ ALLOWED_TITLES` |
| Shared const | `NEWSLETTER_SECTION_TITLES` (single source for UI + action) |

### 4.3 Client UI

| Component | Responsibility |
|-----------|----------------|
| `NewsletterAssetForm` | **Title** = `<select>` of §2.2 values; photo file; label; summary; date taken (default today) |
| List panel | Global library: thumbnail, section title, date taken, truncated label |

### 4.4 Form defaults & validation

| Field | Default | Validation |
|-------|---------|------------|
| Title | **Global Assets** (default) | required; must be in `NEWSLETTER_SECTION_TITLES` |
| Image (photo snapshot) | none | required on create; type + size |
| Label | empty | trim, min 2 chars |
| Summary | empty | trim, min 2 chars |
| Date taken | **today** (`YYYY-MM-DD` local) | valid date |

Submit via `FormData` to server action.

### 4.5 Query patterns (assemble an issue — future helper)

```text
listNewsletterAssets({
  title?: AllowedTitle,
  takenOnFrom?: 'YYYY-MM-DD',  // e.g. first day of coverage month
  takenOnTo?: 'YYYY-MM-DD',    // last day of coverage month
})
```

Still returns **global** rows; caller chooses which to place in the PDF.

### 4.6 End-of-month export pack

**Goal:** One admin download containing Markdown + images for AI (ChatGPT / Grok) or a designer.

**Canonical look-and-feel source:** `docs/QLU-NEWSLETTER-LOOK-AND-FEEL.md` → copied into the zip as `00-LOOK-AND-FEEL.md`.

#### Zip layout

```text
QLU-newsletter-resources-{yyyy-MM}/   # or -all / -from-to
  00-LOOK-AND-FEEL.md
  01-BRIEF.md
  MANIFEST.md
  sections/
    01-summary-of-the-themes-covered-in-that-month.md
    02-highlight-classes-of-the-month.md
    …
  images/
    {safe-id-or-filename}.jpg
```

#### Section file rules

- Filename: zero-padded order + slug of section title.
- Include every allow-listed section; if no assets in range, file still exists with a stub note.
- Image links are **relative**: `../images/…`
- UTF-8 Markdown; Telugu in label/summary preserved.

#### `01-BRIEF.md` (generated)

- Coverage window (`takenOnFrom`–`takenOnTo`)
- Target issue month / send date (1st)
- Language: Telugu
- Pointer: follow `00-LOOK-AND-FEEL.md` for headings, colours, fonts, sizes
- Suggested AI instruction paragraph (from requirements §8.6)

#### Implementation sketch

| Piece | Notes |
|-------|--------|
| Action | `exportNewsletterResources({ takenOnFrom?, takenOnTo? })` → `Blob` / temp zip path |
| Library | e.g. `archiver` or `jszip` on server |
| UI | “Download resources (.md + images)” on `/admin/newsletter` |
| Auth | Admin only |

---

## 5. Sequences

### 5.1 Create asset

```
Admin opens /admin/newsletter
  → RSC loads listNewsletterAssets()  // global, newest first
  → Client form: title select + taken_on = today
User picks section title, photo, label, summary [, date]
  → createNewsletterAsset(FormData)
      → requireAdmin()
      → assert title ∈ ALLOWED_TITLES
      → write file to public/newsletter/
      → insert newsletter_assets row (no issue_id)
      → revalidatePath('/admin/newsletter')
  → UI shows toast + refreshed global list
```

### 5.2 Export for AI

```
Admin sets date range (default: coverage month) → Download
  → exportNewsletterResources({ takenOnFrom, takenOnTo })
      → requireAdmin()
      → load matching newsletter_assets
      → copy LOOK-AND-FEEL.md → 00-LOOK-AND-FEEL.md
      → write 01-BRIEF.md + MANIFEST.md
      → write sections/*.md + copy image files
      → stream zip to browser
Editor uploads zip (or folder) to ChatGPT / Grok with the suggested prompt
```

---

## 6. Types

```ts
type NewsletterSectionTitle =
  | "Global Assets"
  | "Summary of the themes covered in that month"
  | "Highlight classes of the month"
  | "Few Experiences from Participants"
  | "Dr. Newton's visits and classes in other places"
  | "Vanya Maitreya Highlights"
  | "Goloka, Sahasrara and QLU Updates"
  | "Upcoming Programs/Announcements";
```

Extend `types/database.ts` with `NewsletterAssetRow` (`title: string` or union) and `Tables['newsletter_assets']`.

---

## 7. Ops / migrate

```bash
# From repo root, with Docker DB up:
docker cp supabase/migrations/20261020190000_newsletter_assets.sql qlu-db:/tmp/newsletter_assets.sql
docker exec -e PGPASSWORD=… qlu-db psql -U postgres -d postgres -f /tmp/newsletter_assets.sql
```

Add check constraint migration when locking titles in the DB.

---

## 8. Security notes

- Admin gate on every mutation (`is_admin` / profile role).
- Reject unknown `title` values server-side (do not trust the select alone).
- Do not trust client MIME alone; check `file.type` and size server-side.
- Sanitize filename; never use raw user filename as the only path segment.
- RLS denies non-admin even if anon key is used from the browser client.

---

## 9. Roadmap (engineering)

| Version | Work |
|---------|------|
| **v1** | Global table + create + list; title = closed section list |
| **v1.1** | Edit / delete; filters; **export zip** (look-and-feel + section md + images) |
| **v1.2** | Optional usage log; “Copy AI prompt” helper |
| **v2** | REST export for external tools |
| **v3** | Assisted in-app PDF compose (optional) |

---

## 10. Acceptance (engineering v1 / v1.1)

- [ ] Assets have **no** required issue foreign key (global)
- [ ] Title UI is a **select** limited to the seven section strings
- [ ] Server rejects titles outside the allow-list
- [ ] Date taken defaults to today and can be changed
- [ ] Image + label + summary persist; list shows section title
- [ ] Export zip includes `00-LOOK-AND-FEEL.md`, section markdown, and `images/`
- [ ] Non-admin cannot insert or export (RLS / action check)
