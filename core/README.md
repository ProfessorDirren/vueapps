# VUE CORE v0.1

Shared **working** runtime contracts for VUE family applications. The first consumer is the MOTOVUE preview. **ANIVUE production is not migrated** and remains unchanged.

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
- No AI backend in VUE CORE; image and video can be attached/previewed, **neither is analyzed** in MOTOVUE.
- No shared React UI yet. ANIVUE uses React/Vite and has a separate working image-analysis server adapter.
- No cross-repository dependency, localization UI, accounts or persistence yet.
- Shared severity is an interface; domain-specific triage/safety rules must remain specialized and reviewed.
- Safety rules execute before the domain's normal assessment, and cannot be downgraded by that assessment.
- The MOTOVUE UI is an initial consumer; migrating ANIVUE requires a separate PR with regression tests.

## Testing
`node --test core/core.test.mjs` (Node 20+). No dependencies required.

## Planned ANIVUE migration
1. Extract adapters for ANIVUE's existing `src/multimodal.ts`, `src/vision.ts`, and emergency triage, preserving their existing schemas, tests, API and behavior.
2. Package/version CORE for both repositories; avoid fragile relative cross-repo imports.
3. Add regression tests for animal emergency flow, video placeholder and all seven languages.
4. Migrate behind feature flags; test Vercel Preview before production.
