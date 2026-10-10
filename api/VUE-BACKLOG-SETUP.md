# Community backlog integration

The public backlog is `/vue-backlog.html`; its durable API is `/api/vue-backlog`.
It reuses the existing Upstash/KV credentials. No browser flag can grant paid voting.

## Current release

VINYLVUE is available immediately. The backlog can be browsed without an account.
Paid-member proposals and votes remain closed until the account and billing service is connected.
No demo users, memberships, proposals or vote counts are generated.

## Connect real paid accounts

1. Configure `VUE_MEMBER_SIGNING_SECRET` with at least 32 random characters, separately from other credentials.
2. After authenticated login, the account backend issues a `Secure; HttpOnly; SameSite=Lax; Path=/` cookie named `vue_member`.
   The value is `base64url(JSON.stringify(payload)) + '.' + base64url(HMAC_SHA256(secret, encodedPayload))`.
   Payload: `{ "iss": "vueapps", "aud": "vue-voting", "sub": "stable_opaque_account_id", "exp": unixSeconds }`.
   Account IDs must match `[A-Za-z0-9_-]{1,128}`. Issue only from a trusted server; never expose the signing secret to JavaScript.
3. The existing/future billing integration, after independently verifying payment-provider webhook signatures and events,
   stores `vue:member:<account_id>` in Redis as JSON `{ "status": "active", "paidUntil": unixMilliseconds }`.
   Cancellation/refund/revocation updates this ledger immediately; cookie claims alone never establish paid membership.
   Keep webhook processing idempotent. No payment provider or commercial plan was selected in this release.
4. Configure optional HTTPS `VUE_ACCOUNT_URL` for the sign-in/manage-account link.

Each write checks both the signed login session and the current paid ledger. Public GET exposes neither account IDs nor voter sets.

## Voting and proposals

`POST { "action": "propose", "name": "BOOKVUE", "description": "At least twenty characters..." }`
requires a verified paid account. Name uniqueness and the maximum of five new proposals per member per UTC day are atomic.
Existing VUEs cannot be proposed. Maximum backlog size is 200 proposals; review/archive policy can be added when needed.

`POST { "action": "vote", "id": "BOOKVUE" }` atomically toggles that account's one vote.
A repeated click withdraws a vote. Only `proposed` and `planned` items accept votes; released/building items remain visible.
Redis stores the public item hash `vue:backlog` and private voter sets `vue:voters:<id>`.
Public lists sort by descending votes then creation date. Popularity is input to review, not a promise to build.

## Manage delivery status

Configure a separate `VUE_BACKLOG_ADMIN_TOKEN` with at least 32 random characters.
A trusted admin client sends `Authorization: Bearer <token>` and
`POST { "action": "status", "id": "BOOKVUE", "status": "planned" }`.
Allowed statuses: `proposed`, `planned`, `building`, `released`. Paid membership does not grant administrator access.
Never put the admin token in the public frontend. No administration screen is shipped yet.

## Verification

Run `node --test core/*.test.mjs` for API/authentication/ledger/validation tests.
`python core/backlog-lua-check.py` executes the actual production Lua scripts against a deterministic Redis command stub
using system `liblua5.4`, checking distinct voters, withdrawal, closed stages, duplicates and daily limits.
This validates the mutation logic locally; it is not a real payment-provider or live-Redis integration test.
