# CarDaddy Operational Platform Architecture

Status: Phase 1 production pilot deployed with Supabase Auth, PostgreSQL/RLS, and private Storage. Public-scale hardening remains in progress.

## Repository Audit

### Current stack

- React 18 single-page application.
- Vite 5 build and development server.
- Plain CSS plus Tailwind directives and a small Tailwind theme.
- Supabase client for PostgreSQL and Storage.
- Cloudflare Pages hosting with SPA fallback through `public/_redirects`.
- No router package; route selection is based on `window.location.pathname`.
- No TypeScript or existing component/unit test framework.

### Current structure

- `src/main.jsx`: public site, videos, legacy forms, invoices, and legacy admin.
- `src/data/content.js`: bilingual public content and business contact data.
- `src/lib/storage.js`: Supabase/localStorage abstraction.
- `src/styles.css`: shared public and admin styles.
- `src/platform/`: isolated operational platform domain, pages, admin, fixtures, and storage.
- `supabase/schema.sql`: original low-security MVP schema.
- `supabase/migrations/20260803_platform_mvp.sql`: operational platform schema and secure policies.

### Existing limitations

- The original admin password is a frontend environment variable and is not secure for production.
- The original schema lets anonymous users read/update business records and uses a public resume bucket.
- The original service photo input was not wired to storage.
- The application is a large SPA and lacks a real router, server API, rate limiting, and transactional application logic.
- English and Spanish copy is maintained manually; several old strings should receive a dedicated encoding cleanup later.
- File uploads can be validated in the browser, but authoritative duration/content scanning requires server-side processing.

## Navigation Evaluation

The previous desktop navigation had nine links plus the language switch. It exposed `Admin` publicly and repeated links already available in page sections/footer. The least invasive change is six public choices:

1. Home.
2. Services.
3. Videos & Projects.
4. Request Service.
5. Join the Network.
6. Portal.

Towing, FAQ, and contact remain on the public page and in its footer. Operational controls never appear on the home page.

## Architecture Decision

Keep one repository, one brand, one React application, and one Supabase project initially. Add route-level modules rather than rebuilding the public site. Use Supabase Auth, PostgreSQL RLS, private Storage buckets, and narrowly scoped security-definer functions for public submissions. Add Edge Functions before broad public promotion for CAPTCHA verification, rate limiting, file scanning, and notification delivery.

A separate backend or `app.` subdomain is not required for Phase 1. A subdomain becomes useful if the provider portal grows into an independently deployed PWA, but it should consume the same backend and design system.

```mermaid
flowchart LR
  C[Guest customer] --> W[Existing CarDaddy site]
  P[Independent provider applicant] --> W
  W --> R[Public route forms]
  R --> F[Supabase RPC / future Edge Function]
  F --> DB[(PostgreSQL + RLS)]
  R --> S[(Private Storage)]
  A[Authenticated admin] --> AD[/admin operations]
  AD --> DB
  AD --> S
  PP[Approved provider portal - Phase 2] --> DB
  DB --> N[Internal notifications]
  N -. later .-> E[Email / SMS / push]
```

## User Flows

### Customer request

Customer completes contact/location, vehicle/problem, then schedule/consent. The system validates the submission, stores private media, creates a unique case number, records `request_received`, and displays confirmation. No provider receives full contact data until a later accepted opportunity flow.

### Provider application

Applicant completes contact/coverage, services, multiple daily time ranges, fees/payment methods, and private evidence. The submission enters `Pending`. Admin can request information, approve, reject, suspend, or mark it ineligible while keeping private notes and an audit record.

### Complaint

Customer verifies case number, phone, and email when one exists. The report and evidence are stored privately and appear in the admin queue. Fraud and safety reports receive serious severity for immediate review; this is triage, not an automatic finding.

### Manual assignment

Admin validates a case, reviews advisory compatible providers, selects one, records a private note, and assigns the case. Phase 1 does not notify anyone externally. Rejection is not penalized.

## Initial Data Model

| Area | Tables | Purpose |
| --- | --- | --- |
| Identity | `profiles` | Auth user role and account state. |
| Provider intake | `provider_applications` | Full application, review status, private evidence manifest. |
| Provider network | `provider_profiles`, `provider_availability` | Approved profile, coverage, schedule, availability, quality state. |
| Customer operations | `service_cases`, `case_events` | Case data, unique number, assignment and immutable timeline. |
| Matching | `case_candidates`, `opportunities` | Compatibility ranking and offer/response history. |
| Quality | `complaints`, `ratings` | Private incidents, responses, evidence, and customer feedback. |
| Communication | `notification_templates`, `notifications` | Editable bilingual internal notifications first. |
| Configuration | `platform_settings`, `membership_plans` | Configurable times, beta and future billing rules. |
| Governance | `admin_actions` | Administrative audit trail without sensitive log payloads. |

## Routes and Permissions

