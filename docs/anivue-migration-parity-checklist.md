# ANIVUE → VUECORE migration: parity and cutover gates

Status: implementation in progress; **do not retire anivueapp.se**.

## Verified in repositories
- VUECORE `core/anivue.js` extends `VueDomain`, but its assess method is a placeholder and declares imageAnalysis false.
- `anivue-core.html` is a limited text-first preview, not equivalent to the standalone React application.
- `api/vue-router.js` returns `workspace: 'https://www.anivueapp.se'` for ANIVUE.
- Standalone ANIVUE documents seven languages, dog/cat/horse, emergency-first triage, optional image analysis, equine sources and veterinary navigation.

## Mandatory implementation before cutover
1. Inventory and port the standalone API handler, structured output validation, image type/signature/size handling, privacy/consent behavior and model prompt safety to VUECORE's shared image/model infrastructure. Never expose API keys to the browser.
2. Implement `AniVueDomain` species-specific dog/cat/horse deterministic triage through `VueFlow.emergencyCheck`. Include equine colic/choke and other standalone emergency mappings, with veterinary review flags and citations. Never gate emergencies on photo or AI.
3. Implement complete native ANIVUE workspace: species/symptoms, onset and follow-up, photo selection, explicit optional emergency photo observations, veterinarian navigation, failure/timeouts and accessible keyboard/mobile UX.
4. Match seven languages (en, es, sv, hi, zh-CN, ru, ar), English default, explicit saved choice, RTL, and response-language enforcement; reject unsupported language/species server-side.
5. Test deterministic emergency priority, no downgrade after image failure or language change, consent/privacy, translation consistency, model response schema, photo constraints, horse safety and existing dog/cat regression.
6. Verify deployment secrets and production/preview configuration without copying or exposing secret values. Run lint, tests, build and human Preview parity checks.
7. Only after explicit approval and successful smoke/rollback verification change the ANIVUE workspace from the old domain to the native workspace. Keep standalone live until DNS, links, usage and rollback are independently cleared.

## Stop conditions
No DNS changes, no standalone repository deletion, no removal of existing domain, no PR merge, and no production cutover on the basis of documentation or a placeholder adapter alone.
