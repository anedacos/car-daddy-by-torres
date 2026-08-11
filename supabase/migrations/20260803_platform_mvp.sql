-- CarDaddy operational platform MVP.
-- Review in a separate Supabase branch/project before production use.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null,
  full_name text,
  role text not null check (role in ('admin', 'provider')),
  status text not null default 'Active' check (status in ('Active', 'Warned', 'Reduced priority', 'Suspended', 'Under investigation', 'Not eligible'))
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'Active'
  );
$$;

create table if not exists public.provider_applications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  retention_until timestamptz not null default (now() + interval '90 days'),
  full_name text not null,
  business_name text,
  phone text not null,
  email text not null,
  state text not null check (state in ('Mississippi', 'Louisiana', 'Alabama')),
  city text not null,
  zip_code text not null,
  max_travel_radius integer not null check (max_travel_radius between 1 and 300),
  languages text[] not null default '{}',
  years_experience integer not null default 0 check (years_experience between 0 and 80),
  specialties text[] not null default '{}',
  vehicle_types_served text[] not null default '{}',
  vehicle_types_not_served text[] not null default '{}',
  services_offered text[] not null default '{}',
  services_not_offered text[] not null default '{}',
  available_days text[] not null default '{}',
  availability_schedule jsonb not null default '{}'::jsonb,
  immediate_available boolean not null default false,
  scheduled_available boolean not null default true,
  availability_start_date date,
  night_available boolean not null default false,
  emergency_available boolean not null default false,
  all_day_available boolean not null default false,
  minimum_inspection_fee numeric(10,2),
  minimum_mobilization_fee numeric(10,2),
  payment_methods text[] not null default '{}',
  media_manifest jsonb not null default '[]'::jsonb,
  certifications_manifest jsonb not null default '[]'::jsonb,
  commercial_insurance_manifest jsonb not null default '[]'::jsonb,
  terms_accepted boolean not null default false,
  privacy_accepted boolean not null default false,
  independent_provider_acknowledged boolean not null default false,
  media_publicity_consent boolean not null default false,
  application_status text not null default 'Pending' check (application_status in ('Draft', 'Pending', 'Under review', 'More information requested', 'Approved', 'Rejected', 'Suspended', 'Not eligible')),
  account_status text not null default 'Active',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  decision_reason text,
  internal_notes text
);

create table if not exists public.provider_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  application_id uuid unique references public.provider_applications(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null,
  business_name text,
  phone text not null,
  email text not null,
  state text not null,
  city text not null,
  zip_code text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  max_travel_radius integer not null default 30,
  languages text[] not null default '{}',
  specialties text[] not null default '{}',
  vehicle_types_served text[] not null default '{}',
  vehicle_types_not_served text[] not null default '{}',
  services_offered text[] not null default '{}',
  services_not_offered text[] not null default '{}',
  availability_status text not null default 'Off duty' check (availability_status in ('Available', 'Busy', 'Off duty', 'Vacation')),
  availability_start_date date,
  emergency_available boolean not null default false,
  account_status text not null default 'Active',
  compliance_score numeric(6,2) not null default 0,
  rotation_position integer not null default 0,
  warning_count integer not null default 0,
  internal_notes text
);

create table if not exists public.provider_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time,
  end_time time,
  is_all_day boolean not null default false,
  unique(provider_id, day_of_week, start_time, end_time)
);

create table if not exists public.service_cases (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  case_number text not null unique,
  customer_name text not null,
  phone text not null,
  email text,
  state text not null check (state in ('Mississippi', 'Louisiana', 'Alabama')),
  city text not null,
  zip_code text not null,
  approximate_location text not null,
  latitude numeric(9,6),
  longitude numeric(9,6),
  vehicle_year text not null,
  vehicle_make text not null,
  vehicle_model text not null,
  vin text,
  vehicle_type text not null,
  fuel_type text not null,
  problem_description text not null,
  vehicle_starts text not null,
  vehicle_moves text not null,
  media_manifest jsonb not null default '[]'::jsonb,
  service_requested text not null,
  specialty_needed text,
  urgency text not null,
  preferred_date date,
  preferred_time text,
  preferred_language text not null,
  share_consent boolean not null default false,
  platform_notice_acknowledged boolean not null default false,
  contact_verified_at timestamptz,
  status text not null default 'Request received',
  assigned_provider_id uuid references public.provider_profiles(id),
  assigned_at timestamptz,
  estimated_arrival_at timestamptz,
  arrived_at timestamptz,
  completed_at timestamptz,
  result_summary text,
  internal_notes text
);