| Route | Access | Phase 1 behavior |
| --- | --- | --- |
| `/`, `/es` | Public | Existing commercial site preserved. |
| `/videos`, `/es/videos` | Public | Existing video library preserved. |
| `/solicitar-servicio` | Public | Bilingual multi-step customer request and case number. |
| `/unete-a-la-red` | Public | Bilingual independent-provider application. |
| `/reportar-problema` | Public after case verification | Private complaint submission. |
| `/portal` | Public gateway | Explains approval requirement; Phase 2 tools are not falsely enabled. |
| `/admin` | Authenticated active admin | Review, cases, assignment, complaints, legacy records, invoices. |

Spanish-prefixed equivalents are supported for all new public routes.

## Main Components

- `PlatformPage`, `PageIntro`, `WizardProgress`, and `PlatformNotice`.
- `ProviderApplicationPage`, `ServiceRequestPage`, `ReportProblemPage`, and `PortalPage`.
- `PlatformAdmin`, `ProviderReviews`, `CaseManagement`, `Complaints`, and `PrivateFiles`.
- Domain functions for case numbers, upload validation, qualification, contact masking, and compatibility ranking.

## Security and Privacy

- Admin production access requires Supabase Auth, an active `profiles.role = admin`, and RLS.
- Public writes use narrow RPCs; public table reads are not granted.
- Provider and case evidence use private buckets and five-minute signed URLs for authorized admins.
- Demonstration videos do not imply publicity consent and are never published automatically.
- Full customer contact information is modeled for release only after opportunity acceptance in Phase 2/3.
- Production still needs server-verified Turnstile, IP/account rate limits, malware scanning, video metadata validation, retention jobs, backup/restore tests, and incident response procedures.
- Logs and fixtures use synthetic `.test` identities only.

## Legal Review Checklist

Counsel licensed in Mississippi, followed by Louisiana and Alabama, should review independent-contractor classification, marketplace disclosures, state repair-estimate and warranty requirements, towing rules, commercial insurance expectations, privacy/retention, consent to share contact data, electronic communications, complaint handling, ratings, suspensions/appeals, payment disclaimers, taxes, and future membership billing.

## Delivery Phases

### Phase 1 - production pilot

- Provider application and private uploads.
- Admin review statuses and notes.
- Customer request with case number.
- Service cases, basic history, and manual assignment.
- Complaint verification and intake.
- Synthetic fixtures and domain tests.

### Phase 2

- Provider Auth onboarding after approval.
- Editable profile, coverage, availability status, opportunities, accept/reject, history, and outcome reporting.

### Phase 3

- Server-side geocoding/distance, configurable matching, fair rotation, expirations, notifications, contact SLA tracking, ratings, warnings, appeals, and suspensions.

### Phase 4

- Configurable free periods, metered qualified opportunities, test-mode billing, invoices, and billing reports. No fixed price in source code.

### Phase 5

- Nationwide configuration, PWA/mobile experience, push, external verification, and advanced analytics.

## Decision Record

- ADR-001: Keep the public site and operational platform in one repository for brand consistency and lower MVP overhead.
- ADR-002: Isolate new code under `src/platform` and new database objects in a dated migration.
- ADR-003: Use Supabase Auth/RLS/private Storage; retain password/localStorage only as an explicit development mock.
- ADR-004: Keep assignment manual in Phase 1; compatibility scoring is advisory and test-covered.
- ADR-005: Keep notifications internal and billing disabled until explicit configuration and legal/security review.

## Production Status

Completed for the limited pilot:

1. Applied the operational migration to production and verified required tables, RPCs, private buckets, and settings.
2. Created the first Supabase Auth administrator through a controlled dashboard/SQL process without exposing privileged keys in Vite.
3. Removed the original anonymous admin policies and replaced them with role-based RLS and private evidence access.
4. Completed an end-to-end production-backend test covering application submission, photos, video, signed admin access, rejection, and permanent deletion.

Required before broad public promotion:

1. Add Edge Functions for server-verified Turnstile, IP/account rate limiting, upload finalization, and transactional workflows.
2. Add malware scanning, automated retention/deletion, privacy export/deletion procedures, backups, monitoring, and alerts.
3. Complete accessibility, cross-browser, and end-to-end tests with a dedicated staging project.
4. Have all draft notices and agreements reviewed by counsel.
5. Configure real notification providers only after consent, templates, unsubscribe rules, and sender verification are approved.

Provider applications currently receive a 90-day retention date. Rejection does not delete evidence automatically; an authenticated administrator can permanently delete a rejected or ineligible application and its private Storage objects. Automated expiry remains disabled until the owner approves the final retention policy and legal counsel reviews it.

## Deferred Sharing Workflow

- Add branded short links only after the production domain is final.
- Generate prepared bilingual invitation messages for provider applications and customer service requests.
- Keep link creation and delivery separate: the system may prepare copy, but it must not send SMS, WhatsApp, email, or social messages automatically during the MVP.
- Record campaign/source parameters without placing customer or provider personal information in the URL.
