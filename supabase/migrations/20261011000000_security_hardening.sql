-- ============================================================
-- SECURITY HARDENING
--  * RLS on for every table (clinics + clinic_monthly_usage were OFF)
--  * All policies rebuilt from scratch (the old ones overlapped and OR'd together)
--  * role / clinic_id / plan / status can't be self-edited from the browser
--  * subscriptions are written only by server code (webhook + checkout function)
--  * clinic signup and public booking go through SECURITY DEFINER functions,
--    so anonymous visitors never touch tables directly
-- Run in the Supabase SQL editor. Wrapped in a transaction: any error rolls it all back.
-- ============================================================
begin;

-- ------------------------------------------------------------
-- 0. Helpers (SECURITY DEFINER so policies on profiles don't recurse)
-- ------------------------------------------------------------
create or replace function public.get_my_clinic_id()
returns uuid language sql stable security definer set search_path = public as $$
  select clinic_id from public.profiles where id = auth.uid()
$$;

create or replace function public.get_my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Set once a confirmation email went out (stops the public email trigger being replayed)
alter table public.appointments
  add column if not exists confirmation_email_sent_at timestamptz;

-- ------------------------------------------------------------
-- 1. Turn RLS on everywhere and drop every existing policy
-- ------------------------------------------------------------
alter table public.profiles             enable row level security;
alter table public.clinics              enable row level security;
alter table public.clinic_settings      enable row level security;
alter table public.clinic_branding      enable row level security;
alter table public.branches             enable row level security;
alter table public.patients             enable row level security;
alter table public.appointments         enable row level security;
alter table public.queue                enable row level security;
alter table public.medical_records      enable row level security;
alter table public.payments             enable row level security;
alter table public.subscriptions        enable row level security;
alter table public.clinic_monthly_usage enable row level security;
alter table public.clinic_services      enable row level security;

do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 2. Policies
-- ------------------------------------------------------------

-- profiles: no client INSERT/DELETE (create_clinic() and the invite-staff function do that)
create policy profiles_select on public.profiles for select to authenticated using (
  id = auth.uid()
  or (clinic_id is not null and clinic_id = public.get_my_clinic_id())
  or public.get_my_role() = 'super_admin'
);
create policy profiles_update on public.profiles for update to authenticated using (
  id = auth.uid()
  or (clinic_id = public.get_my_clinic_id() and public.get_my_role() = 'admin')
  or public.get_my_role() = 'super_admin'
) with check (
  id = auth.uid()
  or clinic_id is null
  or clinic_id = public.get_my_clinic_id()
  or public.get_my_role() = 'super_admin'
);

-- clinics: members read their own; admins edit (sensitive columns guarded by trigger below)
create policy clinics_select on public.clinics for select to authenticated using (
  id = public.get_my_clinic_id() or public.get_my_role() = 'super_admin'
);
create policy clinics_update on public.clinics for update to authenticated using (
  (id = public.get_my_clinic_id() and public.get_my_role() = 'admin')
  or public.get_my_role() = 'super_admin'
);

-- clinic_settings / clinic_branding: members read, admins update. Creation is server-side.
create policy clinic_settings_select on public.clinic_settings for select to authenticated using (
  clinic_id = public.get_my_clinic_id() or public.get_my_role() = 'super_admin'
);
create policy clinic_settings_update on public.clinic_settings for update to authenticated using (
  (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'super_admin'))
  or public.get_my_role() = 'super_admin'
);
create policy clinic_branding_select on public.clinic_branding for select to authenticated using (
  clinic_id = public.get_my_clinic_id() or public.get_my_role() = 'super_admin'
);
create policy clinic_branding_update on public.clinic_branding for update to authenticated using (
  (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'super_admin'))
  or public.get_my_role() = 'super_admin'
);

-- branches: members read, admins write
create policy branches_select on public.branches for select to authenticated using (
  clinic_id = public.get_my_clinic_id() or public.get_my_role() = 'super_admin'
);
create policy branches_write on public.branches for all to authenticated using (
  clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'super_admin')
) with check (
  clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'super_admin')
);

-- clinic_services: active services are public (booking page); admins manage
create policy clinic_services_public_read on public.clinic_services for select to anon, authenticated using (is_active = true);
create policy clinic_services_member_read on public.clinic_services for select to authenticated using (
  clinic_id = public.get_my_clinic_id()
);
create policy clinic_services_write on public.clinic_services for all to authenticated using (
  clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'super_admin')
) with check (
  clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'super_admin')
);

-- subscriptions: members READ ONLY. Writes come from the webhook / checkout function.
create policy subscriptions_select on public.subscriptions for select to authenticated using (
  clinic_id = public.get_my_clinic_id() or public.get_my_role() = 'super_admin'
);
revoke insert, update, delete on public.subscriptions from anon, authenticated;

-- Everything else: staff of the clinic only. No anonymous access.
do $$
declare t text;
begin
  foreach t in array array['patients','appointments','queue','medical_records','payments','clinic_monthly_usage'] loop
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (clinic_id = public.get_my_clinic_id())
         with check (clinic_id = public.get_my_clinic_id())',
      t || '_tenant', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 3. Column guards (browser sessions only; service_role / SQL editor / definer functions skip)
