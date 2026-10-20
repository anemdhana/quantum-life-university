# Self Knowledge Reading — Technical Specification & Database Schema

**Project**: Quantum Life University personal + admin-enabled reader for Dr. Newton’s 9-Day Devi Navaratri discourses  
**Version**: 1.0  
**Date**: 19 October 2026  
**Stack**: Next.js 15 (App Router) + TypeScript + **UIKit 3** + Supabase

---

## 1. Goals

1. Deliver a beautiful two-page reader experience (matching the existing soft-paper + gold style) for Days 1–9.
2. Allow **admin users** to edit any section and save changes.
3. Allow **logged-in users** to:
   - Highlight favorite passages
   - Bookmark them
   - Add text notes or voice notes on highlights
   - Resume reading from the last position
4. Provide a clean personal **Dashboard** that surfaces:
   - Continue Reading card
   - Highlights (with large font)
   - Notes (text + voice)
   - Bookmarks

---

## 2. User Roles

| Role       | Permissions                                      |
|------------|--------------------------------------------------|
| `anonymous`| Read only                                        |
| `user`     | Read + Highlight + Bookmark + Notes + Resume     |
| `admin`    | All user permissions + Edit & publish sections   |

Role is stored in `profiles.role` and enforced via Supabase Row Level Security (RLS).

---

## 3. High-Level Architecture

```
Next.js 15 (App Router)
├── Public routes
│   └── /day/[day]                  → Two-page reader
├── Authenticated routes
│   ├── /dashboard                  → User dashboard
│   ├── /highlights                 → All highlights
│   └── /admin/edit/[day]/[section] → Section editor (admin only)
└── API / Server Actions
    ├── progress (resume)
    ├── highlights + notes
    └── admin content updates

Supabase
├── Auth (email magic link or Google)
├── Postgres (with RLS)
├── Storage (voice notes)
└── Realtime (optional, for live admin preview)
```

### Styling
- **UIKit 3** is used for all layout, components, and utilities (buttons, cards, grid, modals, forms, etc.).
- Custom CSS variables keep the soft paper + gold theme.
- The existing two-page reader styles are preserved and extended with UIKit classes where helpful.
- No Tailwind.

---

## 4. Database Schema (Supabase / Postgres)

### 4.1 `profiles`
Extends `auth.users`.

```sql
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);
```

### 4.2 `days`
```sql
create table public.days (
  id          serial primary key,
  day_number  int not null check (day_number between 1 and 9),
  title       text not null,
  subtitle    text,
  language    text not null default 'te' check (language in ('te', 'en')),
  published   boolean default true,
  created_at  timestamptz default now(),
  unique (day_number, language)   -- Telugu and English are separate rows
);
```

### 4.3 `sections`
Content is stored per section so admins can edit granularly.

```sql
create table public.sections (
  id            uuid primary key default gen_random_uuid(),
  day_id        int not null references public.days(id) on delete cascade,
  section_order int not null,
  title         text not null,
  content       jsonb not null,           -- array of paragraph strings
  minutes       int,
  updated_at    timestamptz default now(),
  updated_by    uuid references public.profiles(id),
  unique (day_id, section_order)
);
```

**Example `content` JSON**:
```json
["Paragraph one...", "Paragraph two...", "Paragraph three..."]
```

### 4.4 `user_progress` (Resume Reading)
```sql
create table public.user_progress (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  day_number    int not null,
  language      text not null default 'te' check (language in ('te', 'en')),
  section_id    uuid references public.sections(id),
  section_order int,
  spread_index  int default 0,
  updated_at    timestamptz default now()
);
```

### 4.5 `highlights`
```sql
create table public.highlights (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  day_number    int not null,
  section_id    uuid not null references public.sections(id) on delete cascade,
  selected_text text not null,
  start_offset  int,                     -- optional, for precise re-highlight
  end_offset    int,
  color         text default 'gold',
  note_text     text,
  voice_note_url text,                   -- Supabase Storage path
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index highlights_user_id_idx on public.highlights(user_id);
create index highlights_section_id_idx on public.highlights(section_id);
```

