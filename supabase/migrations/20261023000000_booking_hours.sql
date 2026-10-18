-- ============================================================
-- CONFIGURABLE BOOKING HOURS
-- Every clinic sets its own opening days, hours, break, appointment length and days closed
-- (Settings > Booking hours). Until a clinic sets them, the original schedule applies:
-- every day, hourly from 8:00 AM to 5:00 PM with a 12:00-1:00 PM break.
--  * clinic_settings.booking_hours (jsonb, null = the default above), validated by the database
--  * booking_slots(clinic, date): the time labels patients may book that day ('8:00 AM', ...)
--  * book_public_appointment() now refuses closed days and times that are not on the clinic's grid
-- The same rules are in src/utils/bookingHours.ts (the booking page and Settings use it).
-- ============================================================
begin;

create or replace function public.default_booking_hours()
returns jsonb language sql immutable as $$
  select jsonb_build_object(
    'slot_minutes', 60,
    'closed_dates', '[]'::jsonb,
    'days', jsonb_build_object(
      'mon', d.day, 'tue', d.day, 'wed', d.day, 'thu', d.day, 'fri', d.day, 'sat', d.day, 'sun', d.day)
  )
  from (select jsonb_build_object('open', true, 'start', '08:00', 'end', '17:00',
                                  'break_start', '12:00', 'break_end', '13:00') as day) d
$$;

create or replace function public.hhmm_to_minutes(p_time text)
returns int language sql immutable as $$
  select split_part(p_time, ':', 1)::int * 60 + split_part(p_time, ':', 2)::int
$$;

-- Is this a well-formed schedule? (used by the CHECK below, so bad data can never be saved)
create or replace function public.valid_booking_hours(p jsonb)
returns boolean language plpgsql immutable as $$
declare
  v_len int;
  v_key text;
  v_day jsonb;
  v_start int;
  v_end int;
  v_bs int;
  v_be int;
  v_time constant text := '^([01][0-9]|2[0-3]):[0-5][0-9]$';
  v_open_days int := 0;
  v_date text;
begin
  if p is null then return true; end if;
  if jsonb_typeof(p) <> 'object' then return false; end if;
  if jsonb_typeof(p->'slot_minutes') <> 'number' then return false; end if;
  v_len := (p->>'slot_minutes')::numeric::int;
  if (p->>'slot_minutes')::numeric <> v_len or v_len not in (10, 15, 20, 30, 45, 60, 90, 120) then return false; end if;

  if jsonb_typeof(p->'days') <> 'object' then return false; end if;
  foreach v_key in array array['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] loop
    v_day := p->'days'->v_key;
    if v_day is null or jsonb_typeof(v_day) <> 'object' then return false; end if;
    if jsonb_typeof(v_day->'open') <> 'boolean' then return false; end if;
    if (v_day->>'open')::boolean then
      v_open_days := v_open_days + 1;
      if jsonb_typeof(v_day->'start') <> 'string' or jsonb_typeof(v_day->'end') <> 'string' then return false; end if;
      if (v_day->>'start') !~ v_time or (v_day->>'end') !~ v_time then return false; end if;
      v_start := public.hhmm_to_minutes(v_day->>'start');
      v_end := public.hhmm_to_minutes(v_day->>'end');
      if v_end - v_start < v_len then return false; end if;      -- room for at least one appointment
      if (v_end - v_start) / v_len > 48 then return false; end if; -- at most 48 a day
      if coalesce(jsonb_typeof(v_day->'break_start'), 'null') <> 'null' or coalesce(jsonb_typeof(v_day->'break_end'), 'null') <> 'null' then
        if jsonb_typeof(v_day->'break_start') <> 'string' or jsonb_typeof(v_day->'break_end') <> 'string' then return false; end if;
        if (v_day->>'break_start') !~ v_time or (v_day->>'break_end') !~ v_time then return false; end if;
        v_bs := public.hhmm_to_minutes(v_day->>'break_start');
        v_be := public.hhmm_to_minutes(v_day->>'break_end');
        if v_bs >= v_be or v_bs < v_start or v_be > v_end then return false; end if;
      end if;
    end if;
  end loop;
  if v_open_days = 0 then return false; end if;

  if jsonb_typeof(p->'closed_dates') <> 'array' or jsonb_array_length(p->'closed_dates') > 366 then return false; end if;
  for v_date in select jsonb_array_elements_text(p->'closed_dates') loop
    if v_date !~ '^\d{4}-\d{2}-\d{2}$' then return false; end if;
    begin
      perform v_date::date;
    exception when others then
      return false;
    end;
  end loop;
  return true;
end $$;

alter table public.clinic_settings add column if not exists booking_hours jsonb;
alter table public.clinic_settings drop constraint if exists clinic_settings_booking_hours_valid;
alter table public.clinic_settings add constraint clinic_settings_booking_hours_valid
  check (public.valid_booking_hours(booking_hours));

-- The times patients may book on a date, as labels like '8:00 AM', in order
create or replace function public.booking_slots(p_clinic uuid, p_date date)
returns text[] language plpgsql stable security definer set search_path = public as $$
declare
  v_hours jsonb;
  v_day jsonb;
  v_len int;
  v_start int;
  v_end int;
  v_bs int;
  v_be int;
  v_t int;
  v_out text[] := '{}';
begin
  select booking_hours into v_hours from public.clinic_settings where clinic_id = p_clinic;
  v_hours := coalesce(v_hours, public.default_booking_hours());

  if v_hours->'closed_dates' ? p_date::text then return v_out; end if;

  v_day := v_hours->'days'->(array['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'])[extract(dow from p_date)::int + 1];
  if not (v_day->>'open')::boolean then return v_out; end if;

  v_len := (v_hours->>'slot_minutes')::int;
  v_start := public.hhmm_to_minutes(v_day->>'start');
  v_end := public.hhmm_to_minutes(v_day->>'end');
  if coalesce(jsonb_typeof(v_day->'break_start'), 'null') = 'string' then
    v_bs := public.hhmm_to_minutes(v_day->>'break_start');
    v_be := public.hhmm_to_minutes(v_day->>'break_end');
  end if;

  v_t := v_start;
  while v_t + v_len <= v_end loop
    -- skip a slot that touches the break
    if v_bs is null or not (v_t < v_be and v_t + v_len > v_bs) then
      v_out := v_out || to_char(time '00:00' + make_interval(mins => v_t), 'FMHH12:MI AM');
    end if;
    v_t := v_t + v_len;
  end loop;
  return v_out;
end $$;

revoke all on function public.booking_slots(uuid, date) from public;
grant execute on function public.booking_slots(uuid, date) to anon, authenticated;

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

  -- The clinic's own booking hours (Settings): open day, a real slot on that day's grid
  if cardinality(public.booking_slots(p_clinic_id, p_appointment_date)) = 0 then
    raise exception 'The clinic is not taking bookings on that day. Please choose another date.';
  end if;
  if v_slot is not null and not (v_slot = any(public.booking_slots(p_clinic_id, p_appointment_date))) then
    raise exception 'That time is not available for booking. Please choose another time.';
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

  -- Patients booking at the same moment are handled one at a time per clinic/date/time,
  -- so two of them can't both pass the availability check for the last place.
  -- (Staff inserts don't go through here: front desk may always squeeze someone in.)
  perform pg_advisory_xact_lock(hashtextextended(p_clinic_id::text || '|' || p_appointment_date::text || '|' || coalesce(v_slot, ''), 0));

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
