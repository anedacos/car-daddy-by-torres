-- Free beta communications: email + portal only, with a durable email outbox.

alter table public.provider_applications
  add column if not exists email_verification_status text not null default 'Pending'
    check (email_verification_status in ('Pending', 'Verified', 'Expired')),
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verified_at timestamptz;

alter table public.service_cases
  add column if not exists email_verification_status text not null default 'Pending'
    check (email_verification_status in ('Pending', 'Verified', 'Expired')),
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verified_at timestamptz,
  add column if not exists no_advance_payment_acknowledged boolean not null default false,
  add column if not exists source text,
  add column if not exists campaign text;

create table if not exists public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  entity_type text not null check (entity_type in ('service_case', 'provider_application')),
  entity_id uuid not null,
  case_id uuid references public.service_cases(id) on delete cascade,
  provider_application_id uuid references public.provider_applications(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  status text not null default 'Pending' check (status in ('Pending', 'Verified', 'Expired')),
  expires_at timestamptz not null,
  verified_at timestamptz,
  last_sent_at timestamptz not null default now(),
  send_count integer not null default 1 check (send_count between 1 and 5),
  check (
    (entity_type = 'service_case' and case_id = entity_id and provider_application_id is null)
    or (entity_type = 'provider_application' and provider_application_id = entity_id and case_id is null)
  ),
  unique(entity_type, entity_id)
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  channel text not null default 'Email',
  template_key text not null,
  recipient_email text not null,
  preferred_language text not null default 'English' check (preferred_language in ('English', 'Spanish')),
  case_id uuid references public.service_cases(id) on delete cascade,
  provider_application_id uuid references public.provider_applications(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'Pending' check (status in ('Pending', 'Processing', 'Sent', 'Failed', 'Canceled')),
  attempt_count integer not null default 0,
  sent_at timestamptz,
  last_error text,
  provider_message_id text,
  dedupe_key text not null unique
);

create index if not exists email_outbox_delivery_idx
  on public.email_outbox(status, available_at, created_at);
create index if not exists email_verifications_lookup_idx
  on public.email_verifications(status, expires_at);

alter table public.email_verifications enable row level security;
alter table public.email_outbox enable row level security;

drop policy if exists "admin email verifications" on public.email_verifications;
create policy "admin email verifications" on public.email_verifications
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin email outbox" on public.email_outbox;
create policy "admin email outbox" on public.email_outbox
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.queue_email_verification(
  p_entity_type text,
  p_entity_id uuid,
  p_email text,
  p_language text,
  p_template_key text,
  p_case_id uuid default null,
  p_provider_application_id uuid default null,
  p_context jsonb default '{}'::jsonb
)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  raw_token text := encode(gen_random_bytes(32), 'hex');
  token_digest text;
  verification_send_count integer;
  site_url text := 'https://car-daddy-by-torres.pages.dev';
begin
  if p_entity_type not in ('service_case', 'provider_application') then
    raise exception 'Unsupported verification entity';
  end if;
  if trim(p_email) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email address';
  end if;

  token_digest := encode(digest(raw_token, 'sha256'), 'hex');

  insert into public.email_verifications (
    entity_type, entity_id, case_id, provider_application_id, email, token_hash, status, expires_at, last_sent_at, send_count
  ) values (
    p_entity_type, p_entity_id, p_case_id, p_provider_application_id,
    lower(trim(p_email)), token_digest, 'Pending', now() + interval '24 hours', now(), 1
  )
  on conflict (entity_type, entity_id) do update set
    email = excluded.email,
    token_hash = excluded.token_hash,
    status = 'Pending',
    expires_at = excluded.expires_at,
    verified_at = null,
    last_sent_at = now(),
    send_count = least(public.email_verifications.send_count + 1, 5),
    updated_at = now()
  returning send_count into verification_send_count;

  insert into public.email_outbox (
    template_key, recipient_email, preferred_language, case_id, provider_application_id,
    payload, status, dedupe_key
  ) values (
    p_template_key,
    lower(trim(p_email)),
    case when p_language = 'Spanish' then 'Spanish' else 'English' end,
    p_case_id,
    p_provider_application_id,
    p_context || jsonb_build_object(
      'verification_url', site_url || '/verificar-correo?token=' || raw_token,
      'email', lower(trim(p_email))
    ),
    'Pending',
    p_entity_type || ':' || p_entity_id::text || ':verification:' || verification_send_count::text
  )
  on conflict (dedupe_key) do nothing;

  return 'Pending';
end;
$$;

revoke all on function public.queue_email_verification(text, uuid, text, text, text, uuid, uuid, jsonb) from public, anon, authenticated;

create or replace function public.verify_email_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  verification public.email_verifications%rowtype;
begin
  if length(coalesce(trim(p_token), '')) <> 64 then
    return jsonb_build_object('status', 'Invalid');
  end if;

  select * into verification
  from public.email_verifications
  where token_hash = encode(digest(trim(p_token), 'sha256'), 'hex')
  for update;

  if not found then
    return jsonb_build_object('status', 'Invalid');
  end if;
  if verification.status = 'Verified' then
    return jsonb_build_object('status', 'Verified', 'entity_type', verification.entity_type);
  end if;
  if verification.expires_at <= now() then
    update public.email_verifications set status = 'Expired', updated_at = now() where id = verification.id;
    if verification.entity_type = 'service_case' then
      update public.service_cases set email_verification_status = 'Expired', updated_at = now() where id = verification.entity_id;
    else
      update public.provider_applications set email_verification_status = 'Expired', updated_at = now() where id = verification.entity_id;
    end if;
    return jsonb_build_object('status', 'Expired', 'entity_type', verification.entity_type);
  end if;

  update public.email_verifications
  set status = 'Verified', verified_at = now(), updated_at = now()
  where id = verification.id;

  if verification.entity_type = 'service_case' then
    update public.service_cases
    set email_verification_status = 'Verified', email_verified = true, email_verified_at = now(), contact_verified_at = now(), updated_at = now()
    where id = verification.entity_id;
  else
    update public.provider_applications
    set email_verification_status = 'Verified', email_verified = true, email_verified_at = now(), updated_at = now()
    where id = verification.entity_id;
  end if;

  return jsonb_build_object('status', 'Verified', 'entity_type', verification.entity_type);
end;
$$;

grant execute on function public.verify_email_token(text) to anon, authenticated;

create or replace function public.resend_email_verification(p_entity_type text, p_reference text, p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  target_language text;
  target_template text;
  target_case_id uuid;
  target_provider_id uuid;
  verification public.email_verifications%rowtype;
begin
  if p_entity_type = 'service_case' then
    select id, preferred_language into target_id, target_language
    from public.service_cases
    where upper(case_number) = upper(trim(p_reference)) and lower(email) = lower(trim(p_email));
    target_template := 'request_received';
    target_case_id := target_id;
  elsif p_entity_type = 'provider_application' then
    select id, case when 'Spanish' = any(languages) then 'Spanish' else 'English' end
    into target_id, target_language
    from public.provider_applications
    where id::text = lower(trim(p_reference)) and lower(email) = lower(trim(p_email));
    target_template := 'provider_application_received';
    target_provider_id := target_id;
  else
    raise exception 'Unsupported verification entity';
  end if;

  if target_id is null then raise exception 'Verification request could not be matched'; end if;
  select * into verification from public.email_verifications
  where entity_type = p_entity_type and entity_id = target_id;
  if verification.status = 'Verified' then return jsonb_build_object('status', 'Verified'); end if;
  if verification.send_count >= 5 then raise exception 'Verification resend limit reached'; end if;
  if verification.last_sent_at > now() - interval '5 minutes' then raise exception 'Wait five minutes before requesting another email'; end if;

  perform public.queue_email_verification(
    p_entity_type, target_id, p_email, target_language, target_template,
    target_case_id, target_provider_id,
    case when p_entity_type = 'service_case'
      then jsonb_build_object('case_number', upper(trim(p_reference)))
      else '{}'::jsonb end
  );
  return jsonb_build_object('status', 'Pending');
end;
$$;

grant execute on function public.resend_email_verification(text, text, text) to anon, authenticated;

create or replace function public.submit_provider_application(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  notification_status text;
  email_language text;
begin
  if coalesce(trim(p_payload->>'full_name'), '') = ''
    or coalesce(trim(p_payload->>'phone'), '') = ''
    or coalesce(trim(p_payload->>'email'), '') = '' then
    raise exception 'Missing required provider information';
  end if;
  if trim(p_payload->>'phone') !~ '^[0-9]{10}$' then raise exception 'Phone must contain exactly 10 digits'; end if;
  if trim(p_payload->>'email') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email address'; end if;
  if trim(p_payload->>'zip_code') !~ '^[0-9]{5}$' then raise exception 'ZIP code must contain exactly 5 digits'; end if;
  if p_payload->>'state' not in ('Mississippi', 'Louisiana', 'Alabama') then raise exception 'Unsupported launch state'; end if;
  if coalesce((p_payload->>'terms_accepted')::boolean, false) is not true
    or coalesce((p_payload->>'privacy_accepted')::boolean, false) is not true
    or coalesce((p_payload->>'independent_provider_acknowledged')::boolean, false) is not true
    or coalesce((p_payload->>'no_advance_fee_acknowledged')::boolean, false) is not true then
    raise exception 'Required acknowledgements were not accepted';
  end if;

  insert into public.provider_applications (
    full_name, business_name, phone, email, state, city, zip_code, max_travel_radius,
    max_travel_hours, languages, years_experience, specialties, vehicle_types_served,
    vehicle_types_not_served, services_offered, services_not_offered, available_days,
    availability_schedule, immediate_available, scheduled_available, availability_start_date,
    night_available, emergency_available, all_day_available, minimum_inspection_fee,
    payment_methods, media_manifest, certifications_manifest, commercial_insurance_manifest,
    terms_accepted, privacy_accepted, independent_provider_acknowledged,
    no_advance_fee_acknowledged, media_publicity_consent, email_verification_status
  ) values (
    trim(p_payload->>'full_name'), nullif(trim(p_payload->>'business_name'), ''),
    trim(p_payload->>'phone'), lower(trim(p_payload->>'email')), p_payload->>'state',
    trim(p_payload->>'city'), trim(p_payload->>'zip_code'), (p_payload->>'max_travel_radius')::integer,
    nullif(p_payload->>'max_travel_hours', '')::numeric,
    array(select jsonb_array_elements_text(coalesce(p_payload->'languages', '[]'::jsonb))),
    coalesce((p_payload->>'years_experience')::integer, 0),
    array(select jsonb_array_elements_text(coalesce(p_payload->'specialties', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_payload->'vehicle_types_served', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_payload->'vehicle_types_not_served', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_payload->'services_offered', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_payload->'services_not_offered', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_payload->'available_days', '[]'::jsonb))),
    coalesce(p_payload->'availability_schedule', '{}'::jsonb),
    coalesce((p_payload->>'immediate_available')::boolean, false),
    coalesce((p_payload->>'scheduled_available')::boolean, true),
    nullif(p_payload->>'availability_start_date', '')::date,
    coalesce((p_payload->>'night_available')::boolean, false),
    coalesce((p_payload->>'emergency_available')::boolean, false),
    coalesce((p_payload->>'all_day_available')::boolean, false),
    nullif(p_payload->>'minimum_inspection_fee', '')::numeric,
    array(select jsonb_array_elements_text(coalesce(p_payload->'payment_methods', '[]'::jsonb))),
    coalesce(p_payload->'media_manifest', '[]'::jsonb),
    coalesce(p_payload->'certifications_manifest', '[]'::jsonb),
    coalesce(p_payload->'commercial_insurance_manifest', '[]'::jsonb),
    true, true, true, true,
    coalesce((p_payload->>'media_publicity_consent')::boolean, false), 'Pending'
  ) returning id into new_id;

  email_language := case when 'Spanish' in (select jsonb_array_elements_text(coalesce(p_payload->'languages', '[]'::jsonb))) then 'Spanish' else 'English' end;
  notification_status := public.queue_email_verification(
    'provider_application', new_id, p_payload->>'email', email_language,
    'provider_application_received', null, new_id,
    jsonb_build_object('provider_name', trim(p_payload->>'full_name'))
  );

  return jsonb_build_object('id', new_id, 'application_status', 'Pending', 'email_verification_status', 'Pending', 'email_notification_status', notification_status);
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
  notification_status text;
begin
  if coalesce(trim(p_payload->>'customer_name'), '') = ''
    or coalesce(trim(p_payload->>'phone'), '') = ''
    or coalesce(trim(p_payload->>'email'), '') = ''
    or coalesce(trim(p_payload->>'problem_description'), '') = '' then
    raise exception 'Missing required service request information';
  end if;
  if trim(p_payload->>'phone') !~ '^[0-9]{10}$' then raise exception 'Phone must contain exactly 10 digits'; end if;
  if trim(p_payload->>'email') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email address'; end if;
  if trim(p_payload->>'zip_code') !~ '^[0-9]{5}$' then raise exception 'ZIP code must contain exactly 5 digits'; end if;
  if coalesce((p_payload->>'share_consent')::boolean, false) is not true
    or coalesce((p_payload->>'platform_notice_acknowledged')::boolean, false) is not true
    or coalesce((p_payload->>'no_advance_payment_acknowledged')::boolean, false) is not true then
    raise exception 'Required consent was not accepted';
  end if;

  insert into public.service_cases (
    case_number, customer_name, phone, email, state, city, zip_code, approximate_location,
    vehicle_year, vehicle_make, vehicle_model, vin, vehicle_type, fuel_type, problem_description,
    vehicle_starts, vehicle_moves, media_manifest, service_requested, specialty_needed, urgency,
    preferred_date, preferred_time, preferred_language, share_consent, platform_notice_acknowledged,
    no_advance_payment_acknowledged, source, campaign, email_verification_status
  ) values (
    new_number, trim(p_payload->>'customer_name'), trim(p_payload->>'phone'), lower(trim(p_payload->>'email')),
    p_payload->>'state', trim(p_payload->>'city'), trim(p_payload->>'zip_code'), trim(p_payload->>'approximate_location'),
    p_payload->>'vehicle_year', p_payload->>'vehicle_make', p_payload->>'vehicle_model', nullif(p_payload->>'vin', ''),
    p_payload->>'vehicle_type', p_payload->>'fuel_type', p_payload->>'problem_description',
    p_payload->>'vehicle_starts', p_payload->>'vehicle_moves', coalesce(p_payload->'media_manifest', '[]'::jsonb),
    p_payload->>'service_requested', nullif(p_payload->>'specialty_needed', ''), p_payload->>'urgency',
    nullif(p_payload->>'preferred_date', '')::date, nullif(p_payload->>'preferred_time', ''),
    p_payload->>'preferred_language', true, true, true,
    nullif(left(trim(p_payload->>'source'), 100), ''), nullif(left(trim(p_payload->>'campaign'), 150), ''), 'Pending'
  ) returning id into new_id;

  insert into public.case_events(case_id, event_type, actor_role, notes)
  values (new_id, 'CASE_CREATED', 'customer', 'Public service request submitted; email verification queued.');

  notification_status := public.queue_email_verification(
    'service_case', new_id, p_payload->>'email', p_payload->>'preferred_language',
    'request_received', new_id, null,
    jsonb_build_object('customer_name', trim(p_payload->>'customer_name'), 'case_number', new_number)
  );

  return jsonb_build_object('id', new_id, 'case_number', new_number, 'status', 'Request received', 'email_verification_status', 'Pending', 'email_notification_status', notification_status);
end;
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
  if not public.verify_case_identity(p_case_number, p_phone, p_email) then raise exception 'Case verification failed'; end if;
  select id into target_case from public.service_cases where upper(case_number) = upper(trim(p_case_number));
  severity_value := case when p_payload->>'incident_type' in ('Fraud', 'Safety', 'Advance payment request') then 'Serious' else 'Normal' end;
  insert into public.complaints(case_id, case_number, incident_type, description, requested_resolution, media_manifest, severity)
  values (target_case, upper(trim(p_case_number)), p_payload->>'incident_type', p_payload->>'description',
    nullif(p_payload->>'requested_resolution', ''), coalesce(p_payload->'media_manifest', '[]'::jsonb), severity_value)
  returning id into new_id;
  insert into public.case_events(case_id, event_type, actor_role, notes)
  values (target_case, case when p_payload->>'incident_type' = 'Advance payment request' then 'ADVANCE_PAYMENT_REQUEST' else 'COMPLAINT_CREATED' end, 'customer', 'A customer incident report was submitted.');
  return jsonb_build_object('id', new_id, 'status', 'Open', 'severity', severity_value);
end;
$$;

insert into public.platform_settings(key, value) values
  ('beta_notification_channels', '{"email":true,"portal":true,"sms":false,"whatsapp":false,"push":false}'::jsonb),
  ('email_delivery_provider', '{"enabled":false,"provider":"unconfigured","cost_policy":"free-beta-only"}'::jsonb)
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.notification_templates(template_key, language, channel, subject, body) values
  ('request_received', 'English', 'Email', 'CarDaddy request {{case_number}} received', 'Your request {{case_number}} was received. Verify your email and check Spam or Junk if this message is not in your inbox.'),
  ('request_received', 'Spanish', 'Email', 'Solicitud CarDaddy {{case_number}} recibida', 'Recibimos tu solicitud {{case_number}}. Verifica tu correo y revisa Spam o Correo no deseado si este mensaje no aparece en tu bandeja de entrada.'),
  ('provider_application_received', 'English', 'Email', 'CarDaddy Network application received', 'Your provider application is pending review. Verify your email and add CarDaddy to your safe senders.'),
  ('provider_application_received', 'Spanish', 'Email', 'Solicitud para la red CarDaddy recibida', 'Tu solicitud de proveedor está pendiente de revisión. Verifica tu correo y agrega CarDaddy a tus remitentes seguros.')
on conflict (template_key, language, channel) do update set
  subject = excluded.subject, body = excluded.body, is_active = true;

grant execute on function public.submit_provider_application(jsonb) to anon, authenticated;
grant execute on function public.submit_service_case(jsonb) to anon, authenticated;
grant execute on function public.submit_case_complaint(text, text, text, jsonb) to anon, authenticated;
