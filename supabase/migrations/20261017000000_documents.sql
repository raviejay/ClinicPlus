-- ============================================================
-- DOCUMENTS: designable templates + numbered, saved, reprintable certificates and prescriptions
--  * document_templates: a clinic's own layouts (drag-and-drop designer). Admins edit, everyone reads.
--  * issued_documents: every certificate / prescription that is issued, with a number, the exact
--    layout and data used (so a reprint is identical even if the template changes later).
--    Written only through issue_document(); voided through void_document() with a reason.
--  * Layouts are validated in the database (size, element types, https-only images).
-- Wrapped in a transaction: any error rolls it all back.
-- ============================================================
begin;

-- ------------------------------------------------------------
-- 1. Layout validation (used by triggers and by issue_document)
-- ------------------------------------------------------------
create or replace function public.validate_document_layout(p_layout jsonb)
returns void language plpgsql as $$
declare
  el jsonb;
  k text;
begin
  if p_layout is null or jsonb_typeof(p_layout) <> 'object' then raise exception 'Invalid layout'; end if;
  if octet_length(p_layout::text) > 150000 then raise exception 'This layout is too large'; end if;
  if jsonb_typeof(p_layout -> 'elements') is distinct from 'array' then raise exception 'Invalid layout'; end if;
  if jsonb_array_length(p_layout -> 'elements') > 100 then raise exception 'Too many elements (100 at most)'; end if;
  if coalesce(p_layout #>> '{paper,size}', '') not in ('a4', 'letter', 'a5', 'half_letter', 'legal') then
    raise exception 'Unknown paper size';
  end if;
  if coalesce(p_layout #>> '{paper,orientation}', '') not in ('portrait', 'landscape') then
    raise exception 'Unknown paper orientation';
  end if;

  for el in select value from jsonb_array_elements(p_layout -> 'elements') loop
    if jsonb_typeof(el) <> 'object' or coalesce(el ->> 'type', '') not in ('text', 'image', 'line', 'box', 'medicines') then
      raise exception 'Unknown element type';
    end if;
    foreach k in array array['x', 'y', 'w', 'h'] loop
      if jsonb_typeof(el -> k) is distinct from 'number' or (el ->> k)::numeric not between -100 and 1000 then
        raise exception 'Element position or size is out of range';
      end if;
    end loop;
    if el ->> 'type' = 'image' and coalesce(el #>> '{source,kind}', '') = 'url' then
      -- (regex repetition counts are capped at 255 in PostgreSQL, so the length is checked separately)
      if length(coalesce(el #>> '{source,url}', '')) > 500
         or coalesce(el #>> '{source,url}', '') !~ '^https://[^[:space:]"<>]+$' then
        raise exception 'Images must use https links';
      end if;
    end if;
  end loop;
end $$;

-- ------------------------------------------------------------
-- 2. Templates
-- ------------------------------------------------------------
create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  kind text not null check (kind in ('medcert', 'prescription')),
  name text not null check (length(trim(name)) between 1 and 60),
  layout jsonb not null,
  is_default boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists document_templates_clinic_idx on public.document_templates (clinic_id, kind);
create unique index if not exists document_templates_one_default
  on public.document_templates (clinic_id, kind) where is_default;

create or replace function public.prepare_document_template()
returns trigger language plpgsql set search_path = public as $$
begin
  perform public.validate_document_layout(new.layout);

  if tg_op = 'INSERT' then
    if (select count(*) from public.document_templates where clinic_id = new.clinic_id) >= 20 then
      raise exception 'You can keep up to 20 templates. Delete one you no longer use.';
    end if;
    if current_user in ('authenticated', 'anon') then new.created_by := auth.uid(); end if;
  else
    new.clinic_id := old.clinic_id;   -- a template never moves between clinics
    new.kind := old.kind;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
  end if;
  new.updated_at := now();

  -- Only one default per kind: choosing a new one releases the old one
  if new.is_default then
    update public.document_templates set is_default = false
    where clinic_id = new.clinic_id and kind = new.kind and is_default and id <> new.id;
  end if;
  return new;
end $$;

drop trigger if exists prepare_document_template on public.document_templates;
create trigger prepare_document_template before insert or update on public.document_templates
  for each row execute function public.prepare_document_template();

alter table public.document_templates enable row level security;

create policy document_templates_select on public.document_templates for select to authenticated
  using (clinic_id = public.get_my_clinic_id() or public.get_my_role() = 'super_admin');

create policy document_templates_write on public.document_templates for all to authenticated
  using (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'super_admin'))
  with check (clinic_id = public.get_my_clinic_id() and public.get_my_role() in ('admin', 'super_admin')
              and public.clinic_is_writable(clinic_id));

revoke all on public.document_templates from anon;

-- ------------------------------------------------------------
-- 3. Issued documents
-- ------------------------------------------------------------
create table if not exists public.clinic_document_counters (
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  kind text not null,
  last_number integer not null default 0,
  primary key (clinic_id, kind)
);
alter table public.clinic_document_counters enable row level security;
revoke all on public.clinic_document_counters from anon, authenticated;

create table if not exists public.issued_documents (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  branch_id uuid references public.branches(id) on delete set null,
  patient_id uuid not null references public.patients(id),
  kind text not null check (kind in ('medcert', 'prescription')),
  number text not null,
  template_id uuid references public.document_templates(id) on delete set null,
  layout jsonb not null,
  data jsonb not null,
  patient_name text not null,
  doctor_id uuid references public.profiles(id) on delete set null,
  issued_by uuid references public.profiles(id) on delete set null,
  issued_at timestamptz not null default now(),
  status text not null default 'issued' check (status in ('issued', 'voided')),
  void_reason text check (void_reason is null or length(void_reason) <= 300),
  voided_at timestamptz,
  voided_by uuid references public.profiles(id) on delete set null,
  unique (clinic_id, number)
);

create index if not exists issued_documents_clinic_idx on public.issued_documents (clinic_id, issued_at desc);
create index if not exists issued_documents_patient_idx on public.issued_documents (patient_id, issued_at desc);

alter table public.issued_documents enable row level security;

create policy issued_documents_select on public.issued_documents for select to authenticated
  using (clinic_id = public.get_my_clinic_id() or public.get_my_role() = 'super_admin');

-- Nobody writes directly: documents are created and voided by the functions below
revoke all on public.issued_documents from anon;
revoke insert, update, delete, truncate on public.issued_documents from authenticated;

-- Anyone in the clinic can issue (admin, doctor, staff)
create or replace function public.issue_document(
  p_kind text,
  p_patient_id uuid,
  p_doctor_id uuid,
  p_template_id uuid,
  p_layout jsonb,
  p_data jsonb
) returns public.issued_documents language plpgsql security definer set search_path = public as $$
declare
  v_clinic uuid := public.get_my_clinic_id();
  v_patient public.patients%rowtype;
  v_number integer;
  v_name text;
  v_doc public.issued_documents%rowtype;
  v_med jsonb;
  v_label text;
begin
  if auth.uid() is null or v_clinic is null then raise exception 'Not authenticated'; end if;
  if not public.clinic_is_writable(v_clinic) then
    raise exception 'Your trial has ended. Choose a plan to issue documents again.';
  end if;
  if p_kind not in ('medcert', 'prescription') then raise exception 'Unknown document type'; end if;

  select * into v_patient from public.patients where id = p_patient_id and clinic_id = v_clinic;
  if not found then raise exception 'Patient not found'; end if;

  if p_doctor_id is not null and not exists (
    select 1 from public.profiles where id = p_doctor_id and clinic_id = v_clinic and role in ('doctor', 'admin')
  ) then raise exception 'Doctor not found'; end if;

  if p_template_id is not null and not exists (
    select 1 from public.document_templates where id = p_template_id and clinic_id = v_clinic and kind = p_kind
  ) then raise exception 'Template not found'; end if;

  perform public.validate_document_layout(p_layout);

  if p_data is null or jsonb_typeof(p_data) <> 'object' or octet_length(p_data::text) > 40000 then
    raise exception 'The document details are too large';
  end if;
  if jsonb_typeof(p_data -> 'values') is distinct from 'object' then raise exception 'Invalid document details'; end if;
  if jsonb_typeof(coalesce(p_data -> 'medicines', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_data -> 'medicines', '[]'::jsonb)) > 40 then
    raise exception 'A prescription can list up to 40 medicines';
  end if;
  for v_med in select value from jsonb_array_elements(coalesce(p_data -> 'medicines', '[]'::jsonb)) loop
    if jsonb_typeof(v_med) <> 'object' or length(coalesce(v_med ->> 'name', '')) > 200 then
      raise exception 'Invalid medicine entry';
    end if;
  end loop;

  v_name := left(trim(coalesce(p_data #>> '{values,patient_name}', v_patient.full_name)), 150);

  insert into public.clinic_document_counters (clinic_id, kind, last_number) values (v_clinic, p_kind, 1)
  on conflict (clinic_id, kind) do update set last_number = clinic_document_counters.last_number + 1
  returning last_number into v_number;

  v_label := (case p_kind when 'medcert' then 'MC-' else 'RX-' end) || lpad(v_number::text, 6, '0');
  -- The number is printed on the document, so it is stored with the details used to print it
  p_data := jsonb_set(p_data, '{values,document_number}', to_jsonb(v_label));

  insert into public.issued_documents
    (clinic_id, branch_id, patient_id, kind, number, template_id, layout, data, patient_name, doctor_id, issued_by)
  values
    (v_clinic, v_patient.branch_id, p_patient_id, p_kind, v_label,
     p_template_id, p_layout, p_data, v_name, p_doctor_id, auth.uid())
  returning * into v_doc;

  return v_doc;
end $$;

-- Void: admins any time; the person who issued it within 15 minutes
create or replace function public.void_document(p_document_id uuid, p_reason text)
returns public.issued_documents language plpgsql security definer set search_path = public as $$
declare
  v_doc public.issued_documents%rowtype;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  if length(v_reason) < 3 or length(v_reason) > 300 then raise exception 'Please give a reason (3-300 characters)'; end if;

  select * into v_doc from public.issued_documents where id = p_document_id for update;
  if not found or v_doc.clinic_id is distinct from public.get_my_clinic_id() then raise exception 'Document not found'; end if;
  if v_doc.status <> 'issued' then raise exception 'This document is already voided'; end if;

  if public.get_my_role() not in ('admin', 'super_admin')
     and not (v_doc.issued_by = auth.uid() and v_doc.issued_at > now() - interval '15 minutes') then
    raise exception 'Only an admin can void this document (you can void your own within 15 minutes)';
  end if;

  update public.issued_documents
  set status = 'voided', void_reason = v_reason, voided_at = now(), voided_by = auth.uid()
  where id = p_document_id returning * into v_doc;
  return v_doc;
end $$;

revoke all on function public.issue_document(text, uuid, uuid, uuid, jsonb, jsonb) from public, anon;
revoke all on function public.void_document(uuid, text) from public, anon;
grant execute on function public.issue_document(text, uuid, uuid, uuid, jsonb, jsonb) to authenticated;
grant execute on function public.void_document(uuid, text) to authenticated;

commit;
