-- Monthly patient usage tracking + patient email + pg_cron reset

-- Patient email for appointment notifications
ALTER TABLE patients ADD COLUMN IF NOT EXISTS email text;

-- Tracks new patients added per clinic per calendar month
CREATE TABLE IF NOT EXISTS clinic_monthly_usage (
  clinic_id          uuid PRIMARY KEY REFERENCES clinics(id) ON DELETE CASCADE,
  new_patients_count integer NOT NULL DEFAULT 0,
  period_start       date NOT NULL DEFAULT date_trunc('month', CURRENT_DATE)::date
);

-- Reset all clinic counters on the 1st of every month (requires pg_cron extension)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'reset-monthly-patient-counts') THEN
    PERFORM cron.unschedule((SELECT jobid FROM cron.job WHERE jobname = 'reset-monthly-patient-counts'));
  END IF;
END $$;

SELECT cron.schedule(
  'reset-monthly-patient-counts',
  '0 0 1 * *',
  $$UPDATE clinic_monthly_usage
    SET new_patients_count = 0,
        period_start = date_trunc('month', CURRENT_DATE)::date$$
);
