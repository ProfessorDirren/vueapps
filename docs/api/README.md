# CORE-VUE HTTPS API v1

**Photo first → CORE-VUE → lead specialist → progressively narrower specialist methods.** Text-only questions and follow-ups use the same endpoint. This is a documented server-to-server integration framework, not an anonymous unlimited model endpoint.

Base URL: `https://www.vueapps.se/api/v1`. Version: **1.0.0**. Machine-readable contract: [openapi.json](./openapi.json). [Operations guide](./OPERATIONS.md). [JavaScript client](../../examples/vue-client.mjs). [Python client](../../examples/vue-client.py).

## Access and activation

The public health, specialist catalogue and tree need no API key. Protected endpoints require an operator-issued Bearer key. If the `CORE_API_KEYS` registry is absent or invalid, they return `503 api_not_configured` and make no model or storage calls. Deploying this framework does not issue keys or onboard customers automatically. A health response with `access_configured: true` checks the registry only; it is not a Redis/model readiness probe.

Credentials belong on the integrating application's server, never in browser JavaScript, a mobile app binary, a URL or a public repository. v1 intentionally has no permissive CORS or browser credential form. The integrating server must authenticate its own users and bind each to an opaque `X-VUE-Subject`; callers must never let end users select someone else's subject identifier.

## Endpoints

| Method | Path | Access | Behaviour |
| --- | --- | --- | --- |
| GET | `/health` | Public | Service version and access-configuration flag |
| GET | `/specialists` | Public | 14 lead domains, capabilities, methods and reference links |
| GET | `/tree` | Public | Registered hierarchy as a flat list; no fixed depth ceiling |
| POST | `/ask` | `ask` scope | Classify an optional current photo, select a specialist branch and answer |
| POST | `/cases` | `cases` scope | Create an explicit domain-scoped case |
| GET | `/cases/{id}` | `cases` scope | Read this tenant's and subject's case, fields and turns |
| DELETE | `/cases/{id}` | `cases` scope | Delete the case and scrub associated cached success responses |

Unknown routes return 404, unsupported methods 405. Query parameters are rejected. Requests and responses use JSON over HTTPS.

## Required headers

| Header | Requirement |
| --- | --- |
| `Authorization: Bearer vue_…` | Protected endpoints; key is random and only its SHA-256 hash is configured server-side |
| `X-VUE-Subject: usr_…` | Protected endpoints; stable opaque random identifier, 16–64 characters after `usr_` |
| `Content-Type: application/json` | POST requests |
| `Idempotency-Key: …` | POST and DELETE; 8–128 letters, digits, underscores or hyphens |

A tenant is assigned by the key registry, never by the request body. Key rotation preserves tenant quotas. Optional key-specific domain allowlists and scopes limit access. Subjects are isolated inside a tenant; different tenants are always isolated.

## First photo request

Supply a JPEG, PNG or WebP **base64 data URL**, not a remote URL. Decoded image size is limited to 3 MiB; dimensions must be at least 128×128, at most 8192 per side and at most 12 million pixels. PNG inputs must use 8-bit non-interlaced grayscale/RGB (optional alpha); uniform/empty PNGs are rejected. Convert unsupported PNG variants to JPEG. The portal also checks pixel variation before encoding its image. JPEG/WebP API inputs have format/dimension checks but no decoded-pixel variation check; this quality gate does not guarantee correct visual identification. Total JSON body is limited to 4,250,000 bytes. `image_public: true` confirms that the image contains no personal identifiers or private patient data. This declaration and the classifier's privacy check are safeguards, not a guarantee that every identifier will be detected; the caller is responsible for redaction before sending.

```json
{
  "image": "data:image/jpeg;base64,<base64 JPEG bytes>",
  "image_public": true,
  "question": "What can you tell me about this Marshall JMP amplifier?",
  "language": "en",
  "specialist": "auto"
}
```

With an image, `question` may be omitted. Without an image it is required (3–3000 characters). A new photo is classified independently of earlier case history. The selected lead must match any supplied `case_id`; otherwise the API returns `409 case_specialist_mismatch`, and the caller should create a separate case. An explicitly requested registered `specialist_path` or lead specialist bypasses image classification and sends the current photo directly to that specialist. An unclear image asks for clarification; an image flagged as private produces privacy guidance. Urgent animal symptoms in the current text bypass classification and return emergency guidance without waiting for the image model.

