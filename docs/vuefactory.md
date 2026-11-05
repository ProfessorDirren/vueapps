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

## Not yet automatic

A human must review domain safety, routing collisions, translation quality, source trust, and test coverage. The factory currently **does not** edit the central VUECORE registry, API, or router; the integration plan names those required steps. A generated draft is **not** a production-ready specialist.

## Next milestone

Produce a reviewable integration patch for the central registry, memory domains, router, API, and localized UI, then test the complete route end-to-end. Keep manual approval for high-stakes domain safety and production release.
