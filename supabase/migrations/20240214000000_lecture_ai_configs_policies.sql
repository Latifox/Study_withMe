
-- Enable RLS
ALTER TABLE public.lecture_ai_configs ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own configs
CREATE POLICY "Users can read configs for lectures they have access to"
ON public.lecture_ai_configs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM lectures l
    LEFT JOIN courses c ON l.course_id = c.id
    WHERE l.id = lecture_ai_configs.lecture_id
    AND (
      c.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM invited_users iu
        WHERE iu.course_id = c.id
        AND iu.user_id = auth.uid()
      )
    )
  )
);

-- Allow users to insert/update their own configs
CREATE POLICY "Users can insert/update configs for lectures they have access to"
ON public.lecture_ai_configs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM lectures l
    LEFT JOIN courses c ON l.course_id = c.id
    WHERE l.id = lecture_ai_configs.lecture_id
    AND (
      c.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM invited_users iu
        WHERE iu.course_id = c.id
        AND iu.user_id = auth.uid()
      )
    )
  )
);
