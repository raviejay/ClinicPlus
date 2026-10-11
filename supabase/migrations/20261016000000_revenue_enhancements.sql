-- ============================================================
-- REVENUE ENHANCEMENTS
--  * Payments are records of money: no edits or deletes from the browser.
--    Mistakes are voided, returned money is refunded — both with a reason and who did it.
--  * Receipt numbers (per clinic, sequential), recorded_by, description, reference, notes
--  * Amounts must be positive; patient/appointment must belong to the same clinic
--  * get_revenue_report(): one call for totals, daily trend and breakdowns, in Manila days
--    (replaces the dashboard firing 365 queries)
--  * get_unpaid_appointments(): completed visits nobody has paid for yet
-- Wrapped in a transaction: any error rolls it all back.
-- ============================================================
begin;

-- ------------------------------------------------------------
-- 1. Columns
-- ------------------------------------------------------------
alter table public.payments
  add column if not exists description text,
  add column if not exists notes text,
  add column if not exists reference text,
  add column if not exists receipt_number text,
  add column if not exists recorded_by uuid references public.profiles(id) on delete set null,
  add column if not exists status_reason text,
  add column if not exists status_changed_at timestamptz,
  add column if not exists status_changed_by uuid references public.profiles(id) on delete set null;

alter table public.payments
  add constraint payments_text_lengths check (
    (description is null or length(description) <= 200)
    and (notes is null or length(notes) <= 1000)
    and (reference is null or length(reference) <= 100)
    and (status_reason is null or length(status_reason) <= 300)
  );

-- 'voided' = entered by mistake (excluded from everything); 'refunded' = money given back
do $$
declare c record;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.payments'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%' and pg_get_constraintdef(oid) not ilike '%payment_method%'
      and conname <> 'payments_text_lengths'
  loop
    execute format('alter table public.payments drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.payments
  add constraint payments_status_check check (status in ('paid', 'refunded', 'pending', 'voided'));

alter table public.appointments add column if not exists no_charge boolean not null default false;

create index if not exists payments_clinic_paid_at_idx on public.payments (clinic_id, paid_at desc);
create index if not exists payments_appointment_idx on public.payments (appointment_id) where appointment_id is not null;

-- ------------------------------------------------------------
-- 2. Receipt numbers
-- ------------------------------------------------------------
create table if not exists public.clinic_receipt_counters (
  clinic_id uuid primary key references public.clinics(id) on delete cascade,
  last_number integer not null default 0
);
alter table public.clinic_receipt_counters enable row level security;
revoke all on public.clinic_receipt_counters from anon, authenticated;

-- Number what already exists, oldest first, then continue from there
with numbered as (
  select id, row_number() over (partition by clinic_id order by created_at, id) as n
  from public.payments where receipt_number is null
)
update public.payments p set receipt_number = 'R-' || lpad(numbered.n::text, 6, '0')
from numbered where p.id = numbered.id;

insert into public.clinic_receipt_counters (clinic_id, last_number)
select clinic_id, count(*) from public.payments group by clinic_id
on conflict (clinic_id) do update set last_number = greatest(clinic_receipt_counters.last_number, excluded.last_number);

create unique index if not exists payments_receipt_unique on public.payments (clinic_id, receipt_number);

-- Added after the receipt backfill above: even a NOT VALID check is re-tested whenever an old row
-- is updated, so an old zero-amount row would have broken the backfill.
-- New rows must be positive. Older rows are checked too, unless some already break the rule.
alter table public.payments add constraint payments_amount_positive check (amount > 0) not valid;
do $$
begin
  alter table public.payments validate constraint payments_amount_positive;
exception when check_violation then
  raise notice 'Some existing payments have an amount of 0 or less. New payments are protected; review the old ones, then run: ALTER TABLE payments VALIDATE CONSTRAINT payments_amount_positive;';
end $$;

-- ------------------------------------------------------------
-- 3. Guard new payments. Two triggers, fired in name order:
--    a_guard_payment_insert  (invoker: knows whether the caller is a browser session)
--    b_assign_receipt_number (definer: may touch the counter table)
-- ------------------------------------------------------------
create or replace function public.guard_payment_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.patients where id = new.patient_id and clinic_id = new.clinic_id) then
    raise exception 'That patient does not belong to this clinic';
  end if;
  if new.appointment_id is not null and not exists (
    select 1 from public.appointments where id = new.appointment_id and clinic_id = new.clinic_id and patient_id = new.patient_id
  ) then
    raise exception 'That appointment does not belong to this patient';
  end if;
  if new.branch_id is not null and not exists (
    select 1 from public.branches where id = new.branch_id and clinic_id = new.clinic_id
  ) then
    raise exception 'That branch does not belong to this clinic';
  end if;

  if current_user in ('authenticated', 'anon') then
    -- The browser can only record payments; refunds and voids go through the functions below
    if new.status not in ('paid', 'pending') then
      raise exception 'Payments are recorded as paid or pending';
    end if;
    new.status_reason := null;
    new.status_changed_at := null;
    new.status_changed_by := null;
    new.recorded_by := auth.uid();
    new.receipt_number := null;
  end if;
  return new;
