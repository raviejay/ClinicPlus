-- ============================================================
-- CLINIC CONTACT DETAILS
-- A clinic's address and phone number: shown on the public booking page (with a map and a
-- "Navigate" link) and available as {clinic_address} / {clinic_phone} on printed documents.
-- Admins edit them in Settings like the clinic's name.
-- ============================================================
begin;

alter table public.clinics
  add column if not exists address text check (address is null or length(address) <= 250),
  add column if not exists phone text check (phone is null or length(phone) <= 40);

-- The public booking page reads the clinic through this function: still no email,
-- but the address and phone are meant to be public.
create or replace function public.get_public_clinic(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'name', c.name, 'slug', c.slug, 'email', null,
    'address', c.address, 'phone', c.phone,
    'plan', c.plan, 'status', c.status, 'is_trial', c.is_trial,
    'trial_ends_at', c.trial_ends_at, 'created_at', c.created_at,
    'clinic_branding',  (select to_jsonb(b) from public.clinic_branding b where b.clinic_id = c.id),
    'clinic_settings',  (select to_jsonb(s) from public.clinic_settings s where s.clinic_id = c.id)
  )
  from public.clinics c
  where c.slug = p_slug and c.status = 'active'
$$;

commit;
