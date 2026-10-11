-- ============================================================
-- CLINIC SAAS — BASELINE TABLE SCHEMA
-- Tables as they exist in the Supabase project BEFORE the migrations in
-- ./migrations. Policies, triggers and functions live in the migrations
-- (the first one that matters is 20261011000000_security_hardening.sql).
-- Apply order for a fresh project: this file, then every migration by filename.
-- ============================================================

CREATE TABLE public.clinics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  email text,
  plan text DEFAULT 'starter'::text,
  is_trial boolean DEFAULT true,
  trial_ends_at timestamp without time zone,
  created_at timestamp without time zone DEFAULT now(),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'suspended'::text, 'cancelled'::text])),
  CONSTRAINT clinics_pkey PRIMARY KEY (id)
);

CREATE TABLE public.branches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  name text NOT NULL,
  address text,
  contact_number text,
  created_at timestamp without time zone DEFAULT now(),
  slug text NOT NULL,
  CONSTRAINT branches_pkey PRIMARY KEY (id),
  CONSTRAINT branches_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  clinic_id uuid,
  branch_id uuid,
  full_name text,
  role text NOT NULL CHECK (role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'doctor'::text, 'staff'::text])),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT fk_profiles_clinic FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT fk_profiles_branch FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);

CREATE TABLE public.clinic_settings (
  clinic_id uuid NOT NULL,
  booking_mode text DEFAULT 'auto_assign'::text,
  queue_enabled boolean DEFAULT false,
  sms_enabled boolean DEFAULT false,
  multi_branch_enabled boolean DEFAULT false,
  CONSTRAINT clinic_settings_pkey PRIMARY KEY (clinic_id),
  CONSTRAINT clinic_settings_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

CREATE TABLE public.clinic_branding (
  clinic_id uuid NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#2563eb'::text,
  secondary_color text DEFAULT '#1e40af'::text,
  layout text DEFAULT 'layout_a'::text CHECK (layout = ANY (ARRAY['layout_a'::text, 'layout_b'::text, 'layout_c'::text, 'layout_d'::text])),
  banner_image text,
  CONSTRAINT clinic_branding_pkey PRIMARY KEY (clinic_id),
  CONSTRAINT clinic_branding_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

CREATE TABLE public.patients (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  branch_id uuid,
  full_name text NOT NULL,
  contact_number text NOT NULL,
  birthdate date,
  gender text CHECK (gender = ANY (ARRAY['male'::text, 'female'::text, 'other'::text])),
  address text,
  created_at timestamp without time zone DEFAULT now(),
  email text,
  CONSTRAINT patients_pkey PRIMARY KEY (id),
  CONSTRAINT patients_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT patients_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id)
);

CREATE TABLE public.appointments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  branch_id uuid,
  patient_id uuid NOT NULL,
  doctor_id uuid,
  appointment_date date NOT NULL,
  time_slot text,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_queue'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])),
  notes text,
  created_at timestamp without time zone DEFAULT now(),
  service_category text,
  service_name text,
  CONSTRAINT appointments_pkey PRIMARY KEY (id),
  CONSTRAINT appointments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT appointments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT appointments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT appointments_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.queue (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  branch_id uuid,
  patient_id uuid NOT NULL,
  appointment_id uuid,
  doctor_id uuid,
  priority_number integer NOT NULL,
  status text DEFAULT 'waiting'::text CHECK (status = ANY (ARRAY['waiting'::text, 'now_serving'::text, 'done'::text, 'skipped'::text])),
  queue_date date DEFAULT CURRENT_DATE,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT queue_pkey PRIMARY KEY (id),
  CONSTRAINT queue_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT queue_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT queue_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT queue_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT queue_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.medical_records (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  branch_id uuid,
  patient_id uuid NOT NULL,
  appointment_id uuid,
  doctor_id uuid NOT NULL,
  diagnosis text,
  prescription text,
  notes text,
  visit_date date DEFAULT CURRENT_DATE,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT medical_records_pkey PRIMARY KEY (id),
  CONSTRAINT medical_records_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT medical_records_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT medical_records_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT medical_records_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id),
  CONSTRAINT medical_records_doctor_id_fkey FOREIGN KEY (doctor_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  branch_id uuid,
  patient_id uuid NOT NULL,
  appointment_id uuid,
  amount numeric NOT NULL,
  payment_method text DEFAULT 'cash'::text CHECK (payment_method = ANY (ARRAY['cash'::text, 'gcash'::text, 'maya'::text, 'card'::text, 'other'::text])),
  status text DEFAULT 'paid'::text CHECK (status = ANY (ARRAY['paid'::text, 'refunded'::text, 'pending'::text])),
  paid_at timestamp without time zone DEFAULT now(),
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id),
  CONSTRAINT payments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id),
  CONSTRAINT payments_patient_id_fkey FOREIGN KEY (patient_id) REFERENCES public.patients(id),
  CONSTRAINT payments_appointment_id_fkey FOREIGN KEY (appointment_id) REFERENCES public.appointments(id)
);

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  plan character varying NOT NULL CHECK (plan::text = ANY (ARRAY['starter'::character varying, 'pro'::character varying, 'premium'::character varying]::text[])),
  status character varying NOT NULL DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'pending'::character varying, 'cancelled'::character varying, 'expired'::character varying]::text[])),
  payment_link_id character varying NOT NULL,
  reference_number character varying NOT NULL,
  amount bigint NOT NULL,
  billing_date timestamp without time zone NOT NULL,
  next_billing_date timestamp without time zone NOT NULL,
  paymongo_payment_id character varying,
  created_at timestamp without time zone NOT NULL DEFAULT now(),
  updated_at timestamp without time zone NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

CREATE TABLE public.clinic_monthly_usage (
  clinic_id uuid NOT NULL,
  new_patients_count integer NOT NULL DEFAULT 0,
  period_start date NOT NULL DEFAULT (date_trunc('month'::text, (CURRENT_DATE)::timestamp with time zone))::date,
  CONSTRAINT clinic_monthly_usage_pkey PRIMARY KEY (clinic_id),
  CONSTRAINT clinic_monthly_usage_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);

CREATE TABLE public.clinic_services (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL,
  category_id text NOT NULL,
  category_name text NOT NULL,
  category_icon text NOT NULL DEFAULT '🏥'::text,
  service_name text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT clinic_services_pkey PRIMARY KEY (id),
  CONSTRAINT clinic_services_clinic_id_fkey FOREIGN KEY (clinic_id) REFERENCES public.clinics(id)
);