end $$;

create or replace function public.assign_receipt_number()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_number integer;
begin
  if new.receipt_number is null then
    insert into public.clinic_receipt_counters (clinic_id, last_number) values (new.clinic_id, 1)
    on conflict (clinic_id) do update set last_number = clinic_receipt_counters.last_number + 1
    returning last_number into v_number;
    new.receipt_number := 'R-' || lpad(v_number::text, 6, '0');
  end if;
  return new;
end $$;

drop trigger if exists prepare_payment on public.payments;
drop function if exists public.prepare_payment();
drop trigger if exists a_guard_payment_insert on public.payments;
drop trigger if exists b_assign_receipt_number on public.payments;
create trigger a_guard_payment_insert before insert on public.payments
  for each row execute function public.guard_payment_insert();
create trigger b_assign_receipt_number before insert on public.payments
  for each row execute function public.assign_receipt_number();

-- ------------------------------------------------------------
-- 4. Policies: members can read and record; nobody edits or deletes from the browser
-- ------------------------------------------------------------
drop policy if exists payments_write on public.payments;
drop policy if exists payments_insert on public.payments;

create policy payments_insert on public.payments for insert to authenticated
  with check (clinic_id = public.get_my_clinic_id() and public.clinic_can(clinic_id, 'revenue'));

revoke update, delete, truncate on public.payments from anon, authenticated;

-- ------------------------------------------------------------
-- 5. Refund and void
-- ------------------------------------------------------------
create or replace function public.refund_payment(p_payment_id uuid, p_reason text)
returns public.payments language plpgsql security definer set search_path = public as $$
declare
  v_pay public.payments%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if public.get_my_role() not in ('admin', 'super_admin') then raise exception 'Only admins can refund payments'; end if;
  if length(v_reason) < 3 or length(v_reason) > 300 then raise exception 'Please give a reason (3-300 characters)'; end if;

  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found or v_pay.clinic_id is distinct from public.get_my_clinic_id() then raise exception 'Payment not found'; end if;
  if v_pay.status <> 'paid' then raise exception 'Only paid payments can be refunded'; end if;

  update public.payments
  set status = 'refunded', status_reason = v_reason, status_changed_at = now(), status_changed_by = auth.uid()
  where id = p_payment_id returning * into v_pay;
  return v_pay;
end $$;

-- Void = entered by mistake. Admins any time; the person who recorded it within 15 minutes.
create or replace function public.void_payment(p_payment_id uuid, p_reason text)
returns public.payments language plpgsql security definer set search_path = public as $$
declare
  v_pay public.payments%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
  v_is_admin boolean := public.get_my_role() in ('admin', 'super_admin');
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if length(v_reason) < 3 or length(v_reason) > 300 then raise exception 'Please give a reason (3-300 characters)'; end if;

  select * into v_pay from public.payments where id = p_payment_id for update;
  if not found or v_pay.clinic_id is distinct from public.get_my_clinic_id() then raise exception 'Payment not found'; end if;
  if v_pay.status not in ('paid', 'pending') then raise exception 'This payment can no longer be voided'; end if;

  if not v_is_admin and not (v_pay.recorded_by = auth.uid() and v_pay.created_at > localtimestamp - interval '15 minutes') then
    raise exception 'Only an admin can void this payment (you can void your own entry within 15 minutes)';
  end if;

  update public.payments
  set status = 'voided', status_reason = v_reason, status_changed_at = now(), status_changed_by = auth.uid()
  where id = p_payment_id returning * into v_pay;
  return v_pay;
end $$;

revoke all on function public.refund_payment(uuid, text) from public, anon;
revoke all on function public.void_payment(uuid, text) from public, anon;
grant execute on function public.refund_payment(uuid, text) to authenticated;
grant execute on function public.void_payment(uuid, text) to authenticated;

