CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(auth.jwt() ->> 'email', auth.email());
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role text;
BEGIN
  requested_role := CASE
    WHEN NEW.raw_user_meta_data->>'role' IN ('requester', 'admin') THEN NEW.raw_user_meta_data->>'role'
    ELSE 'requester'
  END;

  INSERT INTO public.profiles (id, full_name, email, role, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email,
    requested_role,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    role = COALESCE(public.profiles.role, EXCLUDED.role);

  RETURN NEW;
END;
$$;

ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can read profile scope" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their signup profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own safe profile fields" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;

CREATE POLICY "Users can read profile scope"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Users can insert their signup profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id
  AND role = COALESCE(NULLIF(auth.jwt() -> 'user_metadata' ->> 'role', ''), 'requester')
);

CREATE POLICY "Users can update own safe profile fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = (
    SELECT existing.role
    FROM public.profiles AS existing
    WHERE existing.id = auth.uid()
  )
);

CREATE POLICY "Admins can manage profiles"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can create their own email intake rows" ON public.emails;
DROP POLICY IF EXISTS "Users can read their own email intake rows" ON public.emails;
DROP POLICY IF EXISTS "Admins can view all emails" ON public.emails;

CREATE POLICY "Users can create their own email intake rows"
ON public.emails
FOR INSERT
TO authenticated
WITH CHECK (sender = public.current_user_email());

CREATE POLICY "Users can read their own email intake rows"
ON public.emails
FOR SELECT
TO authenticated
USING (sender = public.current_user_email());

CREATE POLICY "Admins can view all emails"
ON public.emails
FOR SELECT
TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all request summaries" ON public.email_summaries;
DROP POLICY IF EXISTS "Users can read summaries for their requests" ON public.email_summaries;

CREATE POLICY "Admins can read all request summaries"
ON public.email_summaries
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Users can read summaries for their requests"
ON public.email_summaries
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.requests
    WHERE requests.email_id = email_summaries.email_id
      AND requests.requester_email = public.current_user_email()
  )
);

DROP POLICY IF EXISTS "Admins can read all requests" ON public.requests;
DROP POLICY IF EXISTS "Users can read their own requests" ON public.requests;
DROP POLICY IF EXISTS "Admins can update requests" ON public.requests;

CREATE POLICY "Admins can read all requests"
ON public.requests
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Users can read their own requests"
ON public.requests
FOR SELECT
TO authenticated
USING (requester_email = public.current_user_email());

CREATE POLICY "Admins can update requests"
ON public.requests
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can read all activity logs" ON public.activity_log;
DROP POLICY IF EXISTS "Users can read their own request logs" ON public.activity_log;
DROP POLICY IF EXISTS "Admins can insert activity logs" ON public.activity_log;

CREATE POLICY "Admins can read all activity logs"
ON public.activity_log
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "Users can read their own request logs"
ON public.activity_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.requests
    WHERE requests.id = activity_log.request_id
      AND requests.requester_email = public.current_user_email()
  )
);

CREATE POLICY "Admins can insert activity logs"
ON public.activity_log
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

ALTER VIEW public.dashboard_stats SET (security_invoker = true);
GRANT SELECT ON public.dashboard_stats TO authenticated;
