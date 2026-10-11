-- ============================================================
-- PLAN ENFORCEMENT + RELIABILITY
--  * Plan limits and feature gates enforced in the database (they were UI-only)
--  * Expired trial = read-only on the server, mirroring the UI
--  * Medical records: admin / doctor only
--  * remove_staff() (the old client-side removal was silently blocked by RLS)
--  * Public booking: rate limits, slot conflict check, no booking for read-only clinics
--  * Double-booking protection for doctor + date + time slot
--  * expire_subscriptions(): lapsed paid plans fall back to Starter (daily via pg_cron)
-- Wrapped in a transaction: any error rolls it all back.
-- ============================================================
begin;

-- ------------------------------------------------------------
-- 1. Plan helpers (mirror useClinic.ts canUseFeature + planLimits.ts)
-- ------------------------------------------------------------
-- 'expired' = trial ran out and no paid plan was ever chosen -> read-only
create or replace function public.clinic_effective_plan(p_clinic uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when c.is_trial and c.trial_ends_at is not null and c.trial_ends_at > now() then 'premium'
    when c.is_trial and c.trial_ends_at is not null then 'expired'
    else coalesce(c.plan, 'starter')
  end
  from public.clinics c where c.id = p_clinic
$$;

create or replace function public.clinic_can(p_clinic uuid, p_feature text)
returns boolean language sql stable security definer set search_path = public as $$
  select case
    when v.plan is null or v.plan = 'expired' then false
    when p_feature in ('queue', 'revenue', 'email_notifications', 'doctor_selection') then v.plan in ('pro', 'premium')
    when p_feature in ('multi_branch', 'full_analytics', 'custom_branding', 'priority_support') then v.plan = 'premium'
    else true
  end
  from (select public.clinic_effective_plan(p_clinic) as plan) v
$$;

create or replace function public.clinic_is_writable(p_clinic uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.clinic_effective_plan(p_clinic), 'expired') <> 'expired'
$$;

-- ------------------------------------------------------------
-- 2. Tenant policies: read for members, writes only while the clinic is writable
--    queue needs the Queue feature, payments need Revenue, records are clinical-only
-- ------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['patients','appointments','queue','medical_records','payments','clinic_monthly_usage'] loop
    execute format('drop policy if exists %I on public.%I', t || '_tenant', t);
  end loop;
end $$;

create policy patients_select on public.patients for select to authenticated
  using (clinic_id = public.get_my_clinic_id());
create policy patients_write on public.patients for all to authenticated
  using (clinic_id = public.get_my_clinic_id() and public.clinic_is_writable(clinic_id))
  with check (clinic_id = public.get_my_clinic_id() and public.clinic_is_writable(clinic_id));

create policy appointments_select on public.appointments for select to authenticated
  using (clinic_id = public.get_my_clinic_id());
create policy appointments_write on public.appointments for all to authenticated
  using (clinic_id = public.get_my_clinic_id() and public.clinic_is_writable(clinic_id))
  with check (clinic_id = public.get_my_clinic_id() and public.clinic_is_writable(clinic_id));

create policy queue_select on public.queue for select to authenticated
  using (clinic_id = public.get_my_clinic_id());
create policy queue_write on public.queue for all to authenticated
  using (clinic_id = public.get_my_clinic_id() and public.clinic_can(clinic_id, 'queue'))
  with check (clinic_id = public.get_my_clinic_id() and public.clinic_can(clinic_id, 'queue'));

create policy payments_select on public.payments for select to authenticated
  using (clinic_id = public.get_my_clinic_id());
create policy payments_write on public.payments for all to authenticated
  using (clinic_id = public.get_my_clinic_id() and public.clinic_can(clinic_id, 'revenue'))
  with check (clinic_id = public.get_my_clinic_id() and public.clinic_can(clinic_id, 'revenue'));

-- Diagnoses and prescriptions: admins and doctors only (not front-desk staff)
create policy medical_records_select on public.medical_records for select to authenticated
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'doctor', 'super_admin'));
create policy medical_records_write on public.medical_records for all to authenticated
  using (clinic_id = public.get_my_clinic_id() and public.clinic_is_writable(clinic_id)
         and public.get_my_role() in ('admin', 'doctor', 'super_admin'))
  with check (clinic_id = public.get_my_clinic_id() and public.clinic_is_writable(clinic_id)
              and public.get_my_role() in ('admin', 'doctor', 'super_admin'));

