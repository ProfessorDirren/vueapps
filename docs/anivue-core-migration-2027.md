# ANIVUE consolidation into VUECORE (target: possible standalone retirement in 2027)

Status: migration plan, NOT a decommission authorization.

## Current confirmed architecture
- `api/vue-router.js` already routes animal questions to the `anivue` specialist within VUECORE.
- `core/specialists.js` already defines ANIVUE's specialist scope and method.
- `core/router.js` provides conservative animal routing and breathing context.
- The current `api/vue-router.js` ANIVUE workspace points to the VUECORE-native `./?vue=anivue#vue-router` route. The former external-workspace dependency in this route has been removed; this does **not** prove that the standalone ANIVUE service, DNS, redirects, or all features have been retired.
- The standalone `ProfessorDirren/anivue` repository has now been inspected at its `main` branch. It is a separate React/Vite application with its own language context, image API (`/api/analyze-animal`), dog/cat/horse symptom flows, emergency triage, and optional video placeholder. Its production Vercel project is separate from `vueapps` and remains active. This inspection does not establish feature parity.

## Verified legacy separation (2026-11-10)
- Vercel `vueapps` project: `prj_8TuPgI5wxbTD02QfZlHXMObZhlfn`, owns `vueapps.se` and `www.vueapps.se`.
- Vercel `anivue` project: `prj_EiYfH63DOQG32Y9tjNr8Uakffpzp`, owns `anivueapp.se` and `www.anivueapp.se` and has a production deployment.
- Vercel returned no managed `anivue.se` domain. Do not confuse this with the existing `anivueapp.se` domain.
- Existing VUECORE router uses an internal ANIVUE workspace path; this does not stop the separate project from running.
- Legacy repository uses seven languages, while VUECORE supports eleven. Test emergency routing, species-specific symptom mapping, image validation, language fallback, memory/consent and veterinary navigation against the legacy implementation before retiring it.
- A Vercel preview deployment request for commit `47369cc` was rejected by the free-tier 100 API deployments/day limit. No production change was made.

## Target ownership
VUECORE owns routing, language, shared safety rules, specialist tree, observability, common image intake and model gateway. ANIVUE is a veterinary specialist module owned and invoked by VUECORE. Preserve species-specific dog/cat/horse logic, emergency-first guidance, photo analysis and veterinarian-finding capabilities as explicit module contracts.

## Migration phases
1. Inventory both repositories and deployment configurations; record all standalone ANIVUE routes, endpoints, locales, supported species, emergency triggers and privacy constraints.
2. Define an ANIVUE specialist interface inside VUECORE (input: language, species, symptoms, optional public photo and consent; output: emergency guidance, observations, follow-up questions, source/uncertainty and veterinarian navigation). Keep urgent advice independent of model availability.
3. Port and test species-specific and language-specific behavior without changing legacy DNS or redirects. Cover all seven supported languages, including Arabic RTL, and emergency cases.
4. Implement VUECORE-native ANIVUE workspace and shared image handling. Compare real Preview flows against standalone ANIVUE for feature parity, accessibility and privacy.
5. Add controlled cutover and rollback, verify the existing VUECORE-native workspace link end-to-end before any legacy redirect or cutover.
6. During 2027, consider retiring standalone ANIVUE **only** when usage, links, domain redirects, data retention, uptime and rollback have been reviewed and approved.

## Release gates
- No loss of urgent veterinary advice; never gate emergency instructions on AI/photo uploads.
- English default and persistent explicit language selection; no Swedish text leaking into Spanish UI.
- Species coverage verified (dog, cat, horse where currently supported).
- Tests for keyboard submission, images, failures, localization, privacy and specialist routing.
- CI green, Preview verified, production Ready and production smoke tests completed.
- Legacy ANIVUE DNS and service remain untouched until explicit cutover and later decommission decision.