-- ------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger language plpgsql set search_path = public as $$
declare
  caller_role text;
  caller_clinic uuid;
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;

  caller_role := public.get_my_role();
  caller_clinic := public.get_my_clinic_id();
  if caller_role = 'super_admin' then return new; end if;

  if new.id is distinct from old.id then
    raise exception 'Cannot change profile id';
  end if;
  if new.role is distinct from old.role then
    raise exception 'Cannot change role';
  end if;
  -- Only an admin removing someone else from their own clinic may touch clinic_id
  if new.clinic_id is distinct from old.clinic_id then
    if not (new.clinic_id is null and caller_role = 'admin'
            and old.clinic_id = caller_clinic and old.id <> auth.uid()) then
      raise exception 'Cannot change clinic';
    end if;
  end if;
  if new.branch_id is distinct from old.branch_id then
    if not (caller_role = 'admin' and old.clinic_id = caller_clinic) then
      raise exception 'Cannot change branch';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_profile_update on public.profiles;
create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.guard_clinic_update()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if public.get_my_role() = 'super_admin' then return new; end if;

  if new.id            is distinct from old.id
  or new.plan          is distinct from old.plan
  or new.is_trial      is distinct from old.is_trial
  or new.trial_ends_at is distinct from old.trial_ends_at
  or new.status        is distinct from old.status
  or new.created_at    is distinct from old.created_at then
    raise exception 'Plan, trial and status can only be changed through billing';
  end if;
  return new;
end $$;

drop trigger if exists guard_clinic_update on public.clinics;
create trigger guard_clinic_update before update on public.clinics
  for each row execute function public.guard_clinic_update();

-- ------------------------------------------------------------
-- 4. Signup: create_clinic() replaces the browser-side multi-table inserts
-- ------------------------------------------------------------
create or replace function public.create_clinic(p_name text, p_email text default null)
returns public.clinics language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_name text := trim(coalesce(p_name, ''));
  v_base text;
  v_slug text;
  v_n int := 0;
  v_clinic public.clinics%rowtype;
begin
  if v_uid is null then raise exception 'Not authenticated'; end if;
  if length(v_name) < 2 or length(v_name) > 100 then
    raise exception 'Clinic name must be 2-100 characters';
  end if;
  if exists (select 1 from public.profiles where id = v_uid and clinic_id is not null) then
    raise exception 'This account already belongs to a clinic';
  end if;

  v_base := left(regexp_replace(regexp_replace(regexp_replace(
              lower(v_name), '[^a-z0-9\s-]', '', 'g'), '\s+', '-', 'g'), '-+', '-', 'g'), 50);
  if v_base = '' then v_base := 'clinic'; end if;
  v_slug := v_base;
  while exists (select 1 from public.clinics where slug = v_slug) loop
    v_n := v_n + 1;
    v_slug := v_base || '-' || v_n;
  end loop;

  -- 14-day trial: plan stays 'starter'; trial access is is_trial + trial_ends_at
  insert into public.clinics (name, slug, email, plan, is_trial, trial_ends_at)
  values (v_name, v_slug, nullif(trim(coalesce(p_email, '')), ''), 'starter', true, now() + interval '14 days')
  returning * into v_clinic;

  insert into public.clinic_settings (clinic_id) values (v_clinic.id);
  insert into public.clinic_branding (clinic_id) values (v_clinic.id);

  insert into public.profiles (id, clinic_id, role)
  values (v_uid, v_clinic.id, 'admin')
  on conflict (id) do update
    set clinic_id = excluded.clinic_id,
        role = case when public.profiles.role = 'super_admin' then 'super_admin' else 'admin' end;

  insert into public.subscriptions
    (clinic_id, plan, status, payment_link_id, reference_number, amount, billing_date, next_billing_date)
  values
    (v_clinic.id, 'premium', 'active', 'trial-' || v_clinic.id, 'TRIAL-' || v_clinic.id,
     199900, now(), now() + interval '14 days');

  return v_clinic;
end $$;

revoke all on function public.create_clinic(text, text) from public, anon;
grant execute on function public.create_clinic(text, text) to authenticated;

-- ------------------------------------------------------------
-- 5. Public booking page: narrow, read-only lookups + one booking function
-- ------------------------------------------------------------
create or replace function public.get_public_clinic(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', c.id, 'name', c.name, 'slug', c.slug, 'email', null,
    'plan', c.plan, 'status', c.status, 'is_trial', c.is_trial,
    'trial_ends_at', c.trial_ends_at, 'created_at', c.created_at,
    'clinic_branding',  (select to_jsonb(b) from public.clinic_branding b where b.clinic_id = c.id),
    'clinic_settings',  (select to_jsonb(s) from public.clinic_settings s where s.clinic_id = c.id)
  )
  from public.clinics c
  where c.slug = p_slug and c.status = 'active'
$$;

