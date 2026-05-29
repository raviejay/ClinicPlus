# Create Subscriptions Table in Supabase

## Quick Steps

1. **Go to:** https://supabase.com/dashboard/projects
2. **Select:** Your ClinicPlus project
3. **Click:** SQL Editor (left menu)
4. **Click:** "New query"
5. **Paste the code below**
6. **Click:** "Run"

---

## SQL Code to Run

Copy and paste this entire code:

```sql
-- Create subscriptions table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  plan VARCHAR(50) NOT NULL CHECK (plan IN ('starter', 'pro', 'premium')),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'cancelled', 'expired')),
  payment_link_id VARCHAR(255) NOT NULL,
  reference_number VARCHAR(255) NOT NULL,
  amount BIGINT NOT NULL,
  billing_date TIMESTAMP NOT NULL,
  next_billing_date TIMESTAMP NOT NULL,
  paymongo_payment_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(clinic_id, payment_link_id)
);

-- Create indexes
CREATE INDEX idx_subscriptions_clinic_id ON subscriptions(clinic_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date);
CREATE INDEX idx_subscriptions_payment_link ON subscriptions(payment_link_id);

-- Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Clinics can only see their own subscription
CREATE POLICY clinic_subscription_select
  ON subscriptions FOR SELECT
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy: Only admins can update their clinic's subscription
CREATE POLICY clinic_subscription_update
  ON subscriptions FOR UPDATE
  USING (
    clinic_id IN (
      SELECT clinic_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policy: System can insert subscriptions
CREATE POLICY clinic_subscription_insert
  ON subscriptions FOR INSERT
  WITH CHECK (true);
```

---

## What This Does

✅ **Creates subscriptions table** with all fields needed
✅ **Adds indexes** for fast queries
✅ **Enables RLS** (Row Level Security) so clinics only see their own data
✅ **Sets up policies** so only the right people can access data

---

## After Running

1. ✅ Table is created
2. Go back to your app
3. Click the upgrade button again
4. It should work now! 🎉

---

## If You Get an Error

**Error: "clinic_id" is not a valid column**
- This means the `clinics` table doesn't exist yet
- You may need to create it first or change the reference

**Solution:** Let me know and I can help!
