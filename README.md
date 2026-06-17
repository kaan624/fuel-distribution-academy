# Fuel Distribution Academy

A static, multi-page onboarding course on commercial fuel distribution &
marketing, built for new hires who are sharp but new to the industry.

## What's here
- `index.html` — landing page + module grid
- `module-1.html … module-10.html` — the ten course modules
- `glossary.html` — searchable industry glossary
- `assets/` — shared stylesheet + JS (nav highlighting, glossary filter)

Modules 1–3 are fully written. Modules 4–10 ship as objective-stubs marked
"in development" and fill in as the live course reaches them.

## Deploy to Vercel
Two options:

**A. Drag-and-drop (no Git):**
1. Zip this folder (or use the Vercel dashboard "deploy" → upload).
2. Go to vercel.com → Add New → Project → import / drop the folder.
3. No framework, no build command, no output dir — it's plain static HTML.
   Vercel serves it as-is. Done.

**B. From GitHub:**
1. Push this folder to a repo.
2. vercel.com → Add New → Project → pick the repo.
3. Framework preset: "Other". Build command: none. Output dir: `./`.
4. Deploy. You'll get a `*.vercel.app` URL to share.

`cleanUrls` is on, so links work with or without the `.html`.

## Rebranding
Placeholder branding is intentional. To make it yours:
- Edit the `.brand` block (mark text "FD" + name) in each HTML file's sidebar.
- Change the accent color in `assets/style.css` — the variable `--amber`.
- Remove the `.placeholder-note` box from the sidebar in each file.

## Interactive answer-checking (added in v2)

Each question in Modules 1–3 now has an answer box. A student types — or
dictates with **Wispr Flow** (or any system voice dictation) — their own answer,
clicks **Check my answer**, and gets warm, specific tutor feedback from Claude.
The model answer reveals only *after* they submit.

### Required setup on Vercel
The grading calls go through a serverless function (`api/check.js`) so your API
key stays secret. You MUST add the key as an environment variable:

1. Get an Anthropic API key from https://console.anthropic.com
2. In Vercel: your project → Settings → Environment Variables
3. Add:  Name = `ANTHROPIC_API_KEY`   Value = your key
4. Redeploy (Deployments → … → Redeploy) so the function picks it up.

Without this variable the answer box will show a friendly error telling you the
key is missing. Everything else on the site works regardless.

Note: with drag-and-drop deploys, make sure the `api/` folder is included at the
root alongside `index.html`. The GitHub deploy route handles this automatically.
