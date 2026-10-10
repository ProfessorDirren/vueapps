# vueapps
VUEAPPS – Home of ANIVUE, MOTOVUE and future VUE applications.

## Available tools

- `homevue.html`: home maintenance plans and check dates.
- `plantvue.html`: plant care observations and moisture-check plans.
- `armvue.html`: equipment records and manufacturer-directed service schedules.
- `foodvue.html`: ingredient scaling, shopping lists and recipe backups.

All four share seven-language UI, English default, Arabic RTL, browser-local saving, export/restore and printing. Images up to 10 MB and videos up to 50 MB can be previewed as local references. Media is session-only and **not AI-analyzed**. The new tools make no network calls with user input.

Run checks with `node --test core/*.test.mjs`. The portal uses EU PostHog page-view analytics; the four new tools do not send notes, recipes, equipment records or media to analytics.

## ANTIQVUE

`antiqvue.html` provides seven-language antiques/vintage research, local photo preview, expert briefs, copy/download, and optional server-side photo observations through `/api/antiqvue`. Photos and descriptions are sent only on explicit analysis. Configure `OPENAI_API_KEY`, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to enable analysis. The atomic global daily budget defaults to 40 calls (`ANTIQVUE_DAILY_MODEL_CALL_LIMIT`). Without configuration the app clearly reports unavailable analysis and offers an expert brief. No live sold-price database is connected, so the AI must not invent valuations or comparables.
