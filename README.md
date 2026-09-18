# Sherwani Picker — hosted web app (Next.js + Supabase, no auth)

Swipe sherwani looks, build **named shared boards** like `/board/sunday`. No login.

## 1. Create Supabase project (free)
1. Go to https://supabase.com → New project.
2. Open SQL Editor → paste contents of `supabase/schema.sql` → Run.
3. Project Settings → API → copy `Project URL` + `anon public key`.

## 2. Configure + run locally
```bash
cd sherwani-picker
npm install
cp .env.example .env.local
# edit .env.local with your URL + anon key
npm run dev   # http://localhost:3000
```

## 3. Seed images (your ~200 Pinterest links)
```bash
npm run seed
```
Uses `lib/images.ts`. Optional service-role key: `SUPABASE_SERVICE_ROLE_KEY=... npm run seed` to bypass RLS.

## 4. Create a board
- Open `/`, enter e.g. “Sunday”, Create → redirects to `/board/sunday-xxxx`.
- Share that URL. Anyone with the link can swipe; votes persist in `votes` table.
- ← / → keyboard works, touch swipe works on mobile.

## 5. Host on Vercel (free)
1. `git init && git add -A && git commit -m init` → push to GitHub.
2. https://vercel.com → Add New Project → import repo.
3. Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. Share `yourapp.vercel.app/board/<slug>`.

## Schema
- `boards(id, slug unique, title)` — one row per named board
- `images(id, url unique)` — global pool, seeded once
- `votes(board_id, image_id, decision liked|passed, unique(board_id,image_id))`

RLS is open (select/insert/delete for anon) by design since there's no auth.
If you want light protection later: add a `passcode` column on boards and check client-side.