-- Usage is maintained by the patients trigger below; the browser only reads it
create policy clinic_monthly_usage_select on public.clinic_monthly_usage for select to authenticated
  using (clinic_id = public.get_my_clinic_id());

-- ------------------------------------------------------------
-- 3. Limits and gates as triggers
-- ------------------------------------------------------------

-- Staff seats: Starter 1, Pro 5, Premium unlimited (admin + doctors + staff)
create or replace function public.enforce_staff_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max int;
  v_count int;
begin
  if new.clinic_id is null or new.role not in ('admin', 'doctor', 'staff') then return new; end if;
  v_max := case public.clinic_effective_plan(new.clinic_id) when 'premium' then 999999 when 'pro' then 5 else 1 end;
  select count(*) into v_count from public.profiles
  where clinic_id = new.clinic_id and role in ('admin', 'doctor', 'staff');
  if v_count >= v_max then
    raise exception 'Staff limit reached for your plan (% of %). Upgrade to add more staff.', v_count, v_max
      using errcode = 'PT002';
  end if;
  return new;
end $$;

drop trigger if exists enforce_staff_limit on public.profiles;
create trigger enforce_staff_limit before insert on public.profiles
  for each row execute function public.enforce_staff_limit();

-- Branches: Premium only, max 5
create or replace function public.enforce_branch_limit()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if public.get_my_role() = 'super_admin' then return new; end if;
  if not public.clinic_can(new.clinic_id, 'multi_branch') then
    raise exception 'Multiple branches require the Premium plan';
  end if;
  if (select count(*) from public.branches where clinic_id = new.clinic_id) >= 5 then
    raise exception 'Branch limit reached (5)';
  end if;
  return new;
end $$;

drop trigger if exists enforce_branch_limit on public.branches;
create trigger enforce_branch_limit before insert on public.branches
  for each row execute function public.enforce_branch_limit();

-- Settings toggles that are plan-gated in the UI
create or replace function public.enforce_settings_gates()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if public.get_my_role() = 'super_admin' then return new; end if;

  if new.queue_enabled and not coalesce(old.queue_enabled, false)
     and not public.clinic_can(new.clinic_id, 'queue') then
    raise exception 'The queue system requires the Pro or Premium plan';
  end if;
  if new.multi_branch_enabled and not coalesce(old.multi_branch_enabled, false)
     and not public.clinic_can(new.clinic_id, 'multi_branch') then
    raise exception 'Multi-branch requires the Premium plan';
  end if;
  if new.booking_mode is distinct from old.booking_mode and new.booking_mode = 'hybrid'
     and not public.clinic_can(new.clinic_id, 'multi_branch') then
    raise exception 'Hybrid booking requires the Premium plan';
  end if;
  return new;
end $$;

drop trigger if exists enforce_settings_gates on public.clinic_settings;
create trigger enforce_settings_gates before update on public.clinic_settings
  for each row execute function public.enforce_settings_gates();

-- New patients per month: Starter 100, Pro 1000, Premium unlimited.
-- Counts every insert (staff or public) so the limit can't be skipped.
create or replace function public.enforce_patient_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max int;
  v_current int;
  v_month date := date_trunc('month', current_date)::date;
begin
  v_max := case public.clinic_effective_plan(new.clinic_id) when 'premium' then 999999 when 'pro' then 1000 else 100 end;

  insert into public.clinic_monthly_usage (clinic_id, new_patients_count, period_start)
  values (new.clinic_id, 0, v_month) on conflict (clinic_id) do nothing;
  update public.clinic_monthly_usage set new_patients_count = 0, period_start = v_month
  where clinic_id = new.clinic_id and period_start < v_month;

  select new_patients_count into v_current
  from public.clinic_monthly_usage where clinic_id = new.clinic_id for update;

  if v_current >= v_max then
    raise exception 'Monthly new patient limit reached (%/%). Upgrade your plan to add more patients this month.', v_current, v_max
      using errcode = 'PT001';
  end if;

  update public.clinic_monthly_usage set new_patients_count = new_patients_count + 1
  where clinic_id = new.clinic_id;
  return new;
end $$;

drop trigger if exists enforce_patient_limit on public.patients;
create trigger enforce_patient_limit before insert on public.patients
  for each row execute function public.enforce_patient_limit();

