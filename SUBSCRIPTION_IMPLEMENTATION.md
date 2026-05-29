# ClinicPlus Subscription Plan & Billing Implementation

This document explains the subscription plan system, PayMongo integration, and plan restrictions in ClinicPlus.

## Plan Tiers

### Pricing (PHP/month)
- **Starter**: ₱599 - Small clinics just getting started
- **Pro**: ₱899 - Clinics with real patient volume  
- **Premium**: ₱1,999 - Multi-branch clinics with advanced needs

## Feature Breakdown

| Feature | Starter | Pro | Premium |
|---------|---------|-----|---------|
| Max Patients | 50 | 500 | Unlimited |
| Max Staff | 1 | 5 | Unlimited |
| Max Branches | 1 | 1 | Unlimited |
| Queue Management | ✗ | ✓ | ✓ |
| Revenue Tracking | ✗ | ✓ | ✓ |
| SMS Notifications | ✗ | ✓ | ✓ |
| Custom Branding | ✗ | ✗ | ✓ |
| Data Export (Excel/PDF) | ✗ | ✗ | ✓ |
| API Access | ✗ | ✗ | ✓ |
| Priority Support | ✗ | ✗ | ✓ |

## Implementation Architecture

### 1. Composables
- **`useSubscriptionPlan(plan)`** - Provides plan limits and feature gates
  - `canAccessQueue` - Whether queue feature is enabled
  - `canAccessRevenueTracking` - Revenue tracking availability
  - `canAddBranches` - Whether multiple branches are allowed
  - `checkPatientLimit()` - Check if clinic can add more patients
  - `checkStaffLimit()` - Check if clinic can add more staff
  - `checkBranchLimit()` - Check if clinic can add more branches

- **`useClinic()`** (existing) - Integrates with subscription plans
  - `canUseFeature(feature)` - Check if feature is accessible based on plan

### 2. Services

#### `subscription.service.ts`
Manages subscription records in the database.

```typescript
// Create a new subscription after payment
await subscriptionService.createSubscription({
  clinic_id: clinicId,
  plan: 'pro',
  payment_link_id: linkId,
  reference_number: 'PMO123456',
  amount: 89900 // in cents
})

// Get clinic's active subscription
const { data: subscription } = await subscriptionService.getActiveSubscription(clinicId)
```

#### `paymongoSubscription.service.ts`
Handles PayMongo payment link generation and verification.

```typescript
// Create payment link for subscription
const { data: paymentLink } = await paymongoSubscriptionService.createPaymentLink(
  clinicId,
  'Smile Dental Clinic',
  'pro',
  'https://yourapp.com/admin/billing'
)

// Verify payment was completed
const { data: verification } = await paymongoSubscriptionService.verifyPaymentLink(linkId)
```

#### `planRestriction.service.ts`
Validates if clinic can perform actions based on plan limits.

```typescript
// Check patient limit
const { data: check } = await planRestrictionService.checkPatientLimit(clinicId, 'pro')
if (!check.allowed) {
  // Show upgrade prompt
}

// Get all limits for a plan
const { data: allLimits } = await planRestrictionService.getAllLimits(clinicId, 'pro')
console.log(allLimits.patients.remaining) // 450 (500 - 50 current)
```

### 3. Components

#### `FeatureGate.vue` (existing)
Hides features not available in the clinic's plan.

```vue
<FeatureGate feature="queue" label="Queue Management">
  <QueueComponent />
</FeatureGate>

<FeatureGate feature="export" label="Data Export">
  <ExportButton />
</FeatureGate>
```

#### `PlanLimitAlert.vue` (new)
Shows warning when approaching or at plan limits.

```vue
<PlanLimitAlert 
  :limitCheck="patientLimitCheck"
  title="Patients"
  :warningThreshold="10"
/>
```

### 4. Pages

#### `BillingPage.vue` (/admin/billing)
Complete subscription management interface:
- View current plan and next billing date
- Compare plans side-by-side
- Upgrade to a higher plan
- View subscription history
- Update payment method

## Workflow

### 1. New Clinic Registration
```
Register → Trial created (14 days of Premium) → Access full features
```

### 2. Trial Expiration
```
Trial ends → Show upgrade prompt → Select plan → PayMongo payment
```

### 3. Payment Flow
```
User clicks "Upgrade" 
  ↓
Create PayMongo payment link via paymongoSubscriptionService
  ↓
Redirect to checkout
  ↓
User completes payment
  ↓
Webhook confirms payment (backend)
  ↓
Update subscription status to 'active'
  ↓
Features restricted per plan
```