```bash
# Set VUE_API_KEY privately in your server environment. Do not paste it into docs.
curl --fail-with-body https://www.vueapps.se/api/v1/ask \
  -H "Authorization: Bearer $VUE_API_KEY" \
  -H 'X-VUE-Subject: usr_V7uZpa6Mk9Rj2NwQ4Tb8xL0c' \
  -H 'Idempotency-Key: request_demo_001' \
  -H 'Content-Type: application/json' \
  --data '{"question":"What details matter for my Marshall JMP with a Folkesson modification?","language":"en"}'
```

Example successful shape (the answer is illustrative):

```json
{
  "request_id": "e1338ce0-a838-41d3-b872-3243c2b1517a",
  "specialist": "musicgearvue",
  "sub_specialist": "amplifiers",
  "specialist_path": "corevue/musicgearvue/amplifiers/marshall/jmp/folkesson",
  "lineage": ["corevue", "corevue/musicgearvue", "corevue/musicgearvue/amplifiers", "corevue/musicgearvue/amplifiers/marshall", "corevue/musicgearvue/amplifiers/marshall/jmp", "corevue/musicgearvue/amplifiers/marshall/jmp/folkesson"],
  "case_id": null,
  "answer": "Please provide the modification version and relevant service documentation.",
  "kind": "ai_unverified",
  "image_analyzed": false,
  "verified": false,
  "requires_verification": true
}
```

`sub_specialist` is a convenience label for the first refinement. `specialist_path` and `lineage` describe the complete branch. Every descendant inherits the ancestor methods and narrows its focus. The framework uses iterative traversal and does not impose a fixed level count; the published registry is finite and only registered methods are selectable. More levels do not imply certification, new independent AI models or guaranteed accuracy. Ordinary payload and model-context limits still apply.

For ambiguous tasks, `kind: clarification`, `specialist: null` and `candidates` are returned. No specialist model is used for text ambiguity. `kind: safety_rule` is deterministic emergency guidance, not a fresh visual diagnosis. All v1 answers are independently unverified.

## Persistent case flow

1. POST `/cases` with `{"specialist":"homevue","title":"Air filter maintenance"}`. Save the returned case ID.
2. POST `/ask` with that `case_id` and the current question/photo. The server supplies only this subject's selected case history. Do not submit your own `history` array; it is rejected.
3. Continue using the same case ID only for the same item/animal/task. A specialist switch requires a separate case.
4. GET `/cases/{id}` to read the case. DELETE it to erase its stored questions, answers, fields and associated success replays.

The API does not silently create persistent cases. Without `case_id`, questions are answered without case continuity. The response replay cache still retains the answer for 24 hours; the raw request/photo is not retained there, only its hash and the response. For retained cases, questions and answers are stored explicitly in Redis for **30 days after the last successful update**, with a maximum of 100 turns and 35 public fields. GET does not extend retention. Earlier turns and AI answers remain fallible context, not evidence. Animal emergency caution persists in the case; use a new case for a different animal or event.

Case deletion replaces associated replay records with `410 case_deleted` tombstones containing no original case content. Replaying an old create or ask therefore cannot resurrect the deleted case. The DELETE response itself remains replayable. These policies describe application records, not deletion from provider logs/backups. No automatic GDPR-compliance claim is made. The browser portal's local memory and API Redis memory are separate; v1 does not sync them.

`fields` accepts up to 20 public string values per request, each at most 1200 characters. Identifiers, credentials, images and private patient fields are rejected. Do not use API cases to store private personal profiles.

## Retry and concurrency contract

Retain the **same idempotency key and exact request body** when a response is lost. Successes and specialist-attempt errors are replayed for 24 hours without another model call or request-quota debit. `Idempotency-Replayed: true` identifies a replay; the original request ID is preserved. Reusing a key with different input gives `409 idempotency_conflict`. Simultaneous identical requests give `409 request_in_progress`; simultaneous updates to one case give `409 case_busy`. Use `Retry-After` where present.

Errors before any specialist attempt (invalid input, access restrictions, request quota, busy case) are not cached. A cached provider error remains an error on replay; an operator or caller must decide whether a genuinely new attempt is appropriate. There is **no exactly-once guarantee across provider calls and storage**: a process crash, external timeout or Redis failure after model execution may leave an uncertain outcome. Do not automatically replace the idempotency key after a timeout or `commit_failed`; first retry the existing key, then escalate if no outcome can be established. Locks last 150 seconds; functions are configured for 120 seconds. The example clients wait up to 125 seconds and do not automatically retry.

