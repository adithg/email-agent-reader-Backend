DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.requests'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.requests DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END
$$;

ALTER TABLE public.requests
ADD CONSTRAINT requests_status_check
CHECK (
  status IN (
    'pending',
    'info_requested',
    'auto_approved',
    'approved',
    'rejected',
    'escalated'
  )
);

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    WHERE con.conrelid = 'public.activity_log'::regclass
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%action%'
  LOOP
    EXECUTE format('ALTER TABLE public.activity_log DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END
$$;

ALTER TABLE public.activity_log
ADD CONSTRAINT activity_log_action_check
CHECK (
  action IN (
    'request_submitted',
    'risk_scored',
    'auto_approved',
    'escalated',
    'approved',
    'rejected',
    'reviewed',
    'info_requested',
    'note_added'
  )
);

CREATE OR REPLACE VIEW public.dashboard_stats AS
SELECT
  COUNT(*) AS total_requests,
  COUNT(*) FILTER (WHERE status = 'auto_approved') AS auto_approved,
  COUNT(*) FILTER (WHERE status IN ('pending', 'info_requested')) AS pending_review,
  COUNT(*) FILTER (WHERE status = 'escalated') AS escalated,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
  COUNT(*) FILTER (WHERE risk_level = 'low') AS low_risk,
  COUNT(*) FILTER (WHERE risk_level = 'medium') AS medium_risk,
  COUNT(*) FILTER (WHERE risk_level = 'high') AS high_risk
FROM public.requests;

ALTER VIEW public.dashboard_stats SET (security_invoker = true);
GRANT SELECT ON public.dashboard_stats TO authenticated;
