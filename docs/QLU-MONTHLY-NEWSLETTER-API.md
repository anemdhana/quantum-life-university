# QLU Monthly Newsletter — API Specification

| Field | Value |
|--------|--------|
| **Companions** | [README](./QLU-MONTHLY-NEWSLETTER-README.md) · [Requirements](./QLU-MONTHLY-NEWSLETTER-REQUIREMENTS.md) · [Technical](./QLU-MONTHLY-NEWSLETTER-TECHNICAL.md) · [Look & feel](./QLU-NEWSLETTER-LOOK-AND-FEEL.md) |
| **Style (v1)** | Next.js **Server Actions** (admin UI) — not public REST |
| **Auth** | Signed-in user with `profiles.role = 'admin'` |
| **Asset model** | **Global** library (no issue foreign key) |

---

## 1. Overview

Newsletter photo snapshots are managed through admin server actions in `lib/actions/newsletter.ts`. Callers are trusted admin UI only (`/admin/newsletter`).

| Operation | Mechanism | Public? |
|-----------|-----------|---------|
| List assets | Server action `listNewsletterAssets` | No — admin session |
| Create asset | Server action `createNewsletterAsset` | No — admin session |
| **Export pack** | Server action / route `exportNewsletterResources` → `.zip` | No — admin session |
| Static image bytes | `GET /newsletter/{filename}` | Yes (public folder) — treat filenames as unguessable; do not list directory |

**v1 does not expose** anonymous JSON REST for assets. If a designer tool or mobile app needs HTTP later, use §6 (proposed REST).

**AI workflow:** Export zip → upload to ChatGPT / Grok with `00-LOOK-AND-FEEL.md` as the design system and `sections/*.md` + `images/` as facts.

---

## 2. Shared types

```ts
/** Closed set — must match requirements §7.4 / technical §2.2 */
type NewsletterSectionTitle =
  | "Summary of the themes covered in that month"
  | "Highlight classes of the month"
  | "Few Experiences from Participants"
  | "Dr. Newton's visits and classes in other places"
  | "Vanya Maitreya Highlights"
  | "Goloka, Sahasrara and QLU Updates"
  | "Upcoming Programs/Announcements";

type NewsletterAsset = {
  id: string;           // uuid
  title: NewsletterSectionTitle;
  label: string;        // long caption
  summary: string;
  imageUrl: string;     // e.g. "/newsletter/….jpg"
  takenOn: string;      // "YYYY-MM-DD"
  createdAt: string;    // ISO timestamptz
};

type ActionError = { ok: false; error: string };
```

Constant (single source of truth in app code):

```ts
export const NEWSLETTER_SECTION_TITLES: readonly NewsletterSectionTitle[] = [ /* seven strings */ ];
```

---

## 3. Server actions (v1)

Module: `lib/actions/newsletter.ts`  
Directive: `"use server"`

### 3.1 `listNewsletterAssets`

**Purpose:** Return the global asset library for the admin list (newest first).

| | |
|--|--|
| **Signature** | `listNewsletterAssets(): Promise<NewsletterAsset[]>` |
| **Auth** | Admin required; non-admin / signed-out → `[]` (no throw) |
| **Order** | `created_at` descending |
| **Limit** | 100 (v1) |

**Optional filters (spec target — implement with list args):**

```ts
listNewsletterAssets(options?: {
  title?: NewsletterSectionTitle;
  takenOnFrom?: string; // YYYY-MM-DD inclusive
  takenOnTo?: string;   // YYYY-MM-DD inclusive
  limit?: number;       // default 100, max 500
}): Promise<NewsletterAsset[]>
```

Filtering does **not** make assets issue-scoped; it only narrows the global pool for editors.

---

### 3.2 `createNewsletterAsset`

**Purpose:** Insert one global photo snapshot + metadata.

| | |
|--|--|
| **Signature** | `createNewsletterAsset(formData: FormData): Promise<{ ok: true; asset: NewsletterAsset } \| ActionError>` |
| **Auth** | Admin required |

#### FormData fields

| Key | Type | Required | Rules |
|-----|------|----------|--------|
| `title` | string | Yes | Must be ∈ `NEWSLETTER_SECTION_TITLES` (reject free text) |
| `image` | `File` | Yes | `image/jpeg` \| `image/png` \| `image/webp`; ≤ 5 MB |
| `label` | string | Yes | trim; min length 2 |
| `summary` | string | Yes | trim; min length 2 |
| `takenOn` | string | Yes* | `YYYY-MM-DD`; if missing/empty, server may default to **today** (local) |

\*UI always sends a date; default **today** is a client (and optionally server) default.

#### Success

```json
{
  "ok": true,
  "asset": {
    "id": "…",
    "title": "Goloka, Sahasrara and QLU Updates",
    "label": "…",
    "summary": "…",
    "imageUrl": "/newsletter/goloka-….jpg",
    "takenOn": "2026-10-20",
    "createdAt": "2026-10-20T15:00:00.000Z"
  }
}
```

#### Error examples (`ok: false`)

| `error` (message) | When |
|-------------------|------|
| Sign in as an admin. | No session |
| Only an admin can manage newsletter assets. | Wrong role |
| Choose a newsletter section title. / Invalid section title. | Missing or not in allow-list |
| Enter a long label / caption. | Label too short |
| Enter a short summary. | Summary too short |
| Upload an image. | No file |
| Choose a JPEG, PNG, or WebP image. | Bad MIME |
| Use an image smaller than 5 MB. | Too large |
| Date taken must be YYYY-MM-DD. | Bad date |
| Supabase / insert errors | DB failure |

#### Side effects

1. Write image under `public/newsletter/`
2. Insert `newsletter_assets` row (`created_by` = admin user id)
3. `revalidatePath("/admin/newsletter")`