## Quotas and cost

Per-tenant fixed UTC-minute and UTC-day request quotas are counted atomically in Redis. New authenticated reads/mutations count; successful replays do not. Rejected quota requests do not increment the counters. Successes include `X-RateLimit-Limit` and `X-RateLimit-Remaining`; quota errors include `Retry-After`.

There is also the existing **shared specialist model-call budget** (default 40/day, configured with `ANTIQVUE_DAILY_MODEL_CALL_LIMIT`). Photo auto-routing normally consumes one classification call plus one specialist call. Explicit specialist photo analysis consumes one. A text-only specialist answer normally consumes one. Local ambiguity, medical workflow guidance and deterministic emergency replies need no specialist model call. The shared budget also covers the existing VUE interfaces, so tenant request allowance does not guarantee model capacity. Failed/uncertain upstream calls may consume a model slot. This v1 has no payment metering, invoices or commercial SLA.

## Scope and verification

v1 supports current-photo observations and text continuity. It does not research fresh web prices or produce verified valuations. No photographic authenticity, personal diagnosis or hidden toxin identification is claimed. Catalogue reference links are starting points, not proof that those pages were checked for this answer.

MEDIVUE accepts public product guidance only in this endpoint and has no persistent cases. Actual medication leaflet evidence review stays in the confirmed MEDIVUE workspace; the API does not bypass its gates or create a medication/patient profile. Photos are not saved as pixels in API or portal case memory. `store:false` is used for model requests; this setting alone does not promise zero provider retention.

Current text routing is conservative keyword routing; uncertain input stays with the selected case specialist or ANYVUE, and tied domains ask for clarification. Image routing uses structured model output checked against the registered tree. The case boundary prevents silent domain mixing; it cannot prove that two questions concern the same object. Callers must start separate cases for separate objects.

## Error envelope

```json
{"error":{"code":"case_specialist_mismatch","message":"This question belongs to another specialist. Start a separate case or ask without case_id.","request_id":"<uuid>"}}
```

| HTTP | Typical codes | Caller action |
| --- | --- | --- |
| 400 | `invalid_request` | Correct fields, public-data confirmation or registered path |
| 401 | `unauthorized` | Supply a valid enabled unexpired key |
| 403 | `scope_denied`, `domain_denied` | Contact the key operator |
| 404 | `not_found` | Check endpoint/case ownership or expiry |
| 405 | `method_not_allowed` | Use the allowed method |
| 409 | `case_busy`, `request_in_progress`, `idempotency_conflict`, `case_specialist_mismatch`, `case_full` | Wait or correct the request/case; do not merge cases |
| 410 | `case_deleted` | An earlier case request was erased; start a new request |
| 413 / 415 | `request_too_large`, `unsupported_media_type` | Resize image/body; use JSON |
| 429 | `rate_limit`, `daily_limit`, `model_budget_reached` | Respect retry guidance and capacity limits |
| 502 | `specialist_unavailable`, `invalid_specialist_response`, `image_routing_unavailable` | Retain the same idempotency key for uncertain retries |
| 503 | `api_not_configured`, `storage_unavailable`, `commit_failed`, `specialist_unavailable` | Operator intervention/readiness check |
| 500 | `internal_error` | Quote request ID to the operator; never send secrets |

`X-Request-ID`, `X-VUE-API-Version`, `Cache-Control: no-store` and `X-Content-Type-Options: nosniff` are provided by the service. Platform-level errors/timeouts may have a different envelope.

## Extending the tree

Add a registered node in `core/specialist-tree.js` with its full `path`, direct `parent`, inherited lead `domain`, narrower `method` and optional literal `matches`. Parents must exist. Paths are unique, acyclic by construction and remain in the same lead domain. The registry, public tree, image-classification contract, returned lineage and inherited specialist prompt automatically include it. Add domain-specific examples and ambiguity/continuity regression checks before release. New lead domains additionally require their specialist profile, routing and source policy; merely naming a node does not make it a validated expert.

## Versioning

The `/v1` prefix is stable. Additive optional fields, new registered branches and new specialist IDs may appear within v1; clients must tolerate unknown response fields and refresh discovery. Breaking request/meaning changes require a new major path. Provider/model choices are internal and may change without altering the v1 HTTP contract.
