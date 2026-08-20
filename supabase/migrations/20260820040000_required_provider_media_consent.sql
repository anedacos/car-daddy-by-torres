-- Historical beta applications remain readable. Every new provider application
-- must grant the work-media permission shown in the application form.
alter table public.provider_applications
  drop constraint if exists provider_applications_media_publicity_consent_required;

alter table public.provider_applications
  add constraint provider_applications_media_publicity_consent_required
  check (media_publicity_consent = true) not valid;
