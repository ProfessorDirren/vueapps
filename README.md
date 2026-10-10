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

`antiqvue.html` provides seven-language photo observations and live market research through `/api/antiqvue`, plus expert briefs and source-inclusive copy/download. English is default; explicit language choice persists. Sweden/SEK is the initial market, adjustable to other markets and EUR/USD/GBP.

Configure `OPENAI_API_KEY`, `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the Vercel **vueapps** project, then redeploy. `ANTIQVUE_MODEL` defaults to `gpt-4.1-mini` (must support image input and Responses web search). No credentials are exposed to the browser. The global atomic daily budget defaults to 40 requests (`ANTIQVUE_DAILY_MODEL_CALL_LIMIT`). Each valuation request is limited to three web tool calls and 2,200 output tokens. This is a volume limit, not a currency spending cap.

Photos up to 10 MB are decoded and resized to at most 1600 pixels before explicit submission, with a 3 MB server image limit to fit Vercel's request limit. OpenAI response storage is disabled. Valuation uses required live web search and accepts completed-sale records only if linked to retrieved sources. An observed comparable range needs at least two distinct sales with the same currency and price basis. Hammer prices are not mixed with buyer-premium inclusive or private transaction prices. Missing evidence yields no range. Information is AI-extracted from linked sources and needs source verification; this is not certified authentication or appraisal. Region, condition, originality and fees are material. Without credentials the endpoint reports unavailable and offers the local expert brief.

Run `node --test core/*.test.mjs`. Live end-to-end analysis requires the above server configuration.
