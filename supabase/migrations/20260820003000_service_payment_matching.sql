alter table public.service_cases
  add column if not exists payment_method text;

comment on column public.service_cases.payment_method is
  'Customer-selected method intended for direct payment to the assigned provider after arrival.';

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
    or coalesce(trim(p_payload->>'state'), '') = ''
    or coalesce(trim(p_payload->>'city'), '') = ''
    or coalesce(trim(p_payload->>'problem_description'), '') = ''
    or coalesce(trim(p_payload->>'payment_method'), '') = '' then
    raise exception 'Missing required service request information';
  end if;
  if trim(p_payload->>'phone') !~ '^[0-9]{10}$' then raise exception 'Phone must contain exactly 10 digits'; end if;
  if trim(p_payload->>'email') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'Invalid email address'; end if;
  if trim(p_payload->>'zip_code') !~ '^[0-9]{5}$' then raise exception 'ZIP code must contain exactly 5 digits'; end if;
  if p_payload->>'payment_method' not in ('Cash', 'Zelle', 'Cash App', 'Card', 'Check', 'Other') then raise exception 'Invalid payment method'; end if;
  if coalesce((p_payload->>'share_consent')::boolean, false) is not true
    or coalesce((p_payload->>'platform_notice_acknowledged')::boolean, false) is not true
    or coalesce((p_payload->>'no_advance_payment_acknowledged')::boolean, false) is not true then
    raise exception 'Required consent was not accepted';
  end if;

  insert into public.service_cases (
    case_number, customer_name, phone, email, street_address, state, city, zip_code, approximate_location,
    vehicle_year, vehicle_make, vehicle_model, vin, vehicle_type, fuel_type, problem_description,
    vehicle_starts, vehicle_moves, media_manifest, service_requested, specialty_needed, urgency,
    preferred_date, preferred_time, preferred_language, payment_method, share_consent, platform_notice_acknowledged,
    no_advance_payment_acknowledged, source, campaign, email_verification_status
  ) values (
    new_number, trim(p_payload->>'customer_name'), trim(p_payload->>'phone'), lower(trim(p_payload->>'email')),
    null, p_payload->>'state', trim(p_payload->>'city'), trim(p_payload->>'zip_code'),
    'Exact address coordinated after provider assignment',
    p_payload->>'vehicle_year', p_payload->>'vehicle_make', p_payload->>'vehicle_model', nullif(p_payload->>'vin', ''),
    p_payload->>'vehicle_type', p_payload->>'fuel_type', p_payload->>'problem_description',
    p_payload->>'vehicle_starts', p_payload->>'vehicle_moves', coalesce(p_payload->'media_manifest', '[]'::jsonb),
    p_payload->>'service_requested', nullif(p_payload->>'specialty_needed', ''), p_payload->>'urgency',
    nullif(p_payload->>'preferred_date', '')::date, nullif(p_payload->>'preferred_time', ''),
    p_payload->>'preferred_language', p_payload->>'payment_method', true, true, true,
    nullif(left(trim(p_payload->>'source'), 100), ''), nullif(left(trim(p_payload->>'campaign'), 150), ''), 'Pending'
  ) returning id into new_id;

  insert into public.case_events(case_id, event_type, actor_role, notes)
  values (new_id, 'CASE_CREATED', 'customer', 'Public service request submitted; email verification queued.');

  notification_status := public.queue_email_verification(
    'service_case', new_id, p_payload->>'email', p_payload->>'preferred_language',
    'request_received', new_id, null,
    jsonb_build_object('customer_name', trim(p_payload->>'customer_name'), 'case_number', new_number)
  );

  return jsonb_build_object(
    'id', new_id,
    'case_number', new_number,
    'status', 'Request received',
    'email_verification_status', 'Pending',
    'email_notification_status', notification_status
  );
end;
$$;

grant execute on function public.submit_service_case(jsonb) to anon, authenticated;