-- ------------------------------------------------------------
-- 4. Staff removal (clinic_id can no longer be changed from the browser at all)
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

  if new.id is distinct from old.id then raise exception 'Cannot change profile id'; end if;
  if new.role is distinct from old.role then raise exception 'Cannot change role'; end if;
  if new.clinic_id is distinct from old.clinic_id then raise exception 'Cannot change clinic'; end if;
  if new.branch_id is distinct from old.branch_id then
    if not (caller_role = 'admin' and old.clinic_id = caller_clinic) then
      raise exception 'Cannot change branch';
    end if;
  end if;
  return new;
end $$;

create or replace function public.remove_staff(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.get_my_role();
  v_clinic uuid := public.get_my_clinic_id();
  v_target public.profiles%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if v_role not in ('admin', 'super_admin') then raise exception 'Only admins can remove staff'; end if;

  select * into v_target from public.profiles where id = p_user_id;
  if not found or v_target.clinic_id is distinct from v_clinic then
    raise exception 'Staff member not found';
  end if;
  if v_target.id = auth.uid() then raise exception 'You cannot remove yourself'; end if;
  if v_target.role in ('admin', 'super_admin') then raise exception 'Admins cannot be removed here'; end if;

  update public.profiles set clinic_id = null, branch_id = null where id = p_user_id;
end $$;

revoke all on function public.remove_staff(uuid) from public, anon;
grant execute on function public.remove_staff(uuid) to authenticated;

-- ------------------------------------------------------------
-- 5. Double-booking: one active appointment per doctor + date + time slot
-- ------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from public.appointments
    where doctor_id is not null and time_slot is not null
      and status in ('pending', 'confirmed', 'in_queue')
    group by doctor_id, appointment_date, time_slot having count(*) > 1
  ) then
    raise notice 'Skipped appointments_doctor_slot_uniq: existing duplicate bookings. Resolve them, then re-run the CREATE UNIQUE INDEX statement.';
  else
    create unique index if not exists appointments_doctor_slot_uniq
      on public.appointments (doctor_id, appointment_date, time_slot)
      where doctor_id is not null and time_slot is not null
        and status in ('pending', 'confirmed', 'in_queue');
  end if;
end $$;

-- ------------------------------------------------------------
-- 6. Public booking: rate limits, slot check, read-only clinics, limit handled by trigger
-- ------------------------------------------------------------
create table if not exists public.public_booking_log (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null,
  ip text,
  contact text not null,
  created_at timestamptz not null default now()
);
create index if not exists public_booking_log_ip_idx on public.public_booking_log (ip, created_at);
create index if not exists public_booking_log_contact_idx on public.public_booking_log (clinic_id, contact, created_at);
alter table public.public_booking_log enable row level security;
revoke all on public.public_booking_log from anon, authenticated;

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
  v_slot text := nullif(trim(coalesce(p_time_slot, '')), '');
  v_ip text;
  v_patient_id uuid;
  v_patient_email text;
  v_appt uuid;
