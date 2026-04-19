-- ============================================================
-- CLINIC SAAS - ROW LEVEL SECURITY POLICIES
-- ============================================================

-- Enable RLS
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics        ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------
-- PROFILES
-- -------------------------------------------------------

-- Users can read their own profile
CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (signup flow)
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Admins can read all profiles in their clinic
CREATE POLICY "profiles_select_same_clinic"
  ON profiles FOR SELECT
  USING (
    clinic_id = (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
  );

-- -------------------------------------------------------
-- CLINICS
-- -------------------------------------------------------

-- Users can only read their own clinic
CREATE POLICY "clinics_select_own"
  ON clinics FOR SELECT
  USING (
    id = (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins can update their own clinic
CREATE POLICY "clinics_update_own"
  ON clinics FOR UPDATE
  USING (
    id = (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Allow insert during clinic setup (authenticated users)
CREATE POLICY "clinics_insert_authenticated"
  ON clinics FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- -------------------------------------------------------
-- CLINIC SETTINGS
-- -------------------------------------------------------

-- Users can read settings of their own clinic
CREATE POLICY "clinic_settings_select_own"
  ON clinic_settings FOR SELECT
  USING (
    clinic_id = (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Admins can update their clinic settings
CREATE POLICY "clinic_settings_update_own"
  ON clinic_settings FOR UPDATE
  USING (
    clinic_id = (
      SELECT clinic_id FROM profiles
      WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
    )
  );

-- Allow insert during clinic setup
CREATE POLICY "clinic_settings_insert_authenticated"
  ON clinic_settings FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
