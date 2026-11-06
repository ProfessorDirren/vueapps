# VUEFACTORY (prototype)

Creates **review-only** specialist drafts from one JSON definition, reusing VUECORE conventions. No paid APIs, AI calls, automatic registry edits, or deployment.

## Run

```sh
npm test
npm run factory:example
```

The example writes `vuefactory-output/generated/bookvue/` with a specialist profile, all seven labels, a machine-readable integration plan, reviewable registry/routing snippets, and a release checklist. Existing generated files are not overwritten. To generate another VUE:

```sh
node scripts/vuefactory.mjs path/to/definition.json another-output-directory
```

The input needs `id` (lowercase, ending in `vue`), `scope`, a substantive `method`, `labels` for `en`, `es`, `sv`, `hi`, `zh-CN`, `ru`, `ar`, optional HTTPS `sources`, and optional `routingKeywords` (2–30 literal keywords). Routing candidates are generated for review, not activated. The CLI also produces `existing-router-audit.json` by probing every proposed keyword against the actual current VUECORE router; ambiguous or non-ANYVUE results are flagged for review. This is a keyword-level heuristic, not a proof that all routing collisions are absent.

## Dry-run integration

`simulateVueIntegration(definition, question, routeQuestion)` exercises proposed BOOKVUE routing against the real VUECORE router without registering anything. Existing specialist decisions and clarifications take precedence; only ANYVUE fallbacks may be provisionally matched to the new specialist. The CLI also writes `integration-dry-run.json`, recording the proposed outcome for each candidate keyword. This is a simulation, not a production integration or an end-to-end API test.

## Isolated test registration

`createFactoryTestRegistry(definition, SPECIALISTS, routeQuestion)` builds an in-memory overlay that exposes `isRegistered`, `route`, and `guide` for a proposed specialist. It can test BOOKVUE without mutating the actual specialist registry, memory domains, API, or production router. The `createFactoryTestApi(registry)` helper additionally provides a Fetch-compatible `POST(Request)` test handler for real Request/Response contract tests, including language validation and malformed JSON. It is **not** persistent registration or a live API endpoint, and does not invoke the production follow-up/AI pipeline.

## Structured integration proposal

The generated `vuecore-change-proposal.json` enumerates proposed changes to the real specialist registry, seven-language specialist questions, router, UI labels, and API dispatch. It explicitly blocks production until localized questions, safety boundaries, routing precedence, and end-to-end tests have been reviewed. It is a machine-readable proposal, **not** an automatically applied patch.

## Not yet automatic

A human must review domain safety, routing collisions, translation quality, source trust, and test coverage. The factory currently **does not** edit the central VUECORE registry, API, or router; the integration plan names those required steps. A generated draft is **not** a production-ready specialist.

## Next milestone

Produce a reviewable integration patch for the central registry, memory domains, router, API, and localized UI, then test the complete route end-to-end. Keep manual approval for high-stakes domain safety and production release.

## Activation validation (PR #117)

`validateVueActivation(definition, existingIds, existingKeywords)` adds a stricter **opt-in** gate for candidates intended for VUECORE registration. It requires exactly three distinct, nonempty localized follow-up questions in each of the seven supported languages, checks for existing specialist IDs, and rejects exact routing keyword collisions. It is intentionally stricter than the draft generator, which remains backward-compatible.

`prepareVueActivation(definition, existingIds, existingKeywords)` returns a structured, reviewable manifest containing the profile, all seven labels and question arrays, and proposed registry/router edits. It **does not edit source files, register a specialist, update UI cards, run production API tests, merge, or deploy**. Exact keyword collision detection does not prove that different keywords are semantically distinct or that existing routing precedence is safe.

Before any apply workflow is introduced, require code-review of domain safety (including emergency-first behavior), route precedence, localized content, UI/API integration, and complete regression tests. No paid APIs or automatic deployment are authorized.

## Real-source routing regression coverage

`core/vuefactory.real-source.test.mjs` exercises the review-only source patch against the actual checked-in `core/specialists.js` and `core/router.js`, without writing to either file. It checks non-mutation, duplicate registration protection, existing ANIVUE and MARTIALARTSVUE precedence, preservation of ambiguous existing routes, and provisional matching only on ANYVUE fallback. The tests run via `npm test`.

**Release gate:** Passing these unit/regression tests does not certify production API dispatch, memory-domain registration, UI localization, semantic routing collisions, or emergency-first behavior. This PR remains a draft until those integration requirements are implemented and tested. Do not treat a generated source preview as an applied patch or deploy it automatically.
