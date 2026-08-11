# Car Daddy By Torres

Professional bilingual website and lightweight business system for **Car Daddy By Torres / Car Daddy by Torres LLC**.

## Resume This Project On Another Computer

This repository is the source of truth for the project. On a new Windows computer, install Git and Node.js LTS, then run:

```powershell
cd $HOME\Documents
git clone https://github.com/anedacos/car-daddy-by-torres.git
cd car-daddy-by-torres
corepack enable
pnpm install
Copy-Item .env.example .env.local
notepad .env.local
pnpm dev
```

Open the local URL printed by Vite. Secrets and production credentials are not stored in GitHub; obtain the Supabase values and admin password from the project owner and place them only in `.env.local`.

When asking Codex to continue this project on another computer, use:

```text
Clone anedacos/car-daddy-by-torres, read README.md completely, install the documented dependencies, create the local environment file from .env.example, and run the build before making changes. Never commit secrets or generated files.
```

Before starting new work, Codex should run `git status`, `git pull --ff-only`, `pnpm install`, and `pnpm build`. Production is updated from the `main` branch through Cloudflare Pages.

The site is built for a low-cost MVP stack:

- React + Vite
- Tailwind CSS
- Supabase Free Plan, optional at first
- Cloudflare Pages
- Browser print/PDF workflow for invoices

## Features

- English default route at `/`
- Spanish route at `/es`
- Visible `EN | ES` language switcher
- Landing page with hero, services, towing, service area, about, FAQ, contact, and privacy notice
- Service request form with consent, optional photos UI, local mock fallback, and WhatsApp backup link
- CarDaddy Network application with private evidence uploads and review workflow
- `/admin` authenticated with Supabase Auth plus role-based access in configured environments
- Admin dashboard for service requests, team applications, invoices, and settings
- Invoice/estimate/paid receipt builder with bilingual labels, line items, tax, print, browser PDF, email draft, and WhatsApp message
- Supabase-ready SQL schema in `supabase/schema.sql`
- Local media structure under `public/media`
- Phase 1 operational platform routes for service cases, independent-provider applications, complaints, and secure admin review

## Operational Platform MVP

The public marketing site remains the primary experience. Operational features are isolated under:

```text
/solicitar-servicio
/unete-a-la-red
/reportar-problema
/portal
/admin
```

Use `VITE_PLATFORM_MOCK_MODE=true` for local development with synthetic browser data. This prevents the app from reading or writing the configured Supabase project. The local admin fallback uses `VITE_ADMIN_PASSWORD` only while Vite is running in development mode.

Architecture, permissions, routes, risks, decisions, and production hardening work are documented in `docs/platform-architecture.md`. Draft legal copy for attorney review is in `docs/legal-drafts.md`.

## Local Setup

```bash
pnpm install
pnpm dev
```

Then open the local URL shown by Vite. The admin route is:

```text
/admin
```

In mock mode, `VITE_ADMIN_PASSWORD` is a development-only convenience. In any configured or deployed environment, `/admin` requires a Supabase Auth user whose `profiles.role` is `admin` or `super_admin`.

## Environment Variables

Create `.env.local`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_PLATFORM_MOCK_MODE=true
VITE_TURNSTILE_SITE_KEY=
# Development mock mode only; never configure this in Cloudflare Pages.
VITE_ADMIN_PASSWORD=use-a-local-test-password
```

If Supabase variables are missing, the app runs in mock/local mode and stores data in browser `localStorage`.

## Supabase Setup

1. Create a Supabase project on the free plan.
2. Open SQL Editor.
3. Run `supabase/schema.sql`.
4. Confirm these tables exist:
   - `service_requests`
   - `team_applications`
   - `invoices`
   - `invoice_items`
   - `media_assets`
5. Confirm the `team-resumes` Storage bucket exists.
6. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to `.env.local` and Cloudflare Pages.

Legacy note: `supabase/schema.sql` contains the original browser-admin policies. The operational migration removes those anonymous admin policies and replaces them with Supabase Auth and role-based RLS.

The operational migration is `supabase/migrations/20260803_platform_mvp.sql`. It was applied to the production Supabase project on August 11, 2026 and verified with an authenticated admin, private upload, signed download, rejection, and permanent deletion test. Apply future schema changes in a Supabase branch or isolated staging project before production.

## Quality Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Or run all three with `pnpm check`.

## Cloudflare Pages Deployment

1. Push this folder to GitHub.
2. In Cloudflare Pages, create a project from the repository.
3. Set build command:

```bash
npm run build
```

4. Set output folder:

```text
dist
```

5. Add environment variables in Cloudflare Pages:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_TURNSTILE_SITE_KEY` after the server-side verification endpoint is configured

