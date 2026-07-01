create extension if not exists "pgcrypto";

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  preferred_language text not null,
  name text not null,
  phone text not null,
  email text,
  zip_code text not null,
  address_notes text,
  service_needed text not null,
  vehicle_type text not null,
  year text,
  make text,
  model text,
  engine_type text,
  issue_description text not null,
  urgency text not null,
  photo_urls text[] default '{}',
  status text not null default 'New',
  internal_notes text
);

create table if not exists public.team_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  preferred_language text not null,
  full_name text not null,
  phone text not null,
  email text not null,
  city_zip text,
  position_interest text not null,
  experience_summary text not null,
  skills text,
  has_tools text,
  has_transportation text,
  availability text,
  resume_url text,
  additional_notes text,
  status text not null default 'New',
  internal_notes text
);

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  invoice_number text not null unique,
  invoice_type text not null default 'Invoice',
  status text not null default 'Draft',
  preferred_language text not null default 'English',
  client_name text,
  client_address text,
  client_phone text,
  client_email text,
  mechanic_name text,
  business_name text,
  business_phone text,
  make text,
  model text,
  year text,
  miles text,
  hours text,
  job_description text,
  subtotal numeric(12,2) default 0,
  tax_rate numeric(6,3) default 0,
  tax_amount numeric(12,2) default 0,
  total numeric(12,2) default 0,
  payment_method text,
  signature_name text,
  notes text,
  items jsonb default '[]'::jsonb
);

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  category text not null default 'Other'
);

create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  file_name text not null,
  file_url text not null,
  asset_type text,
  source text,
  license text,
  notes text
);

alter table public.service_requests enable row level security;
alter table public.team_applications enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.media_assets enable row level security;

create policy "Allow anonymous service request inserts"
  on public.service_requests for insert
  to anon
  with check (true);

create policy "Allow anonymous team application inserts"
  on public.team_applications for insert
  to anon
  with check (true);

-- MVP admin reads/writes use the anon key from the browser.
-- Replace these policies with Supabase Auth before handling sensitive production data.
create policy "MVP admin read service requests"
  on public.service_requests for select
  to anon
  using (true);

create policy "MVP admin update service requests"
  on public.service_requests for update
  to anon
  using (true)
  with check (true);

create policy "MVP admin read applications"
  on public.team_applications for select
  to anon
  using (true);

create policy "MVP admin update applications"
  on public.team_applications for update
  to anon
  using (true)
  with check (true);

create policy "MVP admin invoice access"
  on public.invoices for all
  to anon
  using (true)
  with check (true);

create policy "MVP admin invoice item access"
  on public.invoice_items for all
  to anon
  using (true)
  with check (true);

create policy "MVP admin media asset access"
  on public.media_assets for all
  to anon
  using (true)
  with check (true);

insert into storage.buckets (id, name, public)
values ('team-resumes', 'team-resumes', true)
on conflict (id) do nothing;
