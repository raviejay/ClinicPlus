-- ============================================================
-- CUSTOM THEME REQUESTS
-- Premium clinics ask our team for a custom booking-page design.
-- Requests are created by the request-custom-theme Edge Function (service role),
-- which also emails the team. Clinic admins can read their own requests; the
-- ClinicGo super admin can read all and update the status.
-- ============================================================
begin;

create table if not exists public.custom_theme_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  contact_email text not null,
  message text not null check (length(message) between 20 and 2000),
  reference_url text check (reference_url is null or length(reference_url) <= 300),
  status text not null default 'new' check (status in ('new', 'in_progress', 'done', 'declined')),
  created_at timestamptz not null default now()
);

create index if not exists custom_theme_requests_clinic_idx
  on public.custom_theme_requests (clinic_id, created_at desc);

alter table public.custom_theme_requests enable row level security;

create policy custom_theme_requests_select on public.custom_theme_requests
  for select to authenticated using (
    (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'super_admin'))
    or public.get_my_role() = 'super_admin'
  );

create policy custom_theme_requests_super_update on public.custom_theme_requests
  for update to authenticated
  using (public.get_my_role() = 'super_admin')
  with check (public.get_my_role() = 'super_admin');

-- Browser sessions never create or delete requests
revoke all on public.custom_theme_requests from anon;
revoke insert, delete on public.custom_theme_requests from authenticated;

commit;