create table if not exists public.case_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid not null references public.service_cases(id) on delete cascade,
  event_type text not null,
  actor_id uuid references public.profiles(id),
  actor_role text not null default 'system',
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table if not exists public.case_candidates (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.service_cases(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  compatibility_score numeric(8,2) not null default 0,
  rank integer,
  reasons jsonb not null default '[]'::jsonb,
  status text not null default 'Candidate',
  unique(case_id, provider_id)
);

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid not null references public.service_cases(id) on delete cascade,
  provider_id uuid not null references public.provider_profiles(id) on delete cascade,
  status text not null default 'Offered' check (status in ('Offered', 'Accepted', 'Rejected', 'Expired', 'Canceled')),
  offered_at timestamptz not null default now(),
  expires_at timestamptz,
  responded_at timestamptz,
  response_notes text,
  customer_contact_released_at timestamptz,
  unique(case_id, provider_id, offered_at)
);

create table if not exists public.complaints (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  case_id uuid not null references public.service_cases(id) on delete cascade,
  case_number text not null,
  incident_type text not null,
  description text not null,
  requested_resolution text,
  media_manifest jsonb not null default '[]'::jsonb,
  severity text not null default 'Normal' check (severity in ('Normal', 'Serious', 'Critical')),
  status text not null default 'Open' check (status in ('Open', 'Under review', 'Awaiting evidence', 'Resolved', 'Closed')),
  provider_response text,
  internal_notes text,
  reviewed_by uuid references public.profiles(id),
  resolved_at timestamptz
);

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  case_id uuid unique not null references public.service_cases(id) on delete cascade,
  provider_contacted boolean,
  arrived_on_time boolean,
  price_explained boolean,
  service_completed boolean,
  rating smallint check (rating between 1 and 5),
  comments text
);

create table if not exists public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null,
  language text not null check (language in ('English', 'Spanish')),
  channel text not null default 'Internal',
  subject text,
  body text not null,
  is_active boolean not null default true,
  unique(template_key, language, channel)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  recipient_id uuid references public.profiles(id) on delete cascade,
  case_id uuid references public.service_cases(id) on delete cascade,
  template_key text not null,
  title text not null,
  body text not null,
  read_at timestamptz
);

create table if not exists public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  monthly_price numeric(10,2),
  free_period_days integer not null default 0,
  billing_enabled boolean not null default false,
  waive_without_qualified_opportunity boolean not null default false,
  is_active boolean not null default false
);

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  admin_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb not null default '{}'::jsonb
);

create index if not exists provider_location_idx on public.provider_profiles(state, city, zip_code);
create index if not exists provider_status_idx on public.provider_profiles(account_status, availability_status);
create index if not exists case_location_idx on public.service_cases(state, city, zip_code);
create index if not exists case_status_idx on public.service_cases(status, created_at desc);
create index if not exists case_events_case_idx on public.case_events(case_id, occurred_at desc);
create index if not exists complaint_status_idx on public.complaints(status, severity, created_at desc);

create or replace function public.new_case_number()
returns text
language sql
volatile
as $$
  select 'CD-' || to_char(now() at time zone 'UTC', 'YYYYMMDD') || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 6));
$$;