No issue row is created or updated (global only).

---

### 3.3 `exportNewsletterResources`

**Purpose:** Download accumulated global assets (optionally filtered by date) as **Markdown + images + look-and-feel**, for AI newsletter prep (typically end of month).

| | |
|--|--|
| **Signature (proposed)** | `exportNewsletterResources(input?: { takenOnFrom?: string; takenOnTo?: string }): Promise<{ ok: true; filename: string; bytes: Uint8Array } \| ActionError>` |
| **HTTP alternative** | `GET /api/admin/newsletter/export?takenOnFrom=&takenOnTo=` → `application/zip` |
| **Auth** | Admin required |

#### Query / input

| Field | Required | Notes |
|-------|----------|--------|
| `takenOnFrom` | No | `YYYY-MM-DD`; inclusive. Default: first day of previous/current coverage month (product choice). |
| `takenOnTo` | No | `YYYY-MM-DD`; inclusive. Default: last day of that window. |
| *(omit both)* | — | Export **all** global assets (heavy); allow explicitly via `all=1` if preferred. |

#### Zip payload

| Entry | Description |
|-------|-------------|
| `00-LOOK-AND-FEEL.md` | Snapshot of repo `docs/QLU-NEWSLETTER-LOOK-AND-FEEL.md` |
| `01-BRIEF.md` | Generated month brief + AI hint |
| `MANIFEST.md` | Counts, filter, export time |
| `sections/{nn}-{slug}.md` | Assets grouped by section title |
| `images/*` | Binary copies of `image_url` files |

#### Section markdown contract

```markdown
# {NewsletterSectionTitle}

## Item: {asset.id}

- **Date taken:** {takenOn}
- **Label:** {label}
- **Summary:** {summary}
- **Image:** ../images/{filename}
```

#### Responses

| Result | Meaning |
|--------|---------|
| Zip stream / bytes | Success |
| `{ ok: false, error }` | Auth / empty set policy / IO failure |

**Empty range:** Still return a zip with look-and-feel + BRIEF + empty section stubs (preferred), or `400` with a clear error — product should prefer stubs so AI still knows the heading map.

---

## 4. Static image access

| | |
|--|--|
| **URL** | `GET {origin}{imageUrl}` e.g. `GET /newsletter/asset-20261020-abc123.jpg` |
| **Auth** | None (static public file) |
| **Cache** | Browser / CDN cacheable |

Security: rely on unguessable filenames + admin-only create; do not enable directory listing. Future: private bucket + signed URLs.

---

## 5. Auth & authorization

| Check | Where |
|-------|--------|
| Session cookie | Supabase SSR `getUser()` in server action |
| Role | `profiles.role === 'admin'` |
| RLS | `newsletter_assets` policies: `is_admin()` for all ops |

UI must not call these actions without an admin session; actions still enforce independently.

---

## 6. Proposed REST (v1.x / external tools) — not implemented

Use only if a non-Next client needs HTTP. Base path suggestion: `/api/admin/newsletter/assets`.

### 6.1 `GET /api/admin/newsletter/assets`

**Auth:** Admin Bearer / session  

**Query**

| Param | Type | Notes |
|-------|------|--------|
| `title` | string | Exact section title |
| `takenOnFrom` | date | Inclusive |
| `takenOnTo` | date | Inclusive |
| `limit` | int | Default 100 |

**Response `200`:** `{ "assets": NewsletterAsset[] }`  
**Response `401` / `403`:** `{ "error": "…" }`

### 6.2 `POST /api/admin/newsletter/assets`

**Auth:** Admin  

**Body:** `multipart/form-data` — same fields as §3.2  

**Response `201`:** `{ "asset": NewsletterAsset }`  
**Response `400` / `401` / `403`:** `{ "error": "…" }`

### 6.3 `GET /api/admin/newsletter/export`

Same semantics as §3.3; response headers:

```http
Content-Type: application/zip
Content-Disposition: attachment; filename="QLU-newsletter-resources-2026-10.zip"
```

### 6.4 Future

| Method | Path | Notes |
|--------|------|--------|
| `PATCH` | `/api/admin/newsletter/assets/:id` | Edit metadata / replace image |
| `DELETE` | `/api/admin/newsletter/assets/:id` | Delete row + file |
| `POST` | `/api/admin/newsletter/issues/:yyyyMm/usage` | Optional usage log only (assets stay global) |

---

## 7. PostgREST (direct Supabase) — admin only

Table: `public.newsletter_assets`

Editors should prefer server actions. Direct REST is possible with the user JWT if RLS allows:

```http
GET /rest/v1/newsletter_assets?select=*&order=created_at.desc&limit=100
POST /rest/v1/newsletter_assets
Content-Type: application/json
```

**Caution:** Image upload is **not** handled by PostgREST; file must be written via the app action (or Storage API later). Prefer `createNewsletterAsset` for creates.

---

## 8. Versioning

| Version | API surface |
|---------|-------------|
| **v1** | Server actions list + create; title allow-list; global rows |
| **v1.1** | Filters; update / delete; **export zip** (md + images + look-and-feel) |
| **v1.2** | REST export mirror; usage-log endpoints |
| **v2** | Export by explicit asset id list |

---

## 9. Acceptance (API v1 / export)

- [ ] Document matches implemented action names and FormData keys
- [ ] Title allow-list documented and enforced in action
- [ ] Errors return `{ ok: false, error }` without leaking internals
- [ ] No public JSON list of all assets
- [ ] Spec states assets are global (no issue id in create payload)
- [ ] Export includes `00-LOOK-AND-FEEL.md` and relative `images/` links in section markdown
- [ ] Export is admin-only