begin
  select * into v_clinic from public.clinics where id = p_clinic_id and status = 'active';
  if not found then raise exception 'Clinic not found'; end if;
  if not public.clinic_is_writable(p_clinic_id) then
    raise exception 'This clinic is not accepting online bookings right now. Please contact the clinic directly.';
  end if;

  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'Please enter your full name'; end if;
  if length(v_contact) < 5 or length(v_contact) > 30 then raise exception 'Please enter a valid contact number'; end if;
  if v_email is not null and (length(v_email) > 254 or position('@' in v_email) = 0) then
    raise exception 'Please enter a valid email';
  end if;
  if p_appointment_date is null or p_appointment_date < current_date
     or p_appointment_date > current_date + 365 then
    raise exception 'Please choose a valid appointment date';
  end if;
  if length(coalesce(p_notes, '')) > 1000 or length(coalesce(v_slot, '')) > 50
     or length(coalesce(p_service_category, '')) > 100 or length(coalesce(p_service_name, '')) > 100 then
    raise exception 'Some fields are too long';
  end if;

  if p_branch_id is not null and not exists (
    select 1 from public.branches where id = p_branch_id and clinic_id = p_clinic_id
  ) then raise exception 'Branch not found'; end if;

  if p_doctor_id is not null and not exists (
    select 1 from public.profiles where id = p_doctor_id and clinic_id = p_clinic_id and role = 'doctor'
  ) then raise exception 'Doctor not found'; end if;

  -- Rate limits (client IP comes from the API gateway headers; absent in direct SQL)
  v_ip := nullif(trim(split_part(coalesce(
            (nullif(current_setting('request.headers', true), '')::jsonb) ->> 'x-forwarded-for', ''), ',', 1)), '');
  if v_ip is not null and (
    select count(*) from public.public_booking_log
    where ip = v_ip and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many booking attempts. Please try again later.';
  end if;
  if (select count(*) from public.public_booking_log
      where clinic_id = p_clinic_id and contact = v_contact
        and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Too many bookings for this contact number today. Please contact the clinic directly.';
  end if;

  if p_doctor_id is not null and v_slot is not null and exists (
    select 1 from public.appointments
    where doctor_id = p_doctor_id and appointment_date = p_appointment_date and time_slot = v_slot
      and status in ('pending', 'confirmed', 'in_queue')
  ) then
    raise exception 'That time slot is already taken. Please choose another time.';
  end if;

  -- Find or create the patient (new patients are counted against the plan by a trigger)
  select id, email into v_patient_id, v_patient_email
  from public.patients where clinic_id = p_clinic_id and contact_number = v_contact limit 1;

  if v_patient_id is not null then
    if v_email is not null and v_patient_email is null then
      update public.patients set email = v_email where id = v_patient_id;
    end if;
  else
    begin
      insert into public.patients (clinic_id, branch_id, full_name, contact_number, email)
      values (p_clinic_id, p_branch_id, v_name, v_contact, v_email)
      returning id into v_patient_id;
    exception when sqlstate 'PT001' then
      raise exception 'This clinic is not accepting new patients right now. Please contact the clinic directly.';
    end;
  end if;

  insert into public.appointments
    (clinic_id, branch_id, patient_id, doctor_id, appointment_date, time_slot,
     status, notes, service_category, service_name)
  values
    (p_clinic_id, p_branch_id, v_patient_id, p_doctor_id, p_appointment_date,
     v_slot, 'confirmed', nullif(p_notes, ''),
     nullif(p_service_category, ''), nullif(p_service_name, ''))
  returning id into v_appt;

  insert into public.public_booking_log (clinic_id, ip, contact) values (p_clinic_id, v_ip, v_contact);

  return v_appt;
end $$;

-- ------------------------------------------------------------
-- 7. Subscription expiry (runs daily)
-- ------------------------------------------------------------
create or replace function public.expire_subscriptions()
returns void language plpgsql security definer set search_path = public as $$
declare
  v_lapsed uuid[];
begin
  -- Checkout sessions nobody paid within a day
  update public.subscriptions set status = 'cancelled', updated_at = now()
  where status = 'pending' and created_at < now() - interval '24 hours';

  -- Active plans past their billing date + 3-day grace
  with e as (
    update public.subscriptions set status = 'expired', updated_at = now()
    where status = 'active' and next_billing_date < now() - interval '3 days'
    returning clinic_id, reference_number
  )
  select coalesce(array_agg(distinct clinic_id) filter (where reference_number not like 'TRIAL-%'), '{}')
  into v_lapsed from e;

  -- Paid clinics with nothing active left fall back to Starter.
  -- (Trial subscriptions are skipped: an ended trial is handled as read-only, not a downgrade.)
  update public.clinics c set plan = 'starter'
  where c.id = any (v_lapsed) and c.is_trial = false and c.plan <> 'starter'
    and not exists (select 1 from public.subscriptions s where s.clinic_id = c.id and s.status = 'active');

  delete from public.public_booking_log where created_at < now() - interval '2 days';
end $$;

revoke all on function public.expire_subscriptions() from public, anon, authenticated;

-- Schedule it daily at 02:00 UTC when pg_cron is available (it is on Supabase)
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if exists (select 1 from cron.job where jobname = 'expire-subscriptions') then
      perform cron.unschedule('expire-subscriptions');
    end if;
    perform cron.schedule('expire-subscriptions', '0 2 * * *', 'select public.expire_subscriptions()');
  else
    raise notice 'pg_cron not available: schedule public.expire_subscriptions() manually';
  end if;
exception when others then
  raise notice 'Could not schedule expire-subscriptions (%). Schedule public.expire_subscriptions() manually.', sqlerrm;
end $$;

commit;