create or replace function public.submit_provider_application(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if coalesce(p_payload->>'full_name', '') = '' or coalesce(p_payload->>'phone', '') = '' or coalesce(p_payload->>'email', '') = '' then
    raise exception 'Missing required provider information';
  end if;
  if p_payload->>'state' not in ('Mississippi', 'Louisiana', 'Alabama') then
    raise exception 'Unsupported launch state';
  end if;
  if coalesce((p_payload->>'terms_accepted')::boolean, false) is not true
    or coalesce((p_payload->>'privacy_accepted')::boolean, false) is not true
    or coalesce((p_payload->>'independent_provider_acknowledged')::boolean, false) is not true then
    raise exception 'Required acknowledgements were not accepted';
  end if;

  insert into public.provider_applications (
    full_name, business_name, phone, email, state, city, zip_code, max_travel_radius,
    languages, years_experience, specialties, vehicle_types_served, vehicle_types_not_served,
    services_offered, services_not_offered, available_days, availability_schedule,
    immediate_available, scheduled_available, availability_start_date, night_available, emergency_available, all_day_available,
    minimum_inspection_fee, minimum_mobilization_fee, payment_methods, media_manifest,
    certifications_manifest, commercial_insurance_manifest, terms_accepted, privacy_accepted,
    independent_provider_acknowledged, media_publicity_consent
  ) values (
    p_payload->>'full_name', nullif(p_payload->>'business_name', ''), p_payload->>'phone', lower(p_payload->>'email'),
    p_payload->>'state', p_payload->>'city', p_payload->>'zip_code', (p_payload->>'max_travel_radius')::integer,
    array(select jsonb_array_elements_text(coalesce(p_payload->'languages', '[]'::jsonb))),
    coalesce((p_payload->>'years_experience')::integer, 0),
    array(select jsonb_array_elements_text(coalesce(p_payload->'specialties', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_payload->'vehicle_types_served', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_payload->'vehicle_types_not_served', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_payload->'services_offered', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_payload->'services_not_offered', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_payload->'available_days', '[]'::jsonb))),
    coalesce(p_payload->'availability_schedule', '{}'::jsonb),
    coalesce((p_payload->>'immediate_available')::boolean, false), coalesce((p_payload->>'scheduled_available')::boolean, true),
    nullif(p_payload->>'availability_start_date', '')::date,
    coalesce((p_payload->>'night_available')::boolean, false), coalesce((p_payload->>'emergency_available')::boolean, false),
    coalesce((p_payload->>'all_day_available')::boolean, false), nullif(p_payload->>'minimum_inspection_fee', '')::numeric,
    nullif(p_payload->>'minimum_mobilization_fee', '')::numeric,
    array(select jsonb_array_elements_text(coalesce(p_payload->'payment_methods', '[]'::jsonb))),
    coalesce(p_payload->'media_manifest', '[]'::jsonb), coalesce(p_payload->'certifications_manifest', '[]'::jsonb),
    coalesce(p_payload->'commercial_insurance_manifest', '[]'::jsonb), true, true, true,
    coalesce((p_payload->>'media_publicity_consent')::boolean, false)
  ) returning id into new_id;
  return jsonb_build_object('id', new_id, 'application_status', 'Pending');
end;
$$;

create or replace function public.submit_service_case(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  new_number text := public.new_case_number();
begin
  if coalesce(p_payload->>'customer_name', '') = '' or coalesce(p_payload->>'phone', '') = ''
    or coalesce(p_payload->>'problem_description', '') = '' then
    raise exception 'Missing required service request information';
  end if;
  if coalesce((p_payload->>'share_consent')::boolean, false) is not true
    or coalesce((p_payload->>'platform_notice_acknowledged')::boolean, false) is not true then
    raise exception 'Required consent was not accepted';
  end if;

  insert into public.service_cases (
    case_number, customer_name, phone, email, state, city, zip_code, approximate_location,
    vehicle_year, vehicle_make, vehicle_model, vin, vehicle_type, fuel_type, problem_description,
    vehicle_starts, vehicle_moves, media_manifest, service_requested, specialty_needed, urgency,
    preferred_date, preferred_time, preferred_language, share_consent, platform_notice_acknowledged
  ) values (
    new_number, p_payload->>'customer_name', p_payload->>'phone', nullif(lower(p_payload->>'email'), ''),
    p_payload->>'state', p_payload->>'city', p_payload->>'zip_code', p_payload->>'approximate_location',
    p_payload->>'vehicle_year', p_payload->>'vehicle_make', p_payload->>'vehicle_model', nullif(p_payload->>'vin', ''),
    p_payload->>'vehicle_type', p_payload->>'fuel_type', p_payload->>'problem_description',
    p_payload->>'vehicle_starts', p_payload->>'vehicle_moves', coalesce(p_payload->'media_manifest', '[]'::jsonb),
    p_payload->>'service_requested', nullif(p_payload->>'specialty_needed', ''), p_payload->>'urgency',
    nullif(p_payload->>'preferred_date', '')::date, nullif(p_payload->>'preferred_time', ''),
    p_payload->>'preferred_language', true, true
  ) returning id into new_id;

  insert into public.case_events(case_id, event_type, actor_role, notes)
  values (new_id, 'request_received', 'customer', 'Public service request submitted.');
  return jsonb_build_object('id', new_id, 'case_number', new_number, 'status', 'Request received');
end;
$$;

create or replace function public.verify_case_identity(p_case_number text, p_phone text, p_email text default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.service_cases c
    where upper(c.case_number) = upper(trim(p_case_number))
      and regexp_replace(c.phone, '\\D', '', 'g') = regexp_replace(p_phone, '\\D', '', 'g')
      and (c.email is null or (p_email is not null and lower(c.email) = lower(trim(p_email))))
  );
$$;

create or replace function public.submit_case_complaint(p_case_number text, p_phone text, p_email text, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_case uuid;
  new_id uuid;
  severity_value text;
begin
  if not public.verify_case_identity(p_case_number, p_phone, p_email) then
    raise exception 'Case verification failed';
  end if;
  select id into target_case from public.service_cases where upper(case_number) = upper(trim(p_case_number));
  severity_value := case when p_payload->>'incident_type' in ('Fraud', 'Safety') then 'Serious' else 'Normal' end;
  insert into public.complaints(case_id, case_number, incident_type, description, requested_resolution, media_manifest, severity)
  values (target_case, upper(trim(p_case_number)), p_payload->>'incident_type', p_payload->>'description',
    nullif(p_payload->>'requested_resolution', ''), coalesce(p_payload->'media_manifest', '[]'::jsonb), severity_value)
  returning id into new_id;
  insert into public.case_events(case_id, event_type, actor_role, notes)
  values (target_case, 'complaint_received', 'customer', 'A customer complaint was submitted.');
  return jsonb_build_object('id', new_id, 'status', 'Open');
end;
$$;

create or replace function public.admin_review_provider(p_application_id uuid, p_status text, p_note text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_status not in ('Draft', 'Pending', 'Under review', 'More information requested', 'Approved', 'Rejected', 'Suspended', 'Not eligible') then
    raise exception 'Invalid provider application status';
  end if;
  update public.provider_applications
  set application_status = p_status, internal_notes = p_note, reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = p_application_id;
  if p_status = 'Approved' then
    insert into public.provider_profiles (
      application_id, full_name, business_name, phone, email, state, city, zip_code,
      max_travel_radius, languages, specialties, vehicle_types_served, vehicle_types_not_served,
      services_offered, services_not_offered, availability_start_date, emergency_available, account_status
    )
    select id, full_name, business_name, phone, email, state, city, zip_code,
      max_travel_radius, languages, specialties, vehicle_types_served, vehicle_types_not_served,
      services_offered, services_not_offered, availability_start_date, emergency_available, 'Active'
    from public.provider_applications where id = p_application_id
    on conflict (application_id) do update set
      full_name = excluded.full_name, business_name = excluded.business_name,
      phone = excluded.phone, email = excluded.email, state = excluded.state,
      city = excluded.city, zip_code = excluded.zip_code, max_travel_radius = excluded.max_travel_radius,
      languages = excluded.languages, specialties = excluded.specialties,
      vehicle_types_served = excluded.vehicle_types_served,
      vehicle_types_not_served = excluded.vehicle_types_not_served,
      services_offered = excluded.services_offered, services_not_offered = excluded.services_not_offered,
      availability_start_date = excluded.availability_start_date,
      emergency_available = excluded.emergency_available, updated_at = now();
  end if;
  insert into public.admin_actions(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'provider.reviewed', 'provider_application', p_application_id, jsonb_build_object('status', p_status));
  return jsonb_build_object('id', p_application_id, 'application_status', p_status);
end;
$$;

create or replace function public.admin_assign_case(p_case_id uuid, p_provider_id uuid, p_notes text default '')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if not exists (select 1 from public.provider_profiles where id = p_provider_id and account_status = 'Active') then
    raise exception 'Provider is not active';
  end if;
  update public.service_cases
  set assigned_provider_id = p_provider_id, assigned_at = now(), status = 'Provider assigned', updated_at = now()
  where id = p_case_id;
  insert into public.case_events(case_id, event_type, actor_id, actor_role, notes)
  values (p_case_id, 'provider_assigned', auth.uid(), 'admin', p_notes);
  insert into public.admin_actions(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'case.assigned', 'service_case', p_case_id, jsonb_build_object('provider_id', p_provider_id));
  return jsonb_build_object('id', p_case_id, 'status', 'Provider assigned', 'assigned_provider_id', p_provider_id);
end;
$$;

create or replace function public.admin_delete_provider_application(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  application_status_value text;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  select application_status into application_status_value
  from public.provider_applications
  where id = p_application_id;
  if application_status_value is null then raise exception 'Provider application not found'; end if;
  if application_status_value not in ('Rejected', 'Not eligible') then
    raise exception 'Reject the application before permanent deletion';
  end if;
  if exists (select 1 from public.provider_profiles where application_id = p_application_id) then
    raise exception 'Approved provider profiles must be archived through the provider-account workflow';
  end if;
  insert into public.admin_actions(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'provider_application.deleted', 'provider_application', p_application_id,
    jsonb_build_object('previous_status', application_status_value));
  delete from public.provider_applications where id = p_application_id;
  return jsonb_build_object('id', p_application_id, 'deleted', true);
end;
$$;

alter table public.profiles enable row level security;
alter table public.provider_applications enable row level security;
alter table public.provider_profiles enable row level security;
alter table public.provider_availability enable row level security;
alter table public.service_cases enable row level security;
alter table public.case_events enable row level security;
alter table public.case_candidates enable row level security;
alter table public.opportunities enable row level security;
alter table public.complaints enable row level security;
alter table public.ratings enable row level security;
alter table public.notification_templates enable row level security;
alter table public.notifications enable row level security;
alter table public.platform_settings enable row level security;
alter table public.membership_plans enable row level security;
alter table public.admin_actions enable row level security;

create policy "profiles own read" on public.profiles for select to authenticated using (id = auth.uid() or public.is_admin());
create policy "admin provider applications" on public.provider_applications for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin service cases" on public.service_cases for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin case events" on public.case_events for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin complaints" on public.complaints for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin candidates" on public.case_candidates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin settings" on public.platform_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin plans" on public.membership_plans for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin templates" on public.notification_templates for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin actions read" on public.admin_actions for select to authenticated using (public.is_admin());
create policy "admin actions insert" on public.admin_actions for insert to authenticated with check (public.is_admin());

create policy "provider own profile" on public.provider_profiles for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "provider update own profile" on public.provider_profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "provider own availability" on public.provider_availability for all to authenticated
  using (exists (select 1 from public.provider_profiles p where p.id = provider_id and (p.user_id = auth.uid() or public.is_admin())))
  with check (exists (select 1 from public.provider_profiles p where p.id = provider_id and (p.user_id = auth.uid() or public.is_admin())));
create policy "provider own opportunities" on public.opportunities for select to authenticated
  using (exists (select 1 from public.provider_profiles p where p.id = provider_id and p.user_id = auth.uid()) or public.is_admin());
create policy "provider update own opportunities" on public.opportunities for update to authenticated
  using (exists (select 1 from public.provider_profiles p where p.id = provider_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.provider_profiles p where p.id = provider_id and p.user_id = auth.uid()));
create policy "recipient notifications" on public.notifications for select to authenticated using (recipient_id = auth.uid() or public.is_admin());

-- Remove the original anonymous admin access while preserving public intake inserts.
drop policy if exists "MVP admin read service requests" on public.service_requests;
drop policy if exists "MVP admin update service requests" on public.service_requests;
drop policy if exists "MVP admin read applications" on public.team_applications;
drop policy if exists "MVP admin update applications" on public.team_applications;
drop policy if exists "MVP admin invoice access" on public.invoices;
drop policy if exists "MVP admin invoice item access" on public.invoice_items;
drop policy if exists "MVP admin media asset access" on public.media_assets;

create policy "authenticated admin legacy service requests" on public.service_requests for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "authenticated admin legacy applications" on public.team_applications for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "authenticated admin invoices" on public.invoices for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "authenticated admin invoice items" on public.invoice_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "authenticated admin media assets" on public.media_assets for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant execute on function public.submit_provider_application(jsonb) to anon, authenticated;
grant execute on function public.submit_service_case(jsonb) to anon, authenticated;
grant execute on function public.verify_case_identity(text, text, text) to anon, authenticated;
grant execute on function public.submit_case_complaint(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.admin_review_provider(uuid, text, text) to authenticated;
grant execute on function public.admin_assign_case(uuid, uuid, text) to authenticated;
grant execute on function public.admin_delete_provider_application(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('provider-private', 'provider-private', false, 209715200, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm','application/pdf']),
  ('case-private', 'case-private', false, 209715200, array['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'])
on conflict (id) do update set public = false;

update storage.buckets set public = false where id = 'team-resumes';

create policy "anonymous provider intake upload" on storage.objects for insert to anon
  with check (bucket_id = 'provider-private' and (storage.foldername(name))[1] = 'provider-intake');
create policy "anonymous case intake upload" on storage.objects for insert to anon
  with check (bucket_id = 'case-private' and (storage.foldername(name))[1] in ('case-intake', 'complaint-intake'));
create policy "admin private file read" on storage.objects for select to authenticated
  using (bucket_id in ('provider-private', 'case-private') and public.is_admin());
create policy "admin private file delete" on storage.objects for delete to authenticated
  using (bucket_id in ('provider-private', 'case-private') and public.is_admin());

insert into public.platform_settings(key, value) values
  ('assignment_response_minutes', '{"value":15}'::jsonb),
  ('customer_contact_window_minutes', '{"min":30,"max":60}'::jsonb),
  ('provider_application_retention_days', '{"value":90}'::jsonb),
  ('membership_beta', '{"enabled":true,"billing_enabled":false,"free_period_days":60}'::jsonb)
on conflict (key) do nothing;

insert into public.notification_templates(template_key, language, body) values
  ('request_received', 'English', 'Your CarDaddy request {{case_number}} was received.'),
  ('request_received', 'Spanish', 'Recibimos tu solicitud de CarDaddy {{case_number}}.'),
  ('provider_application_received', 'English', 'Your CarDaddy network application was received for review.'),
  ('provider_application_received', 'Spanish', 'Recibimos tu solicitud para la red CarDaddy.'),
  ('opportunity_available', 'English', 'A compatible opportunity is available in your provider portal.'),
  ('opportunity_available', 'Spanish', 'Hay una oportunidad compatible disponible en tu portal.'),
  ('complaint_received', 'English', 'Your report was received and is under review.'),
  ('complaint_received', 'Spanish', 'Recibimos tu reporte y esta en revision.')
on conflict (template_key, language, channel) do nothing;
