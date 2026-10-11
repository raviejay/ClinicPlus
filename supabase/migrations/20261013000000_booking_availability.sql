-- ============================================================
-- BOOKING AVAILABILITY
--  * Public booking page can see which time slots are already taken
--  * Optional per-clinic "patients per time slot" (default: number of doctors)
--  * Same rule enforced when booking, so the page can never show a slot as free
--    that the server will refuse
--  * "Today" and "time has passed" are judged in Asia/Manila, not UTC
-- ============================================================
begin;

alter table public.clinic_settings
  add column if not exists slot_capacity integer
  check (slot_capacity is null or slot_capacity between 1 and 50);

-- How many patients one time slot can take at a location.
-- Explicit setting wins; otherwise one per doctor at that location; no doctors = unlimited (null).
create or replace function public.clinic_slot_capacity(p_clinic uuid, p_branch uuid)
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(
    (select slot_capacity from public.clinic_settings where clinic_id = p_clinic),
    (select nullif(count(*), 0)::int from public.profiles p
      where p.clinic_id = p_clinic and p.role = 'doctor' and p.branch_id is not distinct from p_branch)
  )
$$;

-- True when this doctor/slot can't take another booking
create or replace function public.slot_unavailable(
  p_clinic uuid, p_date date, p_slot text, p_doctor uuid, p_branch uuid
) returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_cap int;
  v_count int;
begin
  if p_slot is null then return false; end if;

  if p_doctor is not null and exists (
    select 1 from public.appointments
    where clinic_id = p_clinic and doctor_id = p_doctor and appointment_date = p_date
      and time_slot = p_slot and status in ('pending', 'confirmed', 'in_queue')
  ) then return true; end if;

  v_cap := public.clinic_slot_capacity(p_clinic, p_branch);
  if v_cap is not null then
    select count(*) into v_count from public.appointments
    where clinic_id = p_clinic and appointment_date = p_date and time_slot = p_slot
      and status in ('pending', 'confirmed', 'in_queue')
      and branch_id is not distinct from p_branch;
    if v_count >= v_cap then return true; end if;
  end if;

  return false;
end $$;

revoke all on function public.clinic_slot_capacity(uuid, uuid) from public, anon, authenticated;
revoke all on function public.slot_unavailable(uuid, date, text, uuid, uuid) from public, anon, authenticated;

-- What the booking page calls: taken slots for a date (+ doctor), and the clinic's "now"
create or replace function public.get_public_availability(
  p_clinic_id uuid,
  p_date date,
  p_doctor_id uuid default null,
  p_branch_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  v_now timestamp := now() at time zone 'Asia/Manila';
  v_booked text[];
begin
  if p_date is null or not exists (select 1 from public.clinics where id = p_clinic_id and status = 'active') then
    return null;
  end if;

  select coalesce(array_agg(s.time_slot order by s.time_slot), '{}') into v_booked
  from (
    select distinct a.time_slot from public.appointments a
    where a.clinic_id = p_clinic_id and a.appointment_date = p_date and a.time_slot is not null
      and a.status in ('pending', 'confirmed', 'in_queue')
  ) s
  where public.slot_unavailable(p_clinic_id, p_date, s.time_slot, p_doctor_id, p_branch_id);

  return jsonb_build_object(
    'booked', to_jsonb(v_booked),
    'today', v_now::date,
    'minutes', (extract(hour from v_now) * 60 + extract(minute from v_now))::int
  );
end $$;

revoke all on function public.get_public_availability(uuid, date, uuid, uuid) from public;
grant execute on function public.get_public_availability(uuid, date, uuid, uuid) to anon, authenticated;

-- ------------------------------------------------------------
-- Booking function: same slot rule + Manila-time date/past-time checks
-- ------------------------------------------------------------
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
  v_now timestamp := now() at time zone 'Asia/Manila';
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
  if p_appointment_date is null or p_appointment_date < v_now::date
     or p_appointment_date > v_now::date + 365 then
    raise exception 'Please choose a valid appointment date';
  end if;
  if length(coalesce(p_notes, '')) > 1000 or length(coalesce(v_slot, '')) > 50
     or length(coalesce(p_service_category, '')) > 100 or length(coalesce(p_service_name, '')) > 100 then
    raise exception 'Some fields are too long';
  end if;

  -- A time slot that already started today can't be booked (slot labels look like '9:00 AM')
  if v_slot is not null and p_appointment_date = v_now::date then
    begin
      if p_appointment_date + to_timestamp(v_slot, 'HH12:MI AM')::time <= v_now then
        raise exception 'That time has already passed. Please choose a later time.';
      end if;
    exception when invalid_datetime_format or invalid_parameter_value or datetime_field_overflow then
      null; -- free-text slot we can't parse: skip the check
    end;
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

  if public.slot_unavailable(p_clinic_id, p_appointment_date, v_slot, p_doctor_id, p_branch_id) then
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

commit;
