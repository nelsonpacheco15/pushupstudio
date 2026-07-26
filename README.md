# Stylescape

Build brand stylescapes, attach real brand-material images to pre-built layouts,
get AI concept + palette suggestions, then share a link so clients can rate every
material 0–10 and score the whole direction.

- **Studio dashboard** (`/`) — all your stylescapes; create a new one.
- **Builder** (`/build/[id]`) — brief → 3 AI concepts, pick a layout, fill in
  title / 5 attributes / palette (AI-assisted), attach images per tile, and copy
  the client link. Client feedback appears at the bottom as it comes in.
- **Client review** (`/review/[token]`) — the public link. The client taps any
  material to rate it 0–10 with a note, then scores the overall direction.

## Stack

Next.js (App Router) · Supabase (auth + Postgres + Storage) · Groq (all AI:
voice transcription + brief formatting + stylescape suggestions) · deploy on Vercel.
All database and AI calls run server-side, so your Supabase service key and
Groq key are never exposed to the browser.

## One-time setup (~5 minutes)

### 1. Create a Supabase project
- Go to [supabase.com](https://supabase.com) → **New project**. Name it e.g. `stylescape`.
- When it's ready, open **SQL Editor → New query**, paste the contents of
  [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. This creates the
  tables and the image storage bucket.

### 2. Fill in environment variables
- Copy `.env.local.example` to `.env.local`.
- From Supabase **Project Settings → API**: copy the **Project URL** into
  `NEXT_PUBLIC_SUPABASE_URL` and the secret **service_role** key into
  `SUPABASE_SERVICE_ROLE_KEY`.
- From [console.groq.com](https://console.groq.com) → **API Keys**: copy a key
  into `GROQ_API_KEY` (free tier — powers all AI in the app).

### 3. Run it locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Deploy to Vercel
1. Push this folder to a GitHub repo.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Under **Environment Variables**, add the same three keys from `.env.local`.
4. Deploy. Client links will be `https://your-app.vercel.app/review/<token>`.

## Adding your own layouts
Layouts are defined in [`src/lib/layouts.ts`](src/lib/layouts.ts) as plain config.
Copy one of the three blocks in `LAYOUTS`, give it a new key, and adjust the
columns/tiles (`role` is the label the client sees; `kind: "intro"` is the title
block, `kind: "logos"` renders the 5-logo grid, `kind: "persona"` is a persona
photo). No other code changes needed — it shows up in the builder automatically.

## Notes / next steps
- There's no login yet: anyone with a `/build/[id]` URL can edit it, and anyone
  with a `/review/[token]` URL can leave feedback (that's the point of the share
  link). Adding Supabase Auth to gate the builder is the natural next step.
- Image uploads are capped by Vercel's serverless body limit (~4.5 MB per file on
  the default plan). For larger files, switch to direct-to-Storage signed uploads.
