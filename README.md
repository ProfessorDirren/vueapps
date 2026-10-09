# vueapps
VUEAPPS – Home of ANIVUE, MOTOVUE and future VUE applications.

## Available tools

- `homevue.html`: home maintenance plans and check dates.
- `plantvue.html`: plant care observations and moisture-check plans.
- `armvue.html`: equipment records and manufacturer-directed service schedules.
- `foodvue.html`: ingredient scaling, shopping lists and recipe backups.

All four share seven-language UI, English default, Arabic RTL, browser-local saving, export/restore and printing. Images up to 10 MB and videos up to 50 MB can be previewed as local references. Media is session-only and **not AI-analyzed**. The new tools make no network calls with user input.

Run checks with `node --test core/*.test.mjs`. The portal uses EU PostHog page-view analytics; the four new tools do not send notes, recipes, equipment records or media to analytics.
