# ClinicPlus Subscription System - Visual Reference

## 📊 Plan Comparison

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      SUBSCRIPTION PLANS                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  STARTER              PRO                   PREMIUM                     │
│  ₱599/mo             ₱899/mo                ₱1,999/mo                   │
│  ✓ Featured          ✓ Featured             ✓ Most Popular              │
│                                                                         │
│  • 50 patients       • 500 patients         • Unlimited patients        │
│  • 1 staff           • 5 staff              • Unlimited staff           │
│  • 1 branch          • 1 branch             • Unlimited branches        │
│  • Booking           • Queue ✓              • Queue ✓                   │
│  • Basic branding    • Revenue tracking ✓   • Revenue tracking ✓        │
│  • No revenue track  • SMS enabled ✓        • SMS enabled ✓             │
│  • No SMS            • Limited themes       • Custom branding ✓         │
│  • No custom brand   • No export            • Full export ✓             │
│  • No export         • No API               • API access ✓              │
│  • No API            • Standard support     • Priority 24/7 ✓           │
│                                                                         │
│  [Upgrade] ✓ (Current) [Upgrade]                                      │
└─────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Feature Gate Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ Feature Requested (e.g., Queue Management)                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
        ┌──────────────────────────┐
        │ Check Plan               │
        │ (useClinic.plan)         │
        └──────────────────────────┘
                     │
         ┌───────────┼───────────┐
         │           │           │
         ▼           ▼           ▼
    Starter        Pro       Premium
         │           │           │
         ✗           ✓           ✓
         │           │           │
         └─ Show ────┴─ Show ────┴─ Show
            Upgrade     Feature     Feature
            Prompt
```

## 📈 User Plan Progression

```
Day 0:
  Register → Creates Clinic → Enters Premium Trial
  
Day 1-13:
  ✓ Full Premium Access (all features unlocked)
  ✓ Unlimited patients, staff, branches
  
Day 14 (Trial Ends):
  ⚠️ Upgrade Required
  → Redirect to /admin/billing
  
Select Plan:
  → Starter (₱599)  | Pro (₱899)  | Premium (₱1,999)
  
PayMongo Checkout:
  → User completes payment
  
Payment Confirmed:
  ✓ Subscription activated
  ✓ Features restricted to plan
  ✓ Limits enforced
  
Monthly (Auto-Renew):
  ✓ Charge on same date each month
  ⚠️ Email reminder 3 days before
```

## 🛡️ Restriction Enforcement

```
                    ACTION REQUESTED
                          │
                          ▼
                    ┌─────────────┐
                    │ Check Limit │
                    └─────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼ UNDER LIMIT           ▼ AT/OVER LIMIT
          ┌────────┐             ┌────────────┐
          │ ALLOW  │             │ BLOCK      │
          │ Action │             │ Show Alert │
          └────────┘             │ Suggest    │
                                 │ Upgrade    │
                                 └────────────┘

Examples:

Creating Patient (Starter):
  Current: 50/50 patients
  → BLOCK: "Limit reached. Upgrade to Pro for 500 patients"

Adding Staff (Pro):
  Current: 4/5 staff
  → ALLOW: "1 staff remaining. Consider upgrading."

Creating Branch (Starter):
  Current: 1/1 branch
  → BLOCK: "Premium only. Upgrade for unlimited branches."
```

## 🔐 Feature Gate Matrix

```
┌─────────────────────┬─────────┬─────┬─────────┐
│ Feature             │ Starter │ Pro │ Premium │
├─────────────────────┼─────────┼─────┼─────────┤
│ Appointments        │    ✓    │  ✓  │    ✓    │
│ Public Booking      │    ✓    │  ✓  │    ✓    │
│ Medical Records     │    ✓    │  ✓  │    ✓    │
│                     │         │     │         │
│ Queue Management    │    ✗    │  ✓  │    ✓    │ ← Gate
│ Revenue Tracking    │    ✗    │  ✓  │    ✓    │ ← Gate
│ SMS Notifications   │    ✗    │  ✓  │    ✓    │ ← Gate
│                     │         │     │         │
│ Custom Branding     │    ✗    │  ✗  │    ✓    │ ← Gate
│ Data Export         │    ✗    │  ✗  │    ✓    │ ← Gate
│ API Access          │    ✗    │  ✗  │    ✓    │ ← Gate
│ Priority Support    │    ✗    │  ✗  │    ✓    │ ← Gate
└─────────────────────┴─────────┴─────┴─────────┘
```

## 💰 Payment Flow

```
User on /admin/billing
         │
         ▼
    Sees "Upgrade"
         │
         ▼
    Clicks Plan
         │
         ▼
┌─────────────────────────────┐
│ paymongoSubscriptionService │
│   .createPaymentLink()      │
└─────────────────────────────┘
         │
         ▼ (API Call)
