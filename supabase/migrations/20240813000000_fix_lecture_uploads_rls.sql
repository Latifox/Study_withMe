
-- Enable RLS for lecture_pdfs storage bucket if not already enabled
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('lecture_pdfs', 'lecture_pdfs', false, false, 104857600, '{application/pdf}')
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the lecture_pdfs bucket
-- Allow authenticated users to upload PDFs
CREATE POLICY "Allow authenticated users to upload PDFs"
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'lecture_pdfs');

-- Allow authenticated users to download PDFs
CREATE POLICY "Allow authenticated users to download PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'lecture_pdfs');

-- Enable RLS for lectures table if not already enabled
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lectures table if they don't exist
-- Allow authenticated users to insert lectures
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'lectures' 
        AND policyname = 'Allow authenticated users to insert lectures'
    ) THEN
        CREATE POLICY "Allow authenticated users to insert lectures"
        ON public.lectures
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END
$$;

-- Allow users to select lectures
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'lectures' 
        AND policyname = 'Allow authenticated users to select lectures'
    ) THEN
        CREATE POLICY "Allow authenticated users to select lectures"
        ON public.lectures
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END
$$;

-- Allow users to update their own lectures
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'lectures' 
        AND policyname = 'Allow users to update their own lectures'
    ) THEN
        CREATE POLICY "Allow users to update their own lectures"
        ON public.lectures
        FOR UPDATE
        TO authenticated
        USING (
            course_id IN (
                SELECT id FROM public.courses
                WHERE owner_id = auth.uid()
            )
        );
    END IF;
END
$$;

-- Also apply the same policies to professor_lectures table
ALTER TABLE public.professor_lectures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for professor_lectures table if they don't exist
-- Allow authenticated users to insert professor_lectures
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'professor_lectures' 
        AND policyname = 'Allow authenticated users to insert professor_lectures'
    ) THEN
        CREATE POLICY "Allow authenticated users to insert professor_lectures"
        ON public.professor_lectures
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;
END
$$;

-- Allow users to select professor_lectures
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'professor_lectures' 
        AND policyname = 'Allow authenticated users to select professor_lectures'
    ) THEN
        CREATE POLICY "Allow authenticated users to select professor_lectures"
        ON public.professor_lectures
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END
$$;

-- Allow users to update their own professor_lectures
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'professor_lectures' 
        AND policyname = 'Allow users to update their own professor_lectures'
    ) THEN
        CREATE POLICY "Allow users to update their own professor_lectures"
        ON public.professor_lectures
        FOR UPDATE
        TO authenticated
        USING (
            professor_course_id IN (
                SELECT id FROM public.professor_courses
                WHERE owner_id = auth.uid()
            )
        );
    END IF;
END
$$;
