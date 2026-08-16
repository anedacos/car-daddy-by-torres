# CarDaddy Free Beta Dispatch

## Active channel policy

The beta uses only:

- Email for external verification, confirmations, opportunities, and follow-up.
- Portal notifications for authenticated operational activity.

SMS, Twilio, paid WhatsApp, paid push, online payments, deposits, and advance fees are disabled. The channel policy lives in application code and `platform_settings`, so a future channel can be added without rewriting case workflows.

## Implemented foundation

- Customer and provider email is required and validated.
- New submissions create an email verification record with a cryptographically random token, SHA-256 token storage, 24-hour expiration, one-time verification, five-minute resend cooldown, and five-send maximum.
- Confirmation emails are written to `email_outbox` in the same database transaction as the case or provider application.
- Outbox rows use a unique deduplication key and explicit Pending, Processing, Sent, Failed, or Canceled states.
- The public verification route is `/verificar-correo` with a Spanish-prefixed equivalent.
- Customer cases and provider reviews expose verification status to administrators.
- Source and campaign query parameters are stored on service cases.
- Advance-payment requests are serious incidents and create `ADVANCE_PAYMENT_REQUEST` case events.

## Delivery boundary

`EmailNotificationProvider` is the only external notification implementation enabled in the beta. The database outbox is provider-neutral. A server-side worker will claim Pending rows, render bilingual templates, call the configured free email API, and record the provider message ID or failure without duplicating delivery.

The repository does not contain an email API key. Production delivery remains disabled in `platform_settings.email_delivery_provider` until a free sender account is connected and its secret is stored server-side. Browser code must never receive that secret.

## Next dispatch increments

1. Connect and verify the free email sender, then deploy the outbox worker.
2. Add server-side Turnstile and request throttling before public promotion.
3. Build deterministic matching and explainable configurable scores.
4. Add transactional provider offers with expiration and single-winner acceptance.
5. Add provider contact and arrival status events, exception alerts, and customer follow-up.

Every job must be idempotent. A retry cannot duplicate a case, verification message, offer, assignment, or follow-up email.