-- ------------------------------------------------------------
-- 6. Revenue report (Manila days). Row-level security applies: callers only see their clinic.
--    Net revenue = paid payments. Refunds are reported separately; voided entries don't exist.
-- ------------------------------------------------------------
create or replace function public.get_revenue_report(
  p_from date,
  p_to date,
  p_all_branches boolean default true,
  p_branch_id uuid default null
) returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  v_from_utc timestamp := p_from::timestamp - interval '8 hours';
  v_to_utc timestamp := (p_to + 1)::timestamp - interval '8 hours';
  v_result jsonb;
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 800 then
    raise exception 'Invalid date range';
  end if;

  with base as (
    select p.id, p.amount, p.status, p.payment_method, p.patient_id, p.branch_id, p.description,
           (p.paid_at + interval '8 hours')::date as day,
           a.doctor_id as doctor_id, a.service_name as appt_service
    from public.payments p
    left join public.appointments a on a.id = p.appointment_id
    where p.paid_at >= v_from_utc and p.paid_at < v_to_utc
      and p.status in ('paid', 'refunded')
      and (p_all_branches or p.branch_id is not distinct from p_branch_id)
  ),
  paid as (select * from base where status = 'paid')
  select jsonb_build_object(
    'totals', (select jsonb_build_object(
        'net', coalesce(sum(amount), 0), 'count', count(*),
        'patients', count(distinct patient_id), 'average', coalesce(round(avg(amount), 2), 0)) from paid),
    'refunds', (select jsonb_build_object('amount', coalesce(sum(amount), 0), 'count', count(*))
                from base where status = 'refunded'),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('date', d.day, 'amount', d.amt, 'count', d.c) order by d.day)
                       from (select day, sum(amount) as amt, count(*) as c from paid group by day) d), '[]'::jsonb),
    'by_method', coalesce((select jsonb_agg(jsonb_build_object('method', m.payment_method, 'amount', m.amt, 'count', m.c) order by m.amt desc)
                           from (select payment_method, sum(amount) as amt, count(*) as c from paid group by payment_method) m), '[]'::jsonb),
    'by_doctor', coalesce((select jsonb_agg(jsonb_build_object('doctor_id', x.doctor_id, 'name', x.name, 'amount', x.amt, 'count', x.c) order by x.amt desc)
                           from (select pd.doctor_id, coalesce(pr.full_name, 'Not linked to a doctor') as name, sum(pd.amount) as amt, count(*) as c
                                 from paid pd left join public.profiles pr on pr.id = pd.doctor_id
                                 group by pd.doctor_id, pr.full_name) x), '[]'::jsonb),
    'by_service', coalesce((select jsonb_agg(jsonb_build_object('service', s.service, 'amount', s.amt, 'count', s.c) order by s.amt desc)
                            from (select coalesce(nullif(trim(description), ''), appt_service, 'Other') as service, sum(amount) as amt, count(*) as c
                                  from paid group by 1) s), '[]'::jsonb),
    'by_branch', coalesce((select jsonb_agg(jsonb_build_object('branch_id', b.branch_id, 'name', b.name, 'amount', b.amt, 'count', b.c) order by b.amt desc)
                           from (select pd.branch_id, coalesce(br.name, 'Main clinic') as name, sum(pd.amount) as amt, count(*) as c
                                 from paid pd left join public.branches br on br.id = pd.branch_id
                                 group by pd.branch_id, br.name) b), '[]'::jsonb)
  ) into v_result;

  return v_result;
end $$;

revoke all on function public.get_revenue_report(date, date, boolean, uuid) from public, anon;
grant execute on function public.get_revenue_report(date, date, boolean, uuid) to authenticated;

-- ------------------------------------------------------------
-- 7. Completed visits with nothing paid yet. A same-day payment by the same patient that
--    isn't linked to an appointment (older entries) counts as paid.
-- ------------------------------------------------------------
create or replace function public.get_unpaid_appointments(
  p_from date,
  p_to date,
  p_all_branches boolean default true,
  p_branch_id uuid default null
) returns table (
  appointment_id uuid, appointment_date date, time_slot text, patient_id uuid, patient_name text,
  contact_number text, service_name text, doctor_name text, branch_id uuid
) language sql stable security invoker set search_path = public as $$
  select a.id, a.appointment_date, a.time_slot, a.patient_id, pt.full_name, pt.contact_number,
         a.service_name, d.full_name, a.branch_id
  from public.appointments a
  join public.patients pt on pt.id = a.patient_id
  left join public.profiles d on d.id = a.doctor_id
  where a.status = 'completed' and not a.no_charge
    and a.appointment_date between p_from and p_to
    and (p_all_branches or a.branch_id is not distinct from p_branch_id)
    and not exists (
      select 1 from public.payments p
      where p.status = 'paid'
        and (p.appointment_id = a.id
             or (p.appointment_id is null and p.patient_id = a.patient_id
                 and (p.paid_at + interval '8 hours')::date = a.appointment_date))
    )
  order by a.appointment_date desc, a.time_slot
$$;

revoke all on function public.get_unpaid_appointments(date, date, boolean, uuid) from public, anon;
grant execute on function public.get_unpaid_appointments(date, date, boolean, uuid) to authenticated;

commit;
