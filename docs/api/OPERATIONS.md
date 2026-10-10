# CORE-VUE API operations

Target: GitHub `ProfessorDirren/vueapps`, Vercel project `vueapps`, team `team-dirren`, production domain `www.vueapps.se`. Runtime remains Node.js 22; Vercel Functions are stateless. Existing VUE endpoints remain in place. v1 routes through one standalone Node Function using the `/api/v1/:path*` rewrite.

## Configure access

The existing deployment already has model/Redis configuration. Do not print or copy it into chat, code, logs or documentation. New API customer access needs a `CORE_API_KEYS` JSON registry in the intended Vercel environment. Missing/invalid configuration deliberately denies protected requests.

1. On a trusted operator machine, run `node scripts/core-api-key.mjs partner_demo 90`.
2. Deliver the generated secret privately to the integrating server operator. It is printed once and is not stored by the script. Put only the generated SHA-256 record in the registry.
3. Set `CORE_API_KEYS` to a JSON array of registry records using Vercel's environment-variable UI/CLI. Preserve existing active records. Configure Preview and Production separately; do not expose Production keys in Preview.
4. Redeploy the reviewed commit so the updated registry is loaded.
5. Verify `/api/v1/health` says `access_configured: true`, then perform a protected request/case lifecycle with a synthetic subject and delete the test case.

Example record (non-working illustrative hash):

```json
[{
  "sha256":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "tenant":"partner_demo",
  "scopes":["ask","cases"],
  "requests_per_minute":10,
  "requests_per_day":100,
  "enabled":true,
  "expires_at":"2027-01-01T00:00:00Z",
  "domains":["musicgearvue","vinylvue"]
}]
```

`domains` is optional; omitting it grants access to every registered lead domain. Scopes are `ask` and `cases`. Quotas must be identical across all records for the same tenant, including disabled records. Registry parsing fails closed on duplicates, malformed limits, unknown domains/scopes or inconsistent tenant limits. Dates are checked for expiry on every protected request. Keep registry size within platform environment limits; move credential management to an appropriate durable administration service when onboarding volume grows.

To rotate a key, issue a new random key for the **same tenant** with the same tenant quotas, enable it alongside the old one, move the client, then disable/remove the old record and redeploy. Revocation takes effect in deployments built with the new configuration; already running invocations may finish. A key is not an end-user authentication system.

## Configuration

| Variable | Purpose |
| --- | --- |
| `CORE_API_KEYS` | JSON array of hashed customer credentials/policies; required for protected v1 access |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Existing HTTPS Redis REST access |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Legacy-compatible Redis fallback when Upstash variables are absent |
| `OPENAI_API_KEY` | Existing model provider access; never exposed to API clients |
| `CORE_VUE_MODEL` | Optional model override; otherwise existing `ANTIQVUE_MODEL`/configured default is used |
| `ANTIQVUE_DAILY_MODEL_CALL_LIMIT` | Shared VUE model-call cap, defaults to 40; distinct from tenant request quotas |

Do not raise the shared model-call cap solely because a tenant request limit is larger. Establish approved capacity, cost expectations and monitoring first. No new paid storage/provider provisioning is needed for this framework.

## Data storage and concurrency

Redis keys are namespaced `core-api:v1:<SHA256 tenant>:subject:<SHA256 subject>:…`. Subjects and credentials are never stored raw in key names. Cases hold public questions, answers, fields and timestamps; images are not persisted. Replay records hold a request hash and response, not request bodies or images. They last 24 hours. Cases expire after 30 days from a successful update; reads do not refresh TTL. Quota counters expire automatically. Locks expire after 150 seconds and are released only by their owner.

Quota updates use an atomic Lua script. Case and success-replay commits use a compare-and-set Lua transaction. Deletion scrubs associated successful replay payloads into 410 tombstones. This protects privacy and prevents old case-creation retries from recreating a deleted case. The 30-day case/replay index lets deletion find recent success replays without scanning other tenants. Provider failures that contain no case content may remain in the response cache until expiry.

No platform can atomically commit an external model charge and a Redis write here. On a timeout/crash, use the same idempotency key and request to seek the original outcome. Do not promise exactly-once billing. Locks expire to restore availability; outcomes that were never committed may need operator review. Redis failure is fail-closed rather than a fallback to unisolated/in-process memory.

The integrating server is responsible for user authentication, subject mapping, lawful public-data submission and its own deletion/export policy. Application safeguards are not a legal compliance certification. Provider backups/logs have separate retention; deleting an application case is not a promise to erase every upstream copy.

## Verification before release

Run `npm test` (the existing suite plus API authentication, isolation, scopes, quotas, replay, concurrency, deletion, photo boundary, hierarchy and actual HTTP-client flow). Validate the OpenAPI JSON and examples. Verify the portal's photo button precedes free text, all seven languages and RTL remain usable, a failed analysis retains the image/question, and photo removal clears the in-memory data.

Check the production deployment actually serves:

- GET `/api/v1/health`, `/specialists`, `/tree` and `/docs/api/`.
- POST `/api/v1/ask` fails closed when the key registry is absent.
- With an issued Preview key: case creation → photo/text request → replay → read → delete → 404 read, plus a second tenant/subject rejection.
- A current urgent animal question bypasses photo classification and keeps emergency guidance dominant.
- A new image gets real visual processing rather than a text-only pretend observation.
- Existing `/api/vue-router`, `/api/vue-followup`, valuation readiness and MEDIVUE gates still work.

Vercel's green build status alone is insufficient. Confirm deployed code/contract and endpoint behaviour. Do not call a gated API "customer-ready" until a credential has been issued and the protected flow has been checked against the configured production storage/provider. The local HTTP tests use an injected test store/provider; they do not prove the production Redis credentials or model capacity.

## Observability and response handling

Logs contain request ID, operation name, method, status, duration and a truncated tenant hash. They omit authorization, subjects, queries, images, answers and case IDs. Locate failures by `X-Request-ID`. Do not log full request/response objects in a wrapper, proxy or SDK. Set alerts in the deployment's existing logging/monitoring system for 5xx, provider budget exhaustion and repeated 429; no external monitoring account is installed automatically.

On `api_not_configured`, check the intended environment's registry and redeploy. On `storage_unavailable`, inspect Redis availability/configuration without printing credentials. On `model_budget_reached`, inspect shared daily usage; retries may remain cached after a specialist attempt. On `case_specialist_mismatch`, start a separate case rather than disabling isolation. On `commit_failed`, preserve the request and idempotency key and investigate before starting a new provider request.

## Release and rollback

Publish only the reviewed task files over the current remote tree; this workspace can include unrelated prior edits. Use an expected-parent branch update to avoid overwriting another change. The existing Git integration builds the production main branch. Verify the Vercel commit status and live endpoints.

Rollback by reverting this change as a new Git commit through the same deployment path, or promote a previously verified production deployment with authorized operator access. Do not reset unrelated source changes. Revoking v1 registry entries disables customer access without removing browser VUE functionality. Stored cases retain their TTL unless explicitly deleted.

## Architecture references

Implementation follows the existing standalone Vercel Node Function shape and Redis REST adapter. Official references checked during implementation:

- https://vercel.com/docs/functions/runtimes/node-js
- https://vercel.com/docs/functions/limitations
- https://upstash.com/docs/redis/features/restapi
- https://developers.openai.com/api/docs/guides/images-vision
- https://developers.openai.com/api/docs/guides/structured-outputs

The framework's 120-second function and 4,250,000-byte JSON limits are its own configured limits, below the documented platform ceilings. No extra AI SDK/provider migration is required for this change; it preserves the existing Responses API integration and budget policy.
