-- Require verifiable evidence for every specialty declared by a provider.

create or replace function public.submit_provider_application(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  unsupported_specialty text;
  media_items jsonb := coalesce(p_payload->'media_manifest', '[]'::jsonb);
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
    or coalesce((p_payload->>'independent_provider_acknowledged')::boolean, false) is not true
    or coalesce((p_payload->>'no_advance_fee_acknowledged')::boolean, false) is not true then
    raise exception 'Required acknowledgements were not accepted';
  end if;
  if jsonb_typeof(coalesce(p_payload->'specialties', '[]'::jsonb)) <> 'array'
    or jsonb_array_length(coalesce(p_payload->'specialties', '[]'::jsonb)) = 0 then
    raise exception 'At least one specialty is required';
  end if;
  if jsonb_typeof(media_items) <> 'array' then
    raise exception 'Invalid provider evidence manifest';
  end if;
  if not exists (
    select 1
    from jsonb_array_elements(media_items) item
    where item->>'category' = 'tools'
      and item->>'type' like 'image/%'
  ) then
    raise exception 'At least one photo of provider-owned tools is required';
  end if;

  select specialty into unsupported_specialty
  from jsonb_array_elements_text(p_payload->'specialties') specialty
  where not exists (
    select 1
    from jsonb_array_elements(media_items) item
    where item->>'category' = 'skill_evidence_video'
      and item->>'type' like 'video/%'
      and item->>'skill' = specialty
      and coalesce(trim(item->>'description'), '') <> ''
      and coalesce(trim(item->>'vehicle_type'), '') <> ''
      and coalesce(trim(item->>'vehicle_make_model'), '') <> ''
  )
  limit 1;
  if unsupported_specialty is not null then
    raise exception 'Missing required work video and details for specialty: %', unsupported_specialty;
  end if;

  insert into public.provider_applications (
    full_name, business_name, phone, email, state, city, zip_code, max_travel_radius,
    max_travel_hours, languages, years_experience, specialties, vehicle_types_served,
    vehicle_types_not_served, services_offered, services_not_offered, available_days,
    availability_schedule, immediate_available, scheduled_available, availability_start_date,
    night_available, emergency_available, all_day_available, minimum_inspection_fee,
    payment_methods, media_manifest, certifications_manifest, commercial_insurance_manifest,
    terms_accepted, privacy_accepted, independent_provider_acknowledged,
    no_advance_fee_acknowledged, media_publicity_consent
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
    media_items,
    coalesce(p_payload->'certifications_manifest', '[]'::jsonb),
    coalesce(p_payload->'commercial_insurance_manifest', '[]'::jsonb),
    true, true, true, true,
    coalesce((p_payload->>'media_publicity_consent')::boolean, false)
  ) returning id into new_id;

  return jsonb_build_object('id', new_id, 'application_status', 'Pending');
end;
$$;

grant execute on function public.submit_provider_application(jsonb) to anon, authenticated;
