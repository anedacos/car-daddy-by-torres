-- Provider intake contact validation and travel-time preference.

alter table public.provider_applications
  add column if not exists max_travel_hours numeric(4,2)
  check (max_travel_hours is null or max_travel_hours between 0.5 and 12);

alter table public.provider_profiles
  add column if not exists max_travel_hours numeric(4,2)
  check (max_travel_hours is null or max_travel_hours between 0.5 and 12);

create or replace function public.submit_provider_application(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if coalesce(trim(p_payload->>'full_name'), '') = ''
    or coalesce(trim(p_payload->>'phone'), '') = ''
    or coalesce(trim(p_payload->>'email'), '') = '' then
    raise exception 'Missing required provider information';
  end if;
  if trim(p_payload->>'phone') !~ '^[0-9]{10}$' then
    raise exception 'Phone must contain exactly 10 digits';
  end if;
  if trim(p_payload->>'email') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Invalid email address';
  end if;
  if trim(p_payload->>'zip_code') !~ '^[0-9]{5}$' then
    raise exception 'ZIP code must contain exactly 5 digits';
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
    max_travel_hours, languages, years_experience, specialties, vehicle_types_served,
    vehicle_types_not_served, services_offered, services_not_offered, available_days,
    availability_schedule, immediate_available, scheduled_available, availability_start_date,
    night_available, emergency_available, all_day_available, minimum_inspection_fee,
    minimum_mobilization_fee, payment_methods, media_manifest, certifications_manifest,
    commercial_insurance_manifest, terms_accepted, privacy_accepted,
    independent_provider_acknowledged, media_publicity_consent
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
    nullif(p_payload->>'minimum_mobilization_fee', '')::numeric,
    array(select jsonb_array_elements_text(coalesce(p_payload->'payment_methods', '[]'::jsonb))),
    coalesce(p_payload->'media_manifest', '[]'::jsonb),
    coalesce(p_payload->'certifications_manifest', '[]'::jsonb),
    coalesce(p_payload->'commercial_insurance_manifest', '[]'::jsonb), true, true, true,
    coalesce((p_payload->>'media_publicity_consent')::boolean, false)
  ) returning id into new_id;

  return jsonb_build_object('id', new_id, 'application_status', 'Pending');
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
  set application_status = p_status, internal_notes = p_note, reviewed_by = auth.uid(),
    reviewed_at = now(), updated_at = now()
  where id = p_application_id;

  if p_status = 'Approved' then
    insert into public.provider_profiles (
      application_id, full_name, business_name, phone, email, state, city, zip_code,
      max_travel_radius, max_travel_hours, languages, specialties, vehicle_types_served,
      vehicle_types_not_served, services_offered, services_not_offered,
      availability_start_date, emergency_available, account_status
    )
    select id, full_name, business_name, phone, email, state, city, zip_code,
      max_travel_radius, max_travel_hours, languages, specialties, vehicle_types_served,
      vehicle_types_not_served, services_offered, services_not_offered,
      availability_start_date, emergency_available, 'Active'
    from public.provider_applications where id = p_application_id
    on conflict (application_id) do update set
      full_name = excluded.full_name, business_name = excluded.business_name,
      phone = excluded.phone, email = excluded.email, state = excluded.state,
      city = excluded.city, zip_code = excluded.zip_code,
      max_travel_radius = excluded.max_travel_radius,
      max_travel_hours = excluded.max_travel_hours,
      languages = excluded.languages, specialties = excluded.specialties,
      vehicle_types_served = excluded.vehicle_types_served,
      vehicle_types_not_served = excluded.vehicle_types_not_served,
      services_offered = excluded.services_offered,
      services_not_offered = excluded.services_not_offered,
      availability_start_date = excluded.availability_start_date,
      emergency_available = excluded.emergency_available, updated_at = now();
  end if;

  insert into public.admin_actions(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'provider.reviewed', 'provider_application', p_application_id,
    jsonb_build_object('status', p_status));
  return jsonb_build_object('id', p_application_id, 'application_status', p_status);
end;
$$;

grant execute on function public.submit_provider_application(jsonb) to anon, authenticated;
grant execute on function public.admin_review_provider(uuid, text, text) to authenticated;
