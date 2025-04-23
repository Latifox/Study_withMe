-- Add RLS policies for segments_content table

-- Allow service role to bypass RLS
ALTER TABLE public.segments_content ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows the service role to read content
CREATE POLICY "Service role can read segments_content" 
ON public.segments_content
FOR SELECT 
TO service_role
USING (true);

-- Create a policy that allows the service role to insert content
CREATE POLICY "Service role can insert segments_content" 
ON public.segments_content
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Create a policy that allows the service role to update content
CREATE POLICY "Service role can update segments_content" 
ON public.segments_content
FOR UPDATE 
TO service_role
USING (true);

-- Create a policy that allows the service role to delete content
CREATE POLICY "Service role can delete segments_content" 
ON public.segments_content
FOR DELETE 
TO service_role
USING (true);

-- Users can view segments content for their lectures
CREATE POLICY "Users can view segments_content for their lectures"
ON public.segments_content
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE segments_content.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

-- Users can insert segments content for their lectures
CREATE POLICY "Users can insert segments_content for their lectures"
ON public.segments_content
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE segments_content.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

-- Users can update segments content for their lectures
CREATE POLICY "Users can update segments_content for their lectures"
ON public.segments_content
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE segments_content.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
);

-- Users can delete segments content for their lectures
CREATE POLICY "Users can delete segments_content for their lectures"
ON public.segments_content
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE segments_content.lecture_id = lectures.id
    AND courses.owner_id = auth.uid()
  )
); 