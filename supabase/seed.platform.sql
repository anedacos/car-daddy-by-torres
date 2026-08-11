-- Synthetic staging data only. Never replace these values with real personal information.

insert into public.provider_applications (
  id, full_name, business_name, phone, email, state, city, zip_code, max_travel_radius,
  languages, years_experience, specialties, vehicle_types_served, vehicle_types_not_served,
  services_offered, services_not_offered, available_days, availability_schedule,
  immediate_available, scheduled_available, emergency_available, payment_methods,
  terms_accepted, privacy_accepted, independent_provider_acknowledged, application_status
) values (
  '00000000-0000-4000-8000-000000000101', 'Jordan Sample', 'Sample Mobile Auto',
  '5550101101', 'provider.one@example.test', 'Mississippi', 'Gulfport', '39503', 45,
  array['English','Spanish'], 8, array['General automotive mechanics','Electrical diagnostics','Gas vehicles'],
  array['Car','Light truck'], array['Heavy equipment'], array['Diagnostics','Mechanical repair'], array['Paint'],
  array['Monday','Tuesday','Wednesday'], '{"Monday":[{"start":"08:00","end":"12:00"},{"start":"14:00","end":"18:00"}]}'::jsonb,
  true, true, true, array['Cash','Zelle'], true, true, true, 'Pending'
) on conflict (id) do nothing;

insert into public.provider_profiles (
  id, full_name, business_name, phone, email, state, city, zip_code, max_travel_radius,
  languages, specialties, vehicle_types_served, vehicle_types_not_served,
  services_offered, services_not_offered, availability_status, emergency_available, account_status
) values (
  '00000000-0000-4000-8000-000000000112', 'Taylor Demo', 'Demo Network Service',
  '5550101102', 'provider.two@example.test', 'Mississippi', 'Gulfport', '39503', 60,
  array['English'], array['Electrical diagnostics','General automotive mechanics'],
  array['Car','Light truck'], array['Heavy equipment'], array['Diagnostics','Mechanical repair'],
  array['Paint'], 'Available', true, 'Active'
) on conflict (id) do nothing;

insert into public.service_cases (
  id, case_number, customer_name, phone, email, state, city, zip_code, approximate_location,
  vehicle_year, vehicle_make, vehicle_model, vehicle_type, fuel_type, problem_description,
  vehicle_starts, vehicle_moves, service_requested, specialty_needed, urgency,
  preferred_language, share_consent, platform_notice_acknowledged, status
) values (
  '00000000-0000-4000-8000-000000000201', 'CD-20260802-DEMO1', 'Case Sample',
  '5550102201', 'customer@example.test', 'Mississippi', 'Gulfport', '39503', 'Near a public landmark',
  '2015', 'Sample', 'Sedan', 'Car', 'Gasoline', 'Synthetic no-start example for staging tests.',
  'No', 'No', 'Diagnostics', 'Electrical diagnostics', 'Immediate', 'English', true, true, 'Pending review'
) on conflict (id) do nothing;

insert into public.case_events(id, case_id, event_type, actor_role, notes, occurred_at)
values (
  '00000000-0000-4000-8000-000000000211',
  '00000000-0000-4000-8000-000000000201',
  'request_received', 'system', 'Synthetic case created for staging workflow tests.', '2026-08-02T15:10:00Z'
) on conflict (id) do nothing;

insert into public.complaints (
  id, case_id, case_number, incident_type, description, requested_resolution, severity, status
) values (
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000201',
  'CD-20260802-DEMO1', 'Late communication', 'Synthetic complaint for staging workflow tests.',
  'Contact update', 'Normal', 'Open'
) on conflict (id) do nothing;
