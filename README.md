# lift lab

A personal workout tracker. One person, one phone, no account.

Log weight and reps for every set, keep routines, look back at history, and watch the best weight for each lift. Body weight is a separate log. Dark screen, lime type, built to live on an iPhone home screen.

## Run

```bash
cd project
npm install
npm run dev
```

Production build: `npm run build`. The Vercel project builds `project/` and publishes `project/dist`.

## Sync

Devices share one passcode. Server env vars are `LIFT_DATABASE_URL` and `LIFT_PASSCODE` (see `project/.env.example`). Data lives in schema `lift_lab` inside the Local Revival Supabase project. Run `project/supabase/schema.sql` in that project's SQL editor. The transaction pooler username for the dedicated role is `lift_lab_app.<project-ref>`.

## Install on iPhone

Open the deployed site in Safari, tap Share, then Add to Home Screen. The app name is **lift lab**. It opens standalone, black status bar, no browser chrome.