### 4.6 `bookmarks` (optional – can also just use highlights)
```sql
create table public.bookmarks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  day_number  int not null,
  section_id  uuid not null references public.sections(id) on delete cascade,
  label       text,
  created_at  timestamptz default now(),
  unique (user_id, section_id)
);
```

---

## 5. Row Level Security (RLS) Policies

### Profiles
- Users can read/update their own profile.
- Admins can read all profiles. Admin checks go through `public.is_admin()` (security definer) so the policy does not recurse on `profiles`.

### Days
- Everyone can `select` published days.
- Only `admin` can insert, update, or delete days. Telugu and English are separate rows (`unique (day_number, language)`).

### Sections
- Everyone can `select` published sections.
- Only `admin` role can `insert` / `update` / `delete`.

### Highlights & Bookmarks & Progress
- Users can only CRUD their own rows (`auth.uid() = user_id`).

### Storage (voice notes)
- Bucket: `voice-notes`
- Path pattern: `{user_id}/{highlight_id}.webm`
- Policy: users can upload/read only their own files.

---

## 6. Key Features – Implementation Notes

### 6.1 Two-Page Reader
- Reuse the existing column-count / spread logic from the HTML reader.
- Load sections for a day from Supabase.
- On scroll or page change, debounce-save progress to `user_progress`.

### 6.2 Highlighting
- User selects text → floating toolbar appears (“Highlight”, “Add Note”, “Voice Note”).
- Store `selected_text` + optional offsets.
- On load, re-apply highlights by matching text (or offsets) inside the section.

### 6.3 Voice Notes
- Use browser `MediaRecorder` API.
- Upload blob to Supabase Storage.
- Save public/signed URL in `highlights.voice_note_url`.
- Playback via `<audio>` on dashboard and reader.

### 6.4 Admin Editor
- Simple form: section title + ordered list of paragraphs (add/remove/reorder).
- Save via Server Action → updates `sections.content`.
- Optional: live preview using the same reader component.

### 6.5 Dashboard
Cards:
- **Continue Reading** (big button → last position)
- **Recent Highlights** (large font excerpt + day/section link)
- **Voice & Text Notes**
- **Bookmarks**

---

## 7. Suggested Project Structure

```
quantum-life-university/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── auth/callback/
│   ├── day/[day]/
│   │   └── page.tsx
│   ├── dashboard/
│   │   └── page.tsx
│   ├── admin/
│   │   └── edit/[day]/[section]/
│   │       └── page.tsx
│   └── layout.tsx
├── components/
│   ├── reader/
│   │   ├── TwoPageReader.tsx
│   │   ├── HighlightToolbar.tsx
│   │   └── VoiceNoteRecorder.tsx
│   ├── dashboard/
│   └── admin/
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   └── server.ts
│   └── actions/
│       ├── progress.ts
│       ├── highlights.ts
│       └── admin.ts
├── types/
│   └── database.ts
└── supabase/
    └── migrations/
```

---

## 8. Authentication Flow

1. User clicks “Sign in”.
2. Supabase Auth (Magic Link or Google).
3. On first login, trigger creates a row in `profiles` with `role = 'user'`.
4. Admin role is set manually in Supabase dashboard (or via a protected admin script).

---

## 9. Content Migration Plan (Days 1–9)

1. Parse existing transcript / HTML files.
2. Split into sections (matching the current chapter structure).
3. Insert into `days` and `sections` tables.
4. English translations can live as separate `language = 'en'` rows or as parallel sections.

---

## 10. Non-Functional Requirements

- Mobile responsive (single column on small screens).
- Fast load (< 2s on 4G for a day).
- Offline-friendly later (optional PWA).
- Accessible (keyboard navigation, sufficient contrast).

---

## 11. MVP Scope (Phase 1)

- [ ] Auth + profiles
- [ ] Reader for Day 8 (Telugu + English)
- [ ] Resume reading
- [ ] Highlight + text note
- [ ] Basic dashboard
- [ ] Admin edit for sections

**Phase 2**: Voice notes, bookmarks polish, remaining days, search.

---

## 12. Next Steps

1. Create Supabase project and run the schema above.
2. Scaffold Next.js app with the folder structure.
3. Implement reader + progress saving.
4. Add highlight + dashboard.
5. Add admin editor.

---

**Document owner**: Project team  
**Status**: Ready for implementation
