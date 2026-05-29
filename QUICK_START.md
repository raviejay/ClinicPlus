# Quick Start: Subscription Implementation

## 🚀 What You Get

✅ **Pricing Page** - Updated with ₱599, ₱899, ₱1,999  
✅ **Billing Dashboard** - Full subscription management at `/admin/billing`  
✅ **PayMongo Integration** - Payment link generation ready  
✅ **Feature Gates** - Queue, SMS, Revenue tracking, Custom branding gated per plan  
✅ **Plan Limits** - Patients (50/500/∞), Staff (1/5/∞), Branches (1/1/∞)  

## ⚙️ Setup (3 Steps)

### Step 1: Database Setup
Open Supabase dashboard and run the SQL from `DATABASE_SCHEMA.md`:

```sql
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

CREATE INDEX idx_subscriptions_clinic_id ON subscriptions(clinic_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_next_billing ON subscriptions(next_billing_date);
```

### Step 2: Environment Variables
Create/update `.env.local`:

```env
# Get from PayMongo Dashboard: https://dashboard.paymongo.com/developers/api_keys
VITE_PAYMONGO_SECRET_KEY=sk_live_your_secret_key
VITE_PAYMONGO_PUBLIC_KEY=pk_live_your_public_key
VITE_APP_URL=http://localhost:5173
```

For production, use:
```env
VITE_APP_URL=https://yourapp.com
```

### Step 3: Test the Flow

1. **Visit landing page** → http://localhost:5173
   - Verify pricing shows ₱599, ₱899, ₱1,999 ✓

2. **Register a clinic** → Create account at /register
   - Clinic starts with 14-day Premium trial ✓

3. **Access billing** → Go to `/admin/billing`
   - See current plan and upgrade options ✓

4. **Click "Upgrade"** → Test payment flow
   - Uses PayMongo test keys (no real charges) ✓

## 📋 Files Overview

| File | Purpose |
|------|---------|
| `src/pages/LandingPage.vue` | Updated pricing (₱599, ₱899, ₱1,999) |
| `src/pages/admin/BillingPage.vue` | Subscription management dashboard |
| `src/services/subscription.service.ts` | Database operations |
| `src/services/paymongoSubscription.service.ts` | Payment link generation |
| `src/services/planRestriction.service.ts` | Limit enforcement |
| `src/composables/useSubscriptionPlan.ts` | Plan limits & feature gates |
| `src/components/ui/PlanLimitAlert.vue` | Limit warnings |
| `DATABASE_SCHEMA.md` | SQL schema |
| `SUBSCRIPTION_IMPLEMENTATION.md` | Full guide |

## 🔒 Plan Restrictions

### Feature Gates (Hidden UI)
```vue
<!-- Queue only on Pro/Premium -->
<FeatureGate feature="queue" label="Queue Management">
  <QueueComponent />
</FeatureGate>

<!-- Export only on Premium -->
<FeatureGate feature="export" label="Data Export">
  <ExportButton />
</FeatureGate>
```

### Limit Checks (Prevent Actions)
```typescript
// Before creating a patient
const { data: check } = await planRestrictionService.checkPatientLimit(clinicId, plan)
if (!check.allowed) {
  alert(`Limit reached: ${check.current}/${check.max} patients`)
}

// Before adding staff
const { data: check } = await planRestrictionService.checkStaffLimit(clinicId, plan)

// Before creating branch
const { data: check } = await planRestrictionService.checkBranchLimit(clinicId, plan)
```

## 🧪 Testing PayMongo

### With Sandbox (No Real Charges)
1. Get test keys from: https://dashboard.paymongo.com/developers/api_keys
2. Use API keys for environment variables
3. Complete checkout → PayMongo will confirm test payment

### With Live Keys
1. Get live keys from PayMongo dashboard
2. Set in production `.env`
3. Real charges will occur

## ✅ Checklist Before Going Live

- [ ] Database table created in Supabase
- [ ] PayMongo API keys added to .env
- [ ] Landing page pricing verified (₱599, ₱899, ₱1,999)
- [ ] /admin/billing page accessible
- [ ] Test payment flow works
- [ ] Set up PayMongo webhook endpoint
- [ ] Feature gates working (queue, revenue, export hidden on Starter)
- [ ] Limit checks prevent adding beyond quota
- [ ] Trial flow works (14 days Premium then upgrade prompt)

## 🔗 Important Links

- **PayMongo**: https://paymongo.com
- **PayMongo API Docs**: https://developers.paymongo.com/
- **PayMongo Dashboard**: https://dashboard.paymongo.com/
- **Supabase**: https://supabase.com
- **ClinicPlus Docs**: See `SUBSCRIPTION_IMPLEMENTATION.md`

## 🆘 Troubleshooting

**"Payment link not generating"**
- Check `VITE_PAYMONGO_SECRET_KEY` is correct
- Verify clinic name/email populated
- Test with PayMongo test keys first

**"Features still visible on Starter plan"**
- Clear browser cache (Ctrl+Shift+Delete)
- Check clinic.plan is 'starter' in database
- Verify `useClinic().canUseFeature()` is being called

**"Can't add 2nd patient to Starter"**
- Check `planRestrictionService.checkPatientLimit()` is called
- Verify patient count is actually 50+
- Check plan is 'starter'

## 📞 Next Steps

1. ✅ Database setup complete
2. ✅ All code files created
3. ⏭️ Add PayMongo keys to .env
4. ⏭️ Run database schema SQL
5. ⏭️ Test payment flow
6. ⏭️ Set up webhooks for payment confirmation
7. ⏭️ Go live! 🎉

**Duration**: ~2 hours including testing

---

**Built with**: Vue 3 + Supabase + PayMongo
**Plan Type**: SaaS with monthly subscriptions
**Target Market**: Philippine clinics
