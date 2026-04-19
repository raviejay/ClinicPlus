-- ============================================================
-- CLINIC SAAS - DATABASE SCHEMA
-- ============================================================

-- PROFILES (links auth.users to clinics)
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id  uuid,
  branch_id  uuid,
  full_name  text,
  role       text NOT NULL CHECK (role IN ('super_admin','admin','doctor','staff')),
  created_at timestamp DEFAULT now()
);

-- CLINICS
CREATE TABLE IF NOT EXISTS clinics (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  slug           text UNIQUE NOT NULL,
  email          text,
  plan           text DEFAULT 'starter',
  is_trial       boolean DEFAULT true,
  trial_ends_at  timestamp,
  created_at     timestamp DEFAULT now()
);

-- CLINIC SETTINGS (config-driven feature flags)
CREATE TABLE IF NOT EXISTS clinic_settings (
  clinic_id             uuid PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  booking_mode          text DEFAULT 'auto_assign',
  queue_enabled         boolean DEFAULT false,
  sms_enabled           boolean DEFAULT false,
  multi_branch_enabled  boolean DEFAULT false
);

-- Add FK from profiles.clinic_id -> clinics.id
ALTER TABLE profiles
  ADD CONSTRAINT fk_profiles_clinic
  FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL;
