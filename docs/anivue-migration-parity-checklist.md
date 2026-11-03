# ANIVUE → VUECORE migration: parity and cutover gates

Status: implementation in progress; **do not retire anivueapp.se**.

## Verified in repositories (updated after PR #87)
- VUECORE `core/anivue.js` implements `AniVueDomain extends VueDomain`, deterministic dog/cat/horse emergency checks, and a native `analyzePhoto()` adapter to the VUECORE image API. The image API validates JPEG/PNG/WebP up to **3 MiB** and returns structured, unverified visual observations. `assess()` now delegates non-emergency text assessment to the shared VUECORE router via `analyzeText()` (PR #83); full functional parity is **not** achieved.
- `core/domain-registry.js` constructs ANIVUE and ANYVUE through shared VUECORE domain inheritance. The native `anivue-core.html` and `anyvue.html` pages use the registry. Other specialists still need actual adapter integration.
- `anivue-core.html` is still a preview, but it supports dog/cat/horse symptom selection, seven languages, RTL, optional photo, veterinarian map search and immediate deterministic emergency advice on symptom selection. Photo analysis now goes through the inherited domain adapter. Photo read invalidation is handled on replacement/removal (PR #84).
- `api/vue-router.js` routes animal answers to `./anivue-core.html` and retains `legacy_workspace: https://www.anivueapp.se`. Standalone ANIVUE remains operational as a fallback.
- Standalone ANIVUE supports a larger image envelope (10 MiB and additional image formats including HEIC/HEIF), and a fuller React workflow. These differences must be resolved or explicitly accepted before cutover.
- Automated CI tests cover VUECORE emergency-first behavior, photo contracts, and seven-language text routing and emergency checks (PRs #85 and #87). They **do not** constitute a completed human Preview parity or production smoke test.

## Current release evidence and remaining verification
- PRs #83, #84, #85 and #87 passed VUE CORE and VUEGUARD CI and were merged. Vercel production reported READY for PR #87 squash commit `5ff2ac80a6c223e974a9e16279f70ec2387ab760`.
- PR #87 extends deterministic breathing-distress text detection across seven languages. This is phrase-level regression coverage, **not** proof of comprehensive multilingual medical-language understanding.
- No human browser-based Preview comparison, mobile/accessibility audit, production functional smoke test or licensed equine-veterinarian sign-off has been recorded as complete.
- Standalone/native feature differences (including 10 MiB versus 3 MiB image limits and HEIC/HEIF support) remain unresolved; no DNS or standalone cutover is authorized.

## Mandatory implementation before cutover
1. Inventory and port the standalone API handler, structured output validation, image type/signature/size handling, privacy/consent behavior and model prompt safety to VUECORE's shared image/model infrastructure. Never expose API keys to the browser.
2. Implement `AniVueDomain` species-specific dog/cat/horse deterministic triage through `VueFlow.emergencyCheck`. Include equine colic/choke and other standalone emergency mappings, with veterinary review flags and citations. Never gate emergencies on photo or AI.
3. Implement complete native ANIVUE workspace: species/symptoms, onset and follow-up, photo selection, explicit optional emergency photo observations, veterinarian navigation, failure/timeouts and accessible keyboard/mobile UX.
4. Match seven languages (en, es, sv, hi, zh-CN, ru, ar), English default, explicit saved choice, RTL, and response-language enforcement; reject unsupported language/species server-side.
5. Test deterministic emergency priority, no downgrade after image failure or language change, consent/privacy, translation consistency, model response schema, photo constraints, horse safety and existing dog/cat regression.
6. Verify deployment secrets and production/preview configuration without copying or exposing secret values. Run lint, tests, build and human Preview parity checks.
7. Only after explicit approval and successful smoke/rollback verification change the ANIVUE workspace from the old domain to the native workspace. Keep standalone live until DNS, links, usage and rollback are independently cleared.

## Stop conditions
No DNS changes, no standalone repository deletion, no removal of existing domain, and no production cutover on the basis of documentation or a placeholder adapter alone. Ordinary reviewed PR merges may proceed with green CI and appropriate checks; production cutover requires explicit approval and completed parity verification.
