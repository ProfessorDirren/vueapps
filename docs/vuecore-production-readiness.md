# VUECORE + all specialist VUEs: production readiness gates

Status: **not yet certified production-ready as a complete suite**. This document records code-verified facts, not browser verification or clinical approval.

## Verified implementation baseline
- `core/domain-registry.js`: `AniVueDomain` and `AnyVueDomain` have real adapters. Every other registered specialist is currently constructed as `SpecialistVueDomain`, whose `assess()` explicitly throws `not_implemented`. Specialist guidance profiles and routed generic answers do **not** constitute native specialist assessment adapters.
- `core/specialists.js`: specialist guidance profiles exist for MEDIVUE, ESTATEVUE, WARDROBEVUE, ANYVUE, ANIVUE, ANTIQVUE, VINYLVUE, MUSICGEARVUE, MOTOVUE, HOMEVUE, PLANTVUE, ARMVUE, FOODVUE and SLUMPVUE.
- ANIVUE native page is explicitly labeled a preview. The native/standalone parity checklist lists unresolved photo limits, feature differences, human browser testing and veterinary review. Do not retire `anivueapp.se`.
- `package.json` defines a Node test script. Passing tests and a Vercel READY deployment alone do not establish end-to-end readiness.

## Required release gates for each specialist
1. Define the user-facing contract and specialist-specific inputs, outputs, error states, safety limits and language coverage.
2. Implement the actual `VueDomain` subclass/adapter in the shared VUECORE registry; do not mark generic guidance as a working assessment implementation.
3. Cover valid input, invalid input, timeout, API failure, language, safety and privacy with automated tests.
4. Verify the relevant workspace in a real desktop and mobile browser, including keyboard navigation and RTL where supported.
5. Verify production and preview API integration, authorization, budget/rate limits, logging privacy and deployment secrets without exposing secret values.
6. Verify rollback and legacy compatibility; do not remove existing working flows or redirect standalone domains without explicit approval.

## Current blocker matrix
| Scope | Code-verified state | Remaining gate |
| --- | --- | --- |
| VUECORE shared framework | Registry and shared domain abstractions exist | Browser integration, API reliability, security and release smoke tests |
| ANYVUE | Native adapter calls `/api/anyvue` | End-to-end browser/API validation |
| ANIVUE | Native text/photo adapters and deterministic emergency checks | Standalone parity, browser/mobile/accessibility, clinical review, photo format/size policy |
| MEDIVUE, ESTATEVUE, WARDROBEVUE, ANTIQVUE, VINYLVUE, MUSICGEARVUE, MOTOVUE, HOMEVUE, PLANTVUE, ARMVUE, FOODVUE, SLUMPVUE | Specialist guidance registered; no dedicated assessment adapter in `core/domain-registry.js` | Implement and test specialist assessment contracts, or explicitly scope these as guided generic routing only |

## Release policy
Merge ordinary reviewed changes only after VUE CORE and VUEGUARD tests pass; verify Vercel production READY. Do not assert all VUEs production-ready until the matrix is cleared with recorded evidence. Do not change standalone ANIVUE DNS or delete the standalone app as part of routine releases.
