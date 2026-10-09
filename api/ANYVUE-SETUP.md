# ANYVUE operator launch checklist

ANYVUE is **off by default**. The frontend can be previewed, but real multi-model responses require all of the following server-side Vercel environment variables:

- `ANYVUE_ENABLED=true`
- `OPENAI_API_KEY`
- At least one of `ANTHROPIC_API_KEY` or `GEMINI_API_KEY`
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
- `ANYVUE_DAILY_MODEL_CALL_LIMIT=40` (default: 40 reserved provider calls per UTC day)

The Redis gate atomically reserves **four calls per question** before any paid request, including synthesis. If Redis is down or misconfigured, the endpoint fails closed. This is a global volume cap, **not** a currency cap: providers can have variable costs. Configure provider-side spending limits and alerts independently. No rate-limit flag or client claim can bypass the gate.

**Before public launch** add per-user/IP abuse throttling, CAPTCHA or account access, real usage billing, privacy notice and retention controls, and validate supported provider model IDs. This is not yet a production-ready anonymous free-year offer. The endpoint supports **up to three configured providers**, not 17.

Never put provider or Redis keys in client-side HTML, public commits, or Vercel variables prefixed with `VITE_`/`NEXT_PUBLIC_`.