┌─────────────────────────────┐
│   PayMongo API              │
│   - Generate Link           │
│   - Set Amount (₱599/899)   │
│   - Metadata: clinic_id     │
└─────────────────────────────┘
         │
         ▼ (Checkout URL)
   Redirect to PayMongo Checkout
         │
         ▼
    User Enters Payment Info
         │
         ▼
    Payment Processing
         │
    ┌────┴─────┐
    │           │
    ▼ Success   ▼ Failed
    │           │
    ✓ Confirm   ✗ Retry
    
    ┌──────────────────────┐
    │ Webhook Endpoint     │
    │ (Your Backend)       │
    └──────────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ subscriptionService          │
│   .updateSubscriptionStatus( │
│     subscriptionId,          │
│     'active'                 │
│   )                          │
└──────────────────────────────┘
         │
         ▼
    Subscription ACTIVE
    ✓ Features Gated
    ✓ Limits Enforced
```

## 📱 Component Usage Examples

### Example 1: Gate Queue Feature
```vue
<!-- In QueuePage.vue -->
<template>
  <FeatureGate feature="queue" label="Queue Management">
    <div class="queue-container">
      <!-- Queue UI only shows on Pro/Premium -->
    </div>
  </FeatureGate>
</template>
```

### Example 2: Show Limit Alert
```vue
<!-- In PatientsPage.vue -->
<template>
  <div>
    <PlanLimitAlert 
      :limitCheck="patientLimitCheck"
      title="Patients"
      :warningThreshold="5"
    />
    <!-- Shows alert if near/at limit -->
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { planRestrictionService } from '@/services/planRestriction.service'
import { useClinic } from '@/composables/useClinic'

const { plan } = useClinic()
const patientLimitCheck = ref(null)

onMounted(async () => {
  const { data } = await planRestrictionService.checkPatientLimit(clinicId, plan.value)
  patientLimitCheck.value = data
})
</script>
```

### Example 3: Prevent Patient Creation
```typescript
// In patient.service.ts
async function createPatient(clinicId, data, plan) {
  // Check limit first
  const { data: check } = await planRestrictionService.checkPatientLimit(clinicId, plan)
  
  if (!check.allowed) {
    return { 
      error: `Patient limit reached (${check.current}/${check.max})` 
    }
  }
  
  // Proceed with creation
  return supabase.from('patients').insert(...)
}
```

## 🎯 Database Workflow

```
┌──────────────────────────┐
│   User Completes Payment │
└────────────┬─────────────┘
             │
             ▼ PayMongo Webhook
┌─────────────────────────────────┐
│ POST /api/webhooks/paymongo     │
│ {                               │
│   type: 'payment.paid',         │
│   data: {                       │
│     id: 'pay_...',              │
│     amount: 89900,              │
│     metadata: {                 │
│       clinic_id: 'X',           │
│       plan: 'pro'               │
│     }                           │
│   }                             │
│ }                               │
└─────────────────────────────────┘
             │
             ▼ Verify Webhook
┌─────────────────────────────────┐
│ subscriptionService             │
│   .updateSubscriptionStatus(    │
│     subscriptionId,             │
│     'active',                   │
│     paymentId                   │
│   )                             │
└─────────────────────────────────┘
             │
             ▼ UPDATE subscriptions SET
┌─────────────────────────────────┐
│ subscriptions table             │
│ status = 'active'               │
│ paymongo_payment_id = 'pay_...' │
│ next_billing_date = +1 month    │
└─────────────────────────────────┘
             │
             ▼ Broadcast Update
        ┌──────────────────┐
        │ auth_store       │
        │ .clinic.plan     │
        │ = 'pro'          │
        └──────────────────┘
             │
             ▼ Features Update
    ✓ useClinic().canUseFeature()
    ✓ FeatureGate renders correctly
    ✓ Limits enforced
```

## 📊 Quota Calculator

```
STARTER PLAN:
  └─ Max 50 Patients
       ├─ Current: 25
       └─ Remaining: 25 ✓
  
  └─ Max 1 Staff
       ├─ Current: 1
       └─ Remaining: 0 ✗ (Cannot add more)
  
  └─ Max 1 Branch
       ├─ Current: 1
       └─ Remaining: 0 ✗

PRO PLAN:
  └─ Max 500 Patients
       ├─ Current: 150
       └─ Remaining: 350 ✓
  
  └─ Max 5 Staff
       ├─ Current: 3
       └─ Remaining: 2 ✓
  
  └─ Max 1 Branch
       ├─ Current: 1
       └─ Remaining: 0 ✗ (Upgrade to Premium)

PREMIUM PLAN:
  └─ Unlimited Everything ✓
```

---

This visual reference shows how the subscription system flows through the application. See `QUICK_START.md` for setup instructions.
