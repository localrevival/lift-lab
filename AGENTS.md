# lift lab

Personal workout tracker for one person. React 18, TypeScript, Vite, Tailwind, Zustand, Recharts. It is a PWA hosted on Vercel and saved to an iPhone home screen. Dark only.

## Product

Shipped in small steps. This codebase is the lifting log:

- Saved routines, editable with a keyboard on a laptop
- Live workout: weight in pounds × reps on every set. One tap marks a set done. Adding a set copies the previous set's weight and reps.
- History of finished workouts
- Progress: best weight per lift over time
- Body weight log in pounds, with a trend

Still to come, in a later PR: a running log (date, time, distance, auto pace) and weekly run distance on Progress.

Sync is a shared passcode, not an account. Each device enters it once. The browser stores it in localStorage under `lift-lab-passcode` and calls `/api/sync` only. The Vercel function checks the `x-lift-passcode` header against `LIFT_PASSCODE` and connects with `LIFT_DATABASE_URL` (Supabase transaction pooler, port 6543, `prepare: false`). The pooler username for the custom role is `lift_lab_app.<project-ref>`. Neither env var belongs in the client bundle. There is no Supabase Auth and no browser Supabase client. The table lives in schema `lift_lab` inside the Local Revival Supabase project. Schema: `project/supabase/schema.sql`. Placeholders: `project/.env.example`.

Not in the product: rest timer, PRs, RPE, plate calculator, exercise library, food tracking, analytics, ads, or paid APIs.

## Data

Zustand persist key `lift-lab` in localStorage. Weights are pounds. There is no kilogram conversion.

- `templates` — routines. Pull, Push, and Lower are inserted once when `presetsSeeded` is false. The flag stays true, so deleting one does not bring it back.
- `workouts` — finished sessions. Each exercise has `sets[]` of `{ id, weight, reps, completed }`
- `weightLog` — `{ id, date, weightLbs }`, one entry per day
- `activeWorkout` — the in-progress session. It stays on the device until the workout is saved or discarded

`syncPayload()` in `project/src/data/liftState.ts` returns `{ templates, workouts, weightLog, presetsSeeded }`. That is the blob sync pushes and pulls. Do not put the passcode, API keys, or auth tokens in this store. `sanitizeLiftData()` is the read boundary. Last-write-wins lives in `project/src/sync/lastWriteWins.ts`.

The previous iTrack key `workout-storage` is not read.

## App

Routes in `project/src/App.tsx`: `/` Workout, `/history`, `/progress`, `/body`.

Style: canvas `#1A1A1A`, cards `#242424`, inputs `#2E2E2E`, accent `#2F80ED`, done `#27AE60`, warm-up `#F2C94C`, text `#F5F5F5`, secondary `#8E8E93`. Inter (self-hosted, system stack fallback), large tap targets, tabular numbers. Tokens live in `project/tailwind.config.js` and `project/src/index.css`. Bottom tabs: Workout, History, Progress, Body. The layout is a 480px column.

PWA: `project/public/manifest.json` (`name` and `short_name` are `lift lab`, theme `#1A1A1A`, `display: standalone`), Apple web-app meta and `apple-touch-icon` in `project/index.html`. `vite-plugin-pwa` generates the service worker. Icons are blue on canvas in `project/public/icons/`.

Wake lock lives in `project/src/utils/wakeLock.ts` and is held only while the live workout is on screen.

## Commands

From `project/`:

- `npm run dev`
- `npm run build`
- `npm run lint`

## Agent working rules

- Start editing within about 10 file reads.
- Open a draft PR as soon as lint, tests, and the real Vercel build pass.
- Take 3 screenshots max, and never record demo or screen-recording videos.
- Keep verification short and proportional to the change.
- Report status by 20 minutes.
- One change per PR: about 300 lines or 8 files max.
- Never merge without Brandon's OK.
