-- ============================================================
-- CLINIC MAP PIN
-- The exact spot an admin pins on the map in Settings. The booking page shows the map at this
-- point and "Navigate" goes straight to it (typed addresses are often ambiguous).
-- Both coordinates are set together or not at all.
-- ============================================================
begin;

alter table public.clinics
  add column if not exists latitude double precision check (latitude is null or latitude between -90 and 90),
  add column if not exists longitude double precision check (longitude is null or longitude between -180 and 180);

alter table public.clinics drop constraint if exists clinics_pin_complete;
alter table public.clinics add constraint clinics_pin_complete
  check ((latitude is null) = (longitude is null));

create or replace function public.get_public_clinic(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'name', c.name, 'slug', c.slug, 'email', null,
    'address', c.address, 'phone', c.phone,
    'latitude', c.latitude, 'longitude', c.longitude,
    'plan', c.plan, 'status', c.status, 'is_trial', c.is_trial,
    'trial_ends_at', c.trial_ends_at, 'created_at', c.created_at,
    'clinic_branding',  (select to_jsonb(b) from public.clinic_branding b where b.clinic_id = c.id),
    'clinic_settings',  (select to_jsonb(s) from public.clinic_settings s where s.clinic_id = c.id)
  )
  from public.clinics c
  where c.slug = p_slug and c.status = 'active'
$$;

commit;
