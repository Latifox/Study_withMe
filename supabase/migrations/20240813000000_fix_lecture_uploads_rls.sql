
-- Enable RLS for lecture_pdfs storage bucket if not already enabled
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('lecture_pdfs', 'lecture_pdfs', false, false, 104857600, '{application/pdf}')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on the storage bucket
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

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

-- Allow authenticated users to delete PDFs
CREATE POLICY "Allow authenticated users to delete PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'lecture_pdfs');

-- Enable RLS for lectures table
ALTER TABLE public.lectures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lectures table
-- Allow authenticated users to insert lectures
CREATE POLICY "Allow users to insert lectures"
ON public.lectures
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to select lectures
CREATE POLICY "Allow users to select lectures"
ON public.lectures
FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own lectures
CREATE POLICY "Allow users to update their own lectures"
ON public.lectures
FOR UPDATE
TO authenticated
USING (true);

-- Allow users to delete their own lectures
CREATE POLICY "Allow users to delete their own lectures"
ON public.lectures
FOR DELETE
TO authenticated
USING (true);

-- Enable RLS for professor_lectures table
ALTER TABLE public.professor_lectures ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for professor_lectures table
-- Allow authenticated users to insert professor_lectures
CREATE POLICY "Allow users to insert professor_lectures"
ON public.professor_lectures
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to select professor_lectures
CREATE POLICY "Allow users to select professor_lectures"
ON public.professor_lectures
FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own professor_lectures
CREATE POLICY "Allow users to update their own professor_lectures"
ON public.professor_lectures
FOR UPDATE
TO authenticated
USING (true);

-- Allow users to delete their own professor_lectures
CREATE POLICY "Allow users to delete their own professor_lectures"
ON public.professor_lectures
FOR DELETE
TO authenticated
USING (true);
