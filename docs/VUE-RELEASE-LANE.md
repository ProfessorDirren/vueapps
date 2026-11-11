# VUEFACTORY — zero-cost release lane

Goal: Dirren names a new VUE; Gandalf implements it, runs automated checks and only then requests the minimum necessary Vercel deployments.

## Build/test loop (zero Vercel builds)

1. Implement on a feature branch. Keep specialist IDs stable; add the VUE to VUECORE registry, routing, localization and any API handlers.
2. Push commits to the PR. GitHub Actions runs the **whole fleet gate** automatically; superseded VUE CORE runs are cancelled.
3. Locally or in CI, run `npm run vue:check -- --all` for all registered VUEs. For a specific new specialist, run `npm run vue:check -- <id> "<real routing question>"`.
4. Add domain-specific safety/API tests for each new specialist; the common gate alone does **not** prove specialist-specific correctness.
5. Fix failures in GitHub, not by repeatedly deploying to Vercel.

## Release lane (minimum Vercel use)

1. Wait for VUE CORE and VUEGUARD to pass on the **same final commit**.
2. Consolidate changes into a single release candidate. Avoid automatic preview builds on each commit.
3. Re-enable Preview only when required, build **one** candidate, and run real browser/API smoke tests against that exact deployment.
4. If Preview fails, return to the zero-Vercel GitHub test loop before spending another build.
5. Only release to production after successful Preview verification and explicit release authorization. Check Vercel's free-tier limits before any deployment.
6. Restore the preview-suppression setting afterward if needed.

No paid services, no automatic production deployment, and no claim of production readiness solely from offline tests.
