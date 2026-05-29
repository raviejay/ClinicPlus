-- Database Schema for Subscription Management
-- Add these tables to your Supabase database

-- Subscriptions table (tracks clinic subscriptions and billing)
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL CHECK (plan IN ('starter', 'pro', 'premium')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'cancelled', 'expired')),
  payment_link_id VARCHAR(255) NOT NULL,
  reference_number VARCHAR(255) NOT NULL,
  amount BIGINT NOT NULL, -- Amount in cents (PHP), e.g., 59900 for ₱599
  billing_date TIMESTAMP NOT NULL,
  next_billing_date TIMESTAMP NOT NULL,
  paymongo_payment_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(clinic_id, payment_link_id)
);

-- Indexes for faster queries
CREATE INDEX idx_subscriptions_clinic_id ON subscriptions(clinic_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date);
CREATE INDEX idx_subscriptions_payment_link ON subscriptions(payment_link_id);

-- RLS Policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Clinics can only see their own subscription
CREATE POLICY clinic_subscription_select
  ON subscriptions FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Only admins can update their clinic's subscription
CREATE POLICY clinic_subscription_update
  ON subscriptions FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only system (via service role) can insert subscriptions
CREATE POLICY clinic_subscription_insert
  ON subscriptions FOR INSERT
  WITH CHECK (true);

-- Environment Variables (.env.local)
# PayMongo API Configuration
VITE_PAYMONGO_SECRET_KEY=sk_live_... # Get from PayMongo dashboard
VITE_PAYMONGO_PUBLIC_KEY=pk_live_... # For webhook verification (optional)
VITE_APP_URL=https://yourapp.com # Your production URL

-- Plan Pricing (in PHP, store as cents in database)
Starter:  ₱599  (59900 cents)
Pro:      ₱899  (89900 cents)
Premium:  ₱1,999 (199900 cents)

-- Feature Matrix by Plan
┌─────────────────────────┬─────────┬────┬─────────┐
│ Feature                 │ Starter │ Pro│ Premium │
├─────────────────────────┼─────────┼────┼─────────┤
│ Max Patients            │ 50      │ 500│ ∞       │
│ Max Staff               │ 1       │ 5  │ ∞       │
│ Max Branches            │ 1       │ 1  │ ∞       │
│ Queue Management        │ ✗       │ ✓  │ ✓       │
│ Revenue Tracking        │ ✗       │ ✓  │ ✓       │
│ SMS Notifications       │ ✗       │ ✓  │ ✓       │
│ Custom Branding         │ ✗       │ ✗  │ ✓       │
│ Data Export (Excel/PDF) │ ✗       │ ✗  │ ✓       │
│ API Access              │ ✗       │ ✗  │ ✓       │
│ Priority Support        │ ✗       │ ✗  │ ✓       │
└─────────────────────────┴─────────┴────┴─────────┘

-- Workflow
1. Clinic registers → starts 14-day premium trial
2. Trial expires → must select a paid plan
3. Clicks upgrade → PayMongo payment link generated
4. Completes payment → Webhook confirms payment
5. Subscription marked as 'active'
6. Features restricted based on plan via useClinic().canUseFeature()
7. Limits enforced (patients, staff, branches) in services
8. Monthly billing reminder before next_billing_date
