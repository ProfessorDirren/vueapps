# ANIVUE consolidation into VUECORE (target: possible standalone retirement in 2027)

Status: migration plan, NOT a decommission authorization.

## Current confirmed architecture
- `api/vue-router.js` already routes animal questions to the `anivue` specialist within VUECORE.
- `core/specialists.js` already defines ANIVUE's specialist scope and method.
- `core/router.js` provides conservative animal routing and breathing context.
- The router response still points the ANIVUE workspace to `https://www.anivueapp.se`. This is an external dependency.
- The standalone ANIVUE repository, its API, image workflow, and operational ownership have not yet been audited here. Do not assume feature parity.

## Target ownership
VUECORE owns routing, language, shared safety rules, specialist tree, observability, common image intake and model gateway. ANIVUE is a veterinary specialist module owned and invoked by VUECORE. Preserve species-specific dog/cat/horse logic, emergency-first guidance, photo analysis and veterinarian-finding capabilities as explicit module contracts.

## Migration phases
1. Inventory both repositories and deployment configurations; record all standalone ANIVUE routes, endpoints, locales, supported species, emergency triggers and privacy constraints.
2. Define an ANIVUE specialist interface inside VUECORE (input: language, species, symptoms, optional public photo and consent; output: emergency guidance, observations, follow-up questions, source/uncertainty and veterinarian navigation). Keep urgent advice independent of model availability.
3. Port and test species-specific and language-specific behavior without changing the live external link. Cover all seven supported languages, including Arabic RTL, and emergency cases.
4. Implement VUECORE-native ANIVUE workspace and shared image handling. Compare real Preview flows against standalone ANIVUE for feature parity, accessibility and privacy.
5. Add controlled cutover and rollback, then point the ANIVUE workspace link to the VUECORE-native experience only after verification.
6. During 2027, consider retiring standalone ANIVUE **only** when usage, links, domain redirects, data retention, uptime and rollback have been reviewed and approved.

## Release gates
- No loss of urgent veterinary advice; never gate emergency instructions on AI/photo uploads.
- English default and persistent explicit language selection; no Swedish text leaking into Spanish UI.
- Species coverage verified (dog, cat, horse where currently supported).
- Tests for keyboard submission, images, failures, localization, privacy and specialist routing.
- CI green, Preview verified, production Ready and production smoke tests completed.
- Existing external ANIVUE stays operational until explicit cutover and later decommission decision.
