# CORE-VUE v0.2

Shared **working** runtime contracts for VUE family applications. The first consumer is the MOTOVUE preview. ANIVUE keeps its own image-analysis and safety flow while using the same CORE-VUE case memory.

## Core capabilities
- `VueDomain`: abstract domain contract (specialization through subclassing)
- `VueFlow`: validates requests, prioritizes deterministic emergency checks, normalizes output
- `validateMedia`: shared image/video MIME and byte limits (10 MB images; 50 MB videos)
- `normalizeAssessment`: consistent severity, recommendations, observations, questions and limitations
- `MotoVueDomain`: first concrete adapter with safe vehicle symptom guidance

## Contract
```js
import { VueFlow } from "./core/index.js";
import { MotoVueDomain } from "./core/motovue.js";
const flow = new VueFlow(new MotoVueDomain());
const result = await flow.run({
  category:"motorcycle", symptoms:["no-start"],
  description:"Starter clicks", media:[], language:"en"
});
```

## Current limitations
- MOTOVUE image/video attachments are previewed locally; they are not analyzed. CORE-VUE provides an explicit text follow-up endpoint with selected-case history.
- No shared React UI yet. ANIVUE uses React/Vite and has a separate working image-analysis server adapter.
- Case memory persists on the same browser/device, without accounts or cross-device sync. The shared toolbar supports seven languages; MEDIVUE memory remains session-only.
- Shared severity is an interface; domain-specific triage/safety rules must remain specialized and reviewed.
- Safety rules execute before the domain's normal assessment, and cannot be downgraded by that assessment.
- ANIVUE reuses the same memory modules as static public assets and server context helpers. Its existing clinical rules and image API remain specialized.

## Testing
`node --test core/core.test.mjs` (Node 20+). No dependencies required.

## Planned ANIVUE migration
1. Extract adapters for ANIVUE's existing `src/multimodal.ts`, `src/vision.ts`, and emergency triage, preserving their existing schemas, tests, API and behavior.
2. Package/version CORE for both repositories; avoid fragile relative cross-repo imports.
3. Add regression tests for animal emergency flow, video placeholder and all seven languages.
4. Migrate behind feature flags; test Vercel Preview before production.

## Memory

Use `VueMemory` from `index.js` with an explicitly injected storage object. Each specialist has separate named cases with owner fields, bounded question/answer history, resumption, export/import, deletion and pause controls. Historic AI answers are unverified context; current input and safety rules take precedence. Stored media, credentials and obvious identifiers are excluded.

The server public archive accepts only passages checked by specialist server source-verification flows. Archive entries contain public URLs, passages and check dates. Raw questions, private cases and AI answers are not shared archive material. Read and follow-up APIs fail gracefully when existing storage/model configuration is unavailable.
