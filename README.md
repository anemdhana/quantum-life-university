# Quantum Life University — Self Knowledge Reading

Next.js reader for Dr. Newton’s Devi Navaratri discourses. Day 7–8 sample content is included and works before Supabase is connected.

Double-click `start.cmd` to bring up Docker Supabase, start the app, and open [http://localhost:3000](http://localhost:3000).

```bash
npm run dev
```

Local Supabase is in `docker-compose.yml`. Copy `.env.example` to `.env` (or let `start.cmd` do it).

```bash
docker compose up -d
```

The API is at [http://localhost:54331](http://localhost:54331). Mailpit (optional email catcher) is at [http://localhost:8025](http://localhost:8025). Containers are named `qlu-db`, `qlu-auth`, `qlu-rest`, `qlu-kong`, `qlu-mail`, `qlu-migrator`. Studio is not started; use Postgres on `localhost:54332` if you need SQL access. The first start applies migrations and seeds. Restart `npm run dev` after changing `.env`.

If an older Compose project is still running: `docker compose down` then `docker compose up -d`.

Local sample accounts, also listed on the sign-in page:

| Email | Password | Role |
| --- | --- | --- |
| admin@qlu.local | Lotus-River-Admin-2026! | admin |
| reader@qlu.local | Lotus-River-Reader-2026! | reader |

Passwords must be at least 12 characters and include a lowercase letter, an uppercase letter, a number, and a symbol. Change yours at [http://localhost:3000/account](http://localhost:3000/account). The current password is required. Open signup is off, so roles stay on the assigned accounts.

`npm run content` rebuilds English `content/day-0N-en.json` and `supabase/seed-devi-en.sql` from HTML readers under `Swadhyaya/9-Day-Devi-Navaratri-Dr-Newton/`.

`npm run content:te` imports Telugu days 1–7 (skips day 8) from the Telugu two-page readers, replaces generic section titles, writes `content/day-0N-te.json` + `supabase/seed-devi-te.sql`, and copies `day-0N-te.html` into Swadhyaya.

`npm run content:dump` exports the live library (days + sections) from Supabase into `content/*.json` and refreshes `supabase/seed-devi-en.sql`, `seed-devi-te.sql`, and `seed.sql`.

`npm run content:html` regenerates static two-page readers under `Swadhyaya/9-Day-Devi-Navaratri-Dr-Newton/` (same layout as `/series/.../day/N`) for all TE + EN days.

## Tools (GitHub Pages)

Folder [`Tools/`](./Tools/) is separate from Swadhyaya. Point Pages at `/Tools` (or deploy that folder).

| Path | What |
| --- | --- |
| [Tools/index.html](./Tools/index.html) | Tools hub |
| [Tools/telugu-voice-type.html](./Tools/telugu-voice-type.html) | Telugu speech-to-text (Chrome `te-IN`, same UI as `telugu_voice_type.py`) |

Open in **Google Chrome**; allow the mic. Drafts save in `localStorage`; use **Download .txt** for a file.

Static readings stay under [`Swadhyaya/`](./Swadhyaya/).

## Monthly newsletter

Telugu soft PDF assembled from a global admin photo library and an end-of-month `.md` + images export for AI drafting. Start here: [docs/QLU-MONTHLY-NEWSLETTER-README.md](./docs/QLU-MONTHLY-NEWSLETTER-README.md).
