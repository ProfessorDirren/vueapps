# VUECORE video integration contract (draft)

## Ownership
The VUECORE base layer owns file validation, consent, privacy, upload policy, media processing, language selection, cost controls and specialist routing. ANIVUE, MOTOVUE and all other specialist VUEs inherit the shared input component and provide only domain-specific prompts, safety rules and interpretation.

## Current behavior
- Record and choose video are local browser file pickers.
- MP4/WebM/MOV, at most 50 MiB, with local preview and removal.
- No video bytes are uploaded, analyzed, retained, or sent to a model.
- While a video is selected, text-only submission is blocked to prevent a misleading assessment.
- The API rejects video fields with HTTP 415.
- Seven UI languages are present; browser capture support varies by device.

## Requirements before enabling analysis
1. Design an explicit, user-visible consent step and data-retention policy.
2. Implement bounded local frame sampling with strict duration, resolution, and frame-count limits. Audio is excluded until separately reviewed.
3. Define a common, versioned media payload contract with server-side validation and no untrusted remote URLs.
4. Route validated observations through VUECORE to the specialist registry; specialist safety rules must run before any AI inference.
5. Implement an enforceable zero-new-cost budget policy, with the feature disabled unless the actual model/provider costs are explicitly approved.
6. Add integration tests, mobile capture tests, browser compatibility tests, privacy tests and regression tests for all seven languages.
7. Run tests and review PR before merge. Do not claim production readiness from static code inspection.

The default must remain **disabled** until these acceptance checks pass.
