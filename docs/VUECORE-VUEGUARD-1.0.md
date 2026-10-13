# VUECORE 1.0 + VUEGUARD 1.0 — safe rollout plan

Status: development branch only. No production deployment or merge authorized.

## Current architecture (verified)
- `core/router.js`: conservative keyword-based specialist selection; ambiguous ties request clarification; fallback to ANYVUE or previous domain.
- `apps/router.js`: frontend questions, photos, memory and API submission.
- `core/handoff.js`: controlled cross-specialist handoff, currently restricted to selected domains.
- `package.json`: `npm test` executes `node --test core/*.test.mjs`.

## Guardrails before rollout
1. Keep the current production routing unchanged until regression tests pass.
2. Add routing regression coverage for Swedish, English, Spanish and other supported languages, mixed-topic ambiguity, and emergency ANIVUE phrases.
3. Add response-language contract tests: selected UI language must control the specialist answer; never silently fall back to Swedish when Spanish is selected.
4. Validate API errors, missing keys, unsafe redirects and domain handoffs without exposing secrets.
5. Require automated tests to pass on PRs before merging; validate a Vercel Preview manually for photo, emergency and language flows.
6. Avoid changing Loopia DNS, anivueapp.se, existing Vercel projects or production environment variables.

## VUECORE intelligence roadmap
- First: measurable multilingual routing quality and specialist confidence/clarification.
- Next: configurable specialist/subspecialist registry, supporting arbitrarily deep specialist paths without hard-coded depth limits.
- Later: domain-specific evaluation datasets and deeper routing, retaining human-readable decisions and safe fallbacks.

## Release gate
A failed critical test or a failed Preview verification blocks production. Human approval is required to merge.
