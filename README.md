# Clinic SaaS — Phase 1

Multi-tenant clinic management system built with Vue 3 + Supabase.

## Stack
- **Frontend:** Vue 3 + Vite + TypeScript + PWA
- **Styling:** TailwindCSS v4 (`@tailwindcss/vite`)
- **State:** Pinia
- **Backend:** Supabase (Auth + PostgreSQL + RLS)

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Fill in your Supabase URL and anon key
   ```

3. **Run database migrations** in Supabase SQL editor:
   - `supabase/schema.sql` — run first
   - `supabase/rls.sql` — run second

4. **Start dev server**
   ```bash
   npm run dev
   ```

## Project Structure
```
src/
  components/       # Shared UI components
  layouts/          # AuthLayout, AppLayout
  pages/
    auth/           # Login, Register
    clinic/         # ClinicSetup
    dashboard/      # Dashboard (placeholder)
  router/           # Vue Router + guards
  services/         # Supabase service layer
  stores/           # Pinia stores (auth)
  types/            # TypeScript interfaces
supabase/
  schema.sql        # All table definitions
  rls.sql           # Row Level Security policies
```

## Signup Flow
1. Register (email + password via Supabase Auth)
2. Redirect to `/clinic-setup`
3. Create clinic → generates slug, sets 14-day trial
4. Profile updated with `clinic_id` and `role: admin`
5. Redirect to `/dashboard`

## Phases
| Phase | Feature |
|-------|---------|
| ✅ 1 | Foundation (this TAR) |
| 2 | Multi-tenant logic + full RLS |
| 3 | Patients + Appointments |
| 4 | Queue system |
| 5 | Medical records |
| 6 | Payments + Revenue |
| 7 | Branding + Themes |
| 8 | Feature gating |
| 9 | Multi-branch |
