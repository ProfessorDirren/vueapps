# VUE architecture — inheritance and specialized adapters

VUE CORE defines reusable **contracts and orchestration**, not a universal diagnosis algorithm.

```
VueDomain (base class)
  ├── MotoVueDomain (implemented)
  ├── AniVueDomain (planned adapter for existing ANIVUE)
  └── Planning tools → shared calendar, record and recipe functions

VueFlow → emergencyCheck() first → assess() → normalized assessment
VueAnalysisAdapter → VueHttpAnalysisAdapter → same-origin /api/... serverless backend
```

## Current implementation status
- CORE contracts, emergency gate, media validation and MOTOVUE deterministic assessment are implemented.
- A generic same-origin HTTP AI client adapter exists, **but no MOTOVUE AI endpoint exists yet**. Do not claim MOTOVUE analyzes images or video.
- ANIVUE continues using its existing production OpenAI image adapter; it is not migrated.
- Server-side AI must validate file signatures/size, authenticate/limit abuse, enforce domain-specific structured outputs and keep API keys secret.
- AI outputs never override deterministic emergency rules.
- HOMEVUE, PLANTVUE, ARMVUE and FOODVUE now share a localized planning UI in `apps/`, backed by `core/planning.js`. These are working planning/calculation tools, not AI assessment adapters.
- The four tools accept local image/video references using CORE validation. Files are previewed only and released when the page closes; they are not persisted or analyzed.
- Plans and recipes persist locally. JSON export/restore, printable plans, and recipe shopping lists are supported. No cloud account or background reminders are provided.
- English is the initial default. Each app preserves an explicit language choice separately; all seven languages and Arabic RTL are supported.
- A versioned cross-repository package and AI adapters for the four new tools remain future work.

## ANIVUE reference inventory
- `src/multimodal.ts`: browser image upload → `/api/analyze-animal`, video placeholder, media limits.
- `src/vision.ts`: Zod vision schema and confidence fields.
- `api/analyze-animal.ts`: server-side OpenAI call, language and media validation.
- `src/horseTriage.ts`: horse emergency rules.
- `src/triagePilot.ts`: conservative low-risk UX pilot.

Migration must preserve ANIVUE's API schema, seven languages, animal safety priority, tests and public beta. Make it in a separate PR, not as an unreviewed deployment.
