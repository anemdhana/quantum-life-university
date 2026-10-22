# Deploy Self Knowledge Reading (free share)

Share a live URL with a few explorers using **Vercel Hobby** (app) + **Supabase Free** (auth + database). No credit card required for either free tier.

| Piece | Free product | Role |
|-------|----------------|------|
| App | [Vercel Hobby](https://vercel.com/docs/plans/hobby) | Next.js hosting, HTTPS, auto-deploy from GitHub |
| Data / login | [Supabase Free](https://supabase.com) | Postgres, Auth, RLS |

Local Docker Supabase (`localhost:54331`) **cannot** serve shared users. Create a cloud project.

**Dedicated project:** Quantum Life University uses its **own** Supabase Free project (Auth + Postgres). Do **not** reuse the yagna visitors project URL (`oqnvaqhzzaooxieydwws` or any shared org DB). Point local remote work at that QLU project via gitignored `.env.local`; keep Docker `.env` for optional localhost only (Next prefers `.env.local`).

**Repo:** `https://github.com/anemdhana/quantum-life-university` · branch `main`

---

## 1. Create a free Supabase project

1. Sign in at [supabase.com](https://supabase.com) → **New project** (name e.g. `quantum-life-university`). Use a **new** project — not an existing visitors/yagna one.
2. Note region, set a strong DB password, wait until the project is ready.
3. Open **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Apply schema: from the QLU repo, `npx supabase link --project-ref <ref>` then `npx supabase db push` (all files under `supabase/migrations/` in order). Or **SQL Editor** → run those migration files oldest-first through the latest (including newsletter + series cleanup).
5. Seed library content remotely (`seed-devi-en.sql`, `seed-devi-te.sql`, `seed.sql`) via SQL Editor or `psql` with the DB URL / service role workflow.
6. Create at least one user (**Authentication → Users**) and set their `profiles.role` to `'admin'` in **Table Editor → profiles** so Admin / Prepare / Newsletter work.
7. For local remote testing, set Auth **Site URL** to `http://localhost:3000` and redirect `http://localhost:3000/auth/callback`. Switch to the Vercel domain in step 3 when you deploy.

---

## 2. Deploy on Vercel (Hobby)

1. Open [vercel.com/new](https://vercel.com/new) → **Continue with GitHub**.
2. Import **`anemdhana/quantum-life-university`**.
3. Framework preset: **Next.js** (auto-detected). Leave build defaults.
4. **Environment Variables** (add for Production and Preview):

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon public key |

5. Click **Deploy**. After build succeeds, copy the URL, e.g. `https://quantum-life-university.vercel.app`.

Every push to `main` redeploys production. Preview URLs appear on other branches / PRs.

---

## 3. Wire Auth redirects

In Supabase → **Authentication → URL configuration**:

| Field | Value |
|-------|--------|
| **Site URL** | `https://YOUR-APP.vercel.app` |
| **Redirect URLs** | `https://YOUR-APP.vercel.app/auth/callback` |

Add the same callback for any custom domain later.

Redeploy on Vercel if you change env vars after the first deploy (**Deployments → … → Redeploy**).

---

## 4. First content on the live DB

Cloud DB starts empty (no local Docker data).

1. Sign in on the Vercel URL with the admin user.
2. **Admin → Prepare** / **Library** — import day JSON (and EN/KN/HI versions as needed).
3. **Admin → Newsletter** — upload section photos if needed.
4. Spot-check Library, reader, Dashboard, Account.

Optional: export data from local and import into cloud later; for a few explorers, re-importing a couple of days is enough.

---

## 5. Share with a few users

- Send the Vercel URL.
- Create logins in Supabase Auth (email/password), or invite them yourself.
- Only grant `profiles.role = 'admin'` to people who should edit content.
- Hobby fair use is personal / non-commercial — fine for a small private explore group.

---

## Checklist

- [ ] Supabase free project created  
- [ ] Migrations applied  
- [ ] Admin profile row exists  
- [ ] Vercel project linked to GitHub `main`  
- [ ] `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` set  
- [ ] Auth Site URL + `/auth/callback` redirect set  
- [ ] Smoke-test: sign in, open a day, open Admin  
- [ ] Share URL with explorers  

---

## Limits & notes

- **Vercel Hobby:** generous free quotas; account may pause if limits are hit until the window resets. See [Hobby plan](https://vercel.com/docs/plans/hobby).
- **Supabase Free:** ~500 MB DB; inactive projects can pause after ~7 days — one click to resume.
- **Newsletter images** live under `public/newsletter/` on the app host; they are not in Supabase Storage in v1. Large uploads on the free host should stay within the app’s 5 MB image rule.
- Do **not** put `SERVICE_ROLE_KEY` in Vercel public env. The app uses the anon key + user session + RLS.
- Local Docker uses `.env` (`localhost:54331`). Remote Auth/DB for local `npm run dev` uses gitignored `.env.local` with the QLU cloud Project URL + anon (+ service role only for seed/scripts). Production secrets live in Vercel / Supabase dashboards — never commit keys.

---

## Later upgrades (optional)

- Custom domain on Vercel + matching Supabase redirect URLs  
- Supabase Storage for newsletter images instead of `public/`  
- Vercel Pro if traffic or commercial use outgrows Hobby  

When ready to deploy, follow sections 1 → 4 in order; then share the Vercel URL.
