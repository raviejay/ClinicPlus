-- ============================================================
-- IN-APP NOTIFICATIONS
-- When a patient books online, the clinic's team is told straight away (bell, toast, sound).
--  * notifications: one row per event, per clinic. Members read; nobody writes from the browser.
--  * profiles.notifications_seen_at: what each person has already looked at (unread = newer than this)
--  * a trigger on appointments creates the notification for ONLINE bookings only
--    (staff who book a patient themselves do not need an alert about their own action)
-- ============================================================
begin;

alter table public.profiles add column if not exists notifications_seen_at timestamptz not null default now();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete cascade,
  type text not null check (type in ('new_appointment')),
  title text not null check (length(title) <= 120),
  body text not null check (length(body) <= 300),
  appointment_id uuid references public.appointments(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists notifications_clinic_created_idx on public.notifications (clinic_id, created_at desc);

-- The branch a team member is limited to (null = the whole clinic)
create or replace function public.get_my_branch_id()
returns uuid language sql stable security definer set search_path = public as $$
  select branch_id from public.profiles where id = auth.uid() and is_active
$$;

alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated using (
  clinic_id = public.get_my_clinic_id()
  and (public.get_my_branch_id() is null or branch_id = public.get_my_branch_id())
);
-- no insert / update / delete policies: only the trigger below (and the server) write here

revoke all on public.notifications from anon;
revoke insert, update, delete on public.notifications from authenticated;
grant select on public.notifications to authenticated;

-- ------------------------------------------------------------
-- Online booking -> notification
-- ------------------------------------------------------------
create or replace function public.notify_new_online_appointment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_when text;
begin
  -- A signed-in team member is booking for a patient: no alert. Online visitors are not signed in.
  if auth.uid() is not null then return new; end if;
  if new.status in ('cancelled', 'no_show', 'completed') then return new; end if;

  select full_name into v_name from public.patients where id = new.patient_id;
  v_when := to_char(new.appointment_date, 'Mon FMDD') || coalesce(' at ' || new.time_slot, '');

  insert into public.notifications (clinic_id, branch_id, type, title, body, appointment_id)
  values (
    new.clinic_id, new.branch_id, 'new_appointment', 'New online appointment',
    left(coalesce(v_name, 'A patient') || ' booked for ' || v_when
      || coalesce(' · ' || nullif(new.service_name, ''), ''), 300),
    new.id
  );

  -- Keep the table small: a month of history is plenty
  delete from public.notifications where clinic_id = new.clinic_id and created_at < now() - interval '30 days';
  return new;
end $$;

drop trigger if exists notify_new_online_appointment on public.appointments;
create trigger notify_new_online_appointment after insert on public.appointments
  for each row execute function public.notify_new_online_appointment();

-- Live updates (Supabase only: the publication does not exist in the local test database)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

commit;
