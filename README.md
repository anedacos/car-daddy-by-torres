# Car Daddy By Torres

Professional bilingual website and lightweight business system for **Car Daddy By Torres / Car Daddy by Torres LLC**.

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
- Join Our Team form with resume/CV upload UI and Supabase Storage support when configured
- `/admin` MVP password gate using `VITE_ADMIN_PASSWORD`
- Admin dashboard for service requests, team applications, invoices, and settings
- Invoice/estimate/paid receipt builder with bilingual labels, line items, tax, print, browser PDF, email draft, and WhatsApp message
- Supabase-ready SQL schema in `supabase/schema.sql`
- Local media structure under `public/media`

## Local Setup

```bash
pnpm install
pnpm dev
```

Then open the local URL shown by Vite. The admin route is:

```text
/admin
```

If `VITE_ADMIN_PASSWORD` is not set, the local fallback password is `admin`. Do not deploy with that fallback.

## Environment Variables

Create `.env.local`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ADMIN_PASSWORD=use-a-strong-temporary-admin-password
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

MVP note: the SQL includes permissive anon policies so the browser admin can read/update data. Before production with sensitive data, replace this with Supabase Auth and role-based policies.

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
   - `VITE_ADMIN_PASSWORD`

## Contact and Social URLs

Business contact values live in `src/data/content.js`.

- Phone: `6088441166`
- WhatsApp: `6088441166`
- Email: `cardaddybytorres.llc@gmail.com`
- Facebook: `https://www.facebook.com/profile.php?id=61591725022520`
- Instagram placeholder: `ADD_INSTAGRAM_URL_HERE`

Replace `ADD_INSTAGRAM_URL_HERE` with the final Instagram URL before launch.

## Media

Website media is stored in:

```text
public/media/profile
public/media/cover
public/media/services
public/media/towing
public/media/team
public/media/invoices
public/media/stock_legal_downloaded
public/media/discarded
public/media/sources_and_licenses
```

This version uses local corrected business photos copied from:

```text
C:\Users\Minuto Creativo\Documents\Car Daddy Project\Fotos de mecanica corregidas
```

If downloaded stock assets are added later, document each file in `public/media/sources_and_licenses/media_sources.md` with source URL, platform, license type, download date, and reason used.

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

- Admin uses a simple password gate. Replace with Supabase Auth later.
- Browser-generated PDF uses `window.print()`. A server-side PDF generator can be added later for exact archived PDFs.
- Photo upload UI is present for service requests, but photo storage is not wired yet.
- Resume upload uses Supabase Storage only when Supabase is configured.
- Automatic email/SMS sending is not included.

## Future Upgrade Ideas

- Supabase Auth for admin users
- Better RLS policies with authenticated roles
- Server-generated PDFs
- Automatic email via Resend, SendGrid, or Mailgun
- SMS via Twilio
- Calendar/scheduling workflow
- Customer/job detail pages
- Media manager
- Domain and Cloudflare analytics

## Still Needed From Owner

- Final Instagram URL
- Final domain
- Final approved photos/videos
- Tax settings
- Mechanic names/signature preferences
- Production admin password
- Decision on when to enable Supabase Auth