### 4. Feature Gating
All components check plan before rendering:

```typescript
// In any component
const { canUseFeature, plan } = useClinic()

if (!canUseFeature('queue')) {
  // Show upgrade prompt
}
```

## Database Schema

See `DATABASE_SCHEMA.md` for full SQL schema.

Key table: `subscriptions`
- `id` - Subscription ID
- `clinic_id` - Clinic this subscription belongs to
- `plan` - 'starter', 'pro', or 'premium'
- `status` - 'active', 'pending', 'cancelled', 'expired'
- `payment_link_id` - PayMongo link ID
- `next_billing_date` - When to renew
- `paymongo_payment_id` - Payment ID after success

## Environment Variables

```env
# Required for subscription payments
VITE_PAYMONGO_SECRET_KEY=sk_live_...
VITE_PAYMONGO_PUBLIC_KEY=pk_live_...
VITE_APP_URL=https://yourapp.com
```

Get these from [PayMongo Dashboard](https://dashboard.paymongo.com/developers/api_keys)

## Enforcement Points

### 1. Patient Creation
When adding a patient, check limit:
```typescript
const { data: check } = await planRestrictionService.checkPatientLimit(clinicId, plan)
if (!check.allowed) {
  throw new Error(`Patient limit reached (${check.current}/${check.max})`)
}
```

### 2. Staff Addition
When inviting staff:
```typescript
const { data: check } = await planRestrictionService.checkStaffLimit(clinicId, plan)
if (!check.allowed) {
  throw new Error(`Staff limit reached (${check.current}/${check.max})`)
}
```

### 3. Branch Creation
When adding a branch:
```typescript
const { data: check } = await planRestrictionService.checkBranchLimit(clinicId, plan)
if (!check.allowed) {
  throw new Error(`Branches limited to ${check.max} on ${check.planName} plan`)
}
```

### 4. Feature Access
Before rendering feature:
```typescript
<FeatureGate feature="queue" label="Queue Management">
  <QueueSection />
</FeatureGate>
```

## Integration Checklist

- [x] Pricing page updated with ₱599, ₱899, ₱1,999
- [x] Subscription plan composable created
- [x] PayMongo service for payment links
- [x] Database subscription service
- [x] Plan restriction service
- [x] Billing management page
- [x] Feature gate components
- [x] Plan limit alert component
- [ ] Create `/subscriptions` table in Supabase
- [ ] Add PayMongo API keys to .env
- [ ] Set up PayMongo webhooks (for payment confirmation)
- [ ] Apply restrictions to patient service (prevent overage)
- [ ] Apply restrictions to staff service (prevent overage)
- [ ] Apply restrictions to branch service (prevent overage)
- [ ] Test trial flow
- [ ] Test payment flow
- [ ] Test feature gating

## PayMongo Webhook Setup

When a payment is completed, PayMongo sends a webhook. Set this up:

1. Go to [PayMongo Dashboard → Developers → Webhooks](https://dashboard.paymongo.com/developers/webhooks)
2. Add webhook URL: `https://yourapp.com/api/webhooks/paymongo`
3. Subscribe to: `payment.paid` and `payment.failed`
4. Create backend endpoint that:
   - Verifies webhook signature
   - Updates subscription status to 'active'
   - Sends confirmation email to clinic admin

Example webhook payload:
```json
{
  "type": "payment.paid",
  "data": {
    "id": "pay_...",
    "amount": 89900,
    "status": "paid",
    "reference_number": "PAY-123",
    "metadata": {
      "clinic_id": "...",
      "plan": "pro"
    }
  }
}
```

## Support & Troubleshooting

### Payment link not generating
- Check `VITE_PAYMONGO_SECRET_KEY` is correct
- Verify clinic has valid data (name, email)
- Check PayMongo account has sufficient API quota

### Features still visible after downgrade
- Clear browser cache
- Verify subscription status is 'active'
- Check `useClinic().plan` returns correct value

### Customer can access more patients than limit
- Enforce `planRestrictionService.checkPatientLimit()` in patient creation
- Add database CHECK constraint: `CHECK (patient_count <= plan_limit)`

## Future Enhancements

- [ ] Automatic invoice generation
- [ ] Monthly email billing reminders
- [ ] Usage-based billing (SMS credits, API calls)
- [ ] Team plan discounts
- [ ] Annual billing (save 20%)
- [ ] White-label pricing for resellers
