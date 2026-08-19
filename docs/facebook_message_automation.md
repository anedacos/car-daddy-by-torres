# Facebook Messenger intent automation

Car Daddy uses two coordinated layers:

1. Meta Business Suite sends the approved short welcome once at the beginning of a new conversation.
2. The Cloudflare Pages Function at `/api/facebook-webhook` classifies each incoming text and sends the appropriate English or Spanish response.

The intent engine is deterministic and does not require a paid AI service. It recognizes service requests, coverage questions, provider interest, general information, and unclear messages. It verifies Meta's `X-Hub-Signature-256` signature, ignores message echoes, supports opt-out language, and can deduplicate message IDs for seven days through an optional Cloudflare KV binding named `FACEBOOK_MESSAGE_EVENTS`.

## Meta connection

Create or select a Meta app that owns the Messenger integration for the Car Daddy By Torres Page. Configure its Page webhook callback as:

```text
https://car-daddy-by-torres.pages.dev/api/facebook-webhook
```

Subscribe the Page to the `messages` webhook field. Use a private random verification token and configure the same value as `FACEBOOK_VERIFY_TOKEN` in Cloudflare Pages.

## Cloudflare secrets

Configure these server-side variables for both Production and Preview where needed:

```text
FACEBOOK_VERIFY_TOKEN
FACEBOOK_PAGE_ACCESS_TOKEN
FACEBOOK_APP_SECRET
FACEBOOK_GRAPH_API_VERSION=v26.0
FACEBOOK_WEBHOOK_SEND_WELCOME=false
```

Do not prefix these names with `VITE_`. Vite variables are public browser code; Messenger credentials must remain server-side secrets.

For webhook retry deduplication, create a free Cloudflare KV namespace and bind it to the Pages project as `FACEBOOK_MESSAGE_EVENTS`. The endpoint still works without KV, but Meta retries could otherwise produce a duplicate reply.

Keep `FACEBOOK_WEBHOOK_SEND_WELCOME=false` while the Business Suite welcome is enabled. If the Business Suite welcome is later disabled, set it to `true` so the webhook sends the welcome before the intent response.

## Validation

Run:

```bash
pnpm test
pnpm build
```

Test from a non-admin Facebook account that has not blocked the Page. A new conversation should receive the welcome first. Natural-language messages such as `I have a 2015 Nissan that won't start`, `Soy mecánico y busco trabajo`, and `Do you have mechanics around Jackson?` should receive different responses and the appropriate Car Daddy link.
