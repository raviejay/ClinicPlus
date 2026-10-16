-- ============================================================
-- STAFF MANAGEMENT
--  * profiles.is_active: an admin can deactivate a doctor/staff account without deleting it.
--    A deactivated user keeps their row (history stays intact) but loses all clinic access at once:
--    the helpers every policy uses return nothing for them.
--  * update_staff_member(): admin edits a team member's name, role and branch.
--  * Passwords are reset (and accounts banned) by the manage-staff Edge Function, which holds the
--    secret key; the browser can never change is_active itself.
-- ============================================================
begin;

alter table public.profiles add column if not exists is_active boolean not null default true;

-- Deactivated users resolve to "no clinic, no role", so RLS and every definer check lock them out
create or replace function public.get_my_clinic_id()
returns uuid language sql stable security definer set search_path = public as $$
  select clinic_id from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.get_my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

-- Same guard as before, plus: is_active can only be changed by the server (or a super admin)
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
  if new.is_active is distinct from old.is_active then raise exception 'Cannot change account status'; end if;
  if new.branch_id is distinct from old.branch_id then
    if not (caller_role = 'admin' and old.clinic_id = caller_clinic) then
      raise exception 'Cannot change branch';
    end if;
  end if;
  return new;
end $$;

-- An admin edits a doctor's or staff member's details (never another admin, never themselves here)
create or replace function public.update_staff_member(
  p_user_id uuid, p_full_name text, p_role text, p_branch_id uuid
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.get_my_role();
  v_clinic uuid := public.get_my_clinic_id();
  v_target public.profiles%rowtype;
  v_name text := btrim(coalesce(p_full_name, ''));
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if v_role not in ('admin', 'super_admin') then raise exception 'Only admins can edit staff'; end if;

  select * into v_target from public.profiles where id = p_user_id;
  if not found or v_target.clinic_id is distinct from v_clinic then raise exception 'Staff member not found'; end if;
  if v_target.id = auth.uid() then raise exception 'You cannot edit your own role here'; end if;
  if v_target.role in ('admin', 'super_admin') then raise exception 'Admins cannot be edited here'; end if;

  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'Enter a name (2 to 120 characters)'; end if;
  if p_role not in ('doctor', 'staff') then raise exception 'Role must be doctor or staff'; end if;
  if p_branch_id is not null and not exists (
    select 1 from public.branches where id = p_branch_id and clinic_id = v_clinic
  ) then raise exception 'Branch not found'; end if;

  update public.profiles set full_name = v_name, role = p_role, branch_id = p_branch_id where id = p_user_id;
end $$;

revoke all on function public.update_staff_member(uuid, text, text, uuid) from public, anon;
grant execute on function public.update_staff_member(uuid, text, text, uuid) to authenticated;

commit;