Do not add `VITE_ADMIN_PASSWORD` to Cloudflare Pages. Variables prefixed with `VITE_` are bundled into client code; the local password fallback is disabled outside Vite development mode.

Production is deployed from GitHub `main` through Cloudflare Pages. After a commit is pushed to GitHub, Cloudflare builds and publishes the update automatically; no full redeployment from scratch is needed for normal website changes.

## Contact and Social URLs

Business contact values live in `src/data/content.js`.

- Phone: `6088441166`
- WhatsApp: `6088441166`
- Email: `cardaddybytorres.llc@gmail.com`
- Facebook: `https://www.facebook.com/profile.php?id=61591725022520`
- Instagram: `https://www.instagram.com/cardaddybytorres.llc/`

## Media

Website media is stored in:

```text
public/media/04_final_web
public/media/05_final_facebook
public/media/06_final_instagram
public/media/07_towing_remolque
public/media/08_servicios
public/media/09_hero_banner
public/media/10_logo_perfil
public/media/11_stock_legal_descargado
public/media/12_fuentes_y_licencias
```

This version uses local corrected business photos copied from:

```text
C:\Users\Minuto Creativo\Documents\Car Daddy Project\Fotos de mecanica corregidas
```

The current audit and usage decisions are documented in `media_audit_report.md`. Downloaded stock assets and license notes are documented in `public/media/12_fuentes_y_licencias/sources_and_licenses.md`.

Prepared, unpublished social copy is stored in `docs/social_content_plan.md`.

## Updating English / Spanish Text

All public copy is manually written in `src/data/content.js`. Do not use runtime Google Translate. Update both English and Spanish values together.

## Invoices

Open `/admin`, unlock the panel, then go to **Invoices / Receipts**.

Supported:

- Estimate
- Invoice
- Paid Receipt
- Draft / Sent / Paid / Canceled
- English or Spanish invoice labels
- Line items with categories for parts, labor, diagnostics, mobile service/travel fee, towing fee, shop supplies, fuel, cleaning consumables, parts sourcing/pickup, compatibility verification, and other
- Tax percentage
- Print button
- Download PDF through the browser print dialog
- Email draft link
- WhatsApp-ready message

No payment processing is included.

## MVP Limitations

- Production admin access requires Supabase Auth and an authorized `profiles` role; the local password fallback is mock-development only.
- Browser-generated PDF uses `window.print()`. A server-side PDF generator can be added later for exact archived PDFs.
- Operational provider and case uploads use private Supabase Storage buckets when configured; mock mode stores only synthetic file metadata locally.
- Automatic email/SMS sending is not included.

## Future Upgrade Ideas

- Provider portal authentication and self-service account management
- CAPTCHA verification, server-side rate limiting, malware scanning, and retention jobs
- Server-generated PDFs
- Automatic email via Resend, SendGrid, or Mailgun
- SMS via Twilio
- Calendar/scheduling workflow
- Customer/job detail pages
- Media manager
- Domain and Cloudflare analytics

## Still Needed From Owner

- Final domain
- Final approved photos/videos
- Tax settings
- Mechanic names/signature preferences
- Legal approval of the provider agreement, media permission, privacy, and retention language
- Decision on when to add server-verified Turnstile, automated retention jobs, and outbound notifications