create or replace function public.get_public_branch(p_clinic_id uuid, p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(b)
  from public.branches b
  join public.clinics c on c.id = b.clinic_id
  where b.clinic_id = p_clinic_id and b.slug = p_slug and c.status = 'active'
$$;

create or replace function public.get_public_doctors(p_clinic_id uuid)
returns table (id uuid, full_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name
  from public.profiles p
  join public.clinics c on c.id = p.clinic_id
  where p.clinic_id = p_clinic_id and p.role = 'doctor' and c.status = 'active'
$$;

create or replace function public.book_public_appointment(
  p_clinic_id uuid,
  p_branch_id uuid,
  p_full_name text,
  p_contact_number text,
  p_email text,
  p_appointment_date date,
  p_time_slot text,
  p_doctor_id uuid,
  p_service_category text,
  p_service_name text,
  p_notes text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_clinic public.clinics%rowtype;
  v_name text := trim(coalesce(p_full_name, ''));
  v_contact text := trim(coalesce(p_contact_number, ''));
  v_email text := nullif(trim(coalesce(p_email, '')), '');
  v_plan text;
  v_max int;
  v_current int;
  v_month date := date_trunc('month', current_date)::date;
  v_patient_id uuid;
  v_patient_email text;
  v_appt uuid;
begin
  select * into v_clinic from public.clinics where id = p_clinic_id and status = 'active';
  if not found then raise exception 'Clinic not found'; end if;

  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'Please enter your full name'; end if;
  if length(v_contact) < 5 or length(v_contact) > 30 then raise exception 'Please enter a valid contact number'; end if;
  if v_email is not null and (length(v_email) > 254 or position('@' in v_email) = 0) then
    raise exception 'Please enter a valid email';
  end if;
  if p_appointment_date is null or p_appointment_date < current_date
     or p_appointment_date > current_date + 365 then
    raise exception 'Please choose a valid appointment date';
  end if;
  if length(coalesce(p_notes, '')) > 1000 or length(coalesce(p_time_slot, '')) > 50
     or length(coalesce(p_service_category, '')) > 100 or length(coalesce(p_service_name, '')) > 100 then
    raise exception 'Some fields are too long';
  end if;

  if p_branch_id is not null and not exists (
    select 1 from public.branches where id = p_branch_id and clinic_id = p_clinic_id
  ) then raise exception 'Branch not found'; end if;

  if p_doctor_id is not null and not exists (
    select 1 from public.profiles where id = p_doctor_id and clinic_id = p_clinic_id and role = 'doctor'
  ) then raise exception 'Doctor not found'; end if;

  -- Find or create the patient (by contact number within the clinic)
  select id, email into v_patient_id, v_patient_email
  from public.patients where clinic_id = p_clinic_id and contact_number = v_contact limit 1;

  if v_patient_id is not null then
    if v_email is not null and v_patient_email is null then
      update public.patients set email = v_email where id = v_patient_id;
    end if;
  else
    -- Monthly new-patient limit for the clinic's effective plan
    v_plan := case when v_clinic.is_trial and v_clinic.trial_ends_at > now() then 'premium' else v_clinic.plan end;
    v_max := case v_plan when 'starter' then 100 when 'pro' then 1000 else 999999 end;

    insert into public.clinic_monthly_usage (clinic_id, new_patients_count, period_start)
    values (p_clinic_id, 0, v_month) on conflict (clinic_id) do nothing;
    update public.clinic_monthly_usage set new_patients_count = 0, period_start = v_month
    where clinic_id = p_clinic_id and period_start < v_month;
    select new_patients_count into v_current
    from public.clinic_monthly_usage where clinic_id = p_clinic_id for update;

    if v_current >= v_max then
      raise exception 'This clinic is not accepting new patients right now. Please contact the clinic directly.';
    end if;

    insert into public.patients (clinic_id, branch_id, full_name, contact_number, email)
    values (p_clinic_id, p_branch_id, v_name, v_contact, v_email)
    returning id into v_patient_id;

    update public.clinic_monthly_usage set new_patients_count = new_patients_count + 1
    where clinic_id = p_clinic_id;
  end if;

  insert into public.appointments
    (clinic_id, branch_id, patient_id, doctor_id, appointment_date, time_slot,
     status, notes, service_category, service_name)
  values
    (p_clinic_id, p_branch_id, v_patient_id, p_doctor_id, p_appointment_date,
     nullif(p_time_slot, ''), 'confirmed', nullif(p_notes, ''),
     nullif(p_service_category, ''), nullif(p_service_name, ''))
  returning id into v_appt;

  return v_appt;
end $$;

revoke all on function public.get_public_clinic(text) from public;
revoke all on function public.get_public_branch(uuid, text) from public;
revoke all on function public.get_public_doctors(uuid) from public;
revoke all on function public.book_public_appointment(uuid, uuid, text, text, text, date, text, uuid, text, text, text) from public;
grant execute on function public.get_public_clinic(text) to anon, authenticated;
grant execute on function public.get_public_branch(uuid, text) to anon, authenticated;
grant execute on function public.get_public_doctors(uuid) to anon, authenticated;
grant execute on function public.book_public_appointment(uuid, uuid, text, text, text, date, text, uuid, text, text, text) to anon, authenticated;

commit;
