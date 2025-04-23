-- Create storage buckets for the application

-- Create lecture_pdfs bucket for PDF storage
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('lecture_pdfs', 'lecture_pdfs', false, false, 104857600, '{application/pdf}')
ON CONFLICT (id) DO NOTHING;

-- Create audio_podcasts bucket for podcast audio files
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('audio_podcasts', 'audio_podcasts', false, false, 52428800, '{audio/mpeg,audio/mp3,audio/mp4,audio/wav,audio/ogg}')
ON CONFLICT (id) DO NOTHING;

-- Create lecture_resources bucket for additional lecture resources
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('lecture_resources', 'lecture_resources', false, false, 20971520, '{application/pdf,image/jpeg,image/png,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document}')
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for lecture_pdfs bucket
CREATE POLICY "Allow authenticated users to upload lecture PDFs"
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'lecture_pdfs');

CREATE POLICY "Allow users to download their lecture PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lecture_pdfs' AND
  (EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lectures.pdf_path LIKE '%' || storage.objects.name || '%'
    AND courses.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.professor_lectures
    JOIN public.professor_courses ON professor_lectures.professor_course_id = professor_courses.id
    WHERE professor_lectures.pdf_path LIKE '%' || storage.objects.name || '%'
    AND professor_courses.owner_id = auth.uid()
  ))
);

CREATE POLICY "Allow users to delete their lecture PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lecture_pdfs' AND
  (EXISTS (
    SELECT 1 FROM public.lectures
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lectures.pdf_path LIKE '%' || storage.objects.name || '%'
    AND courses.owner_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.professor_lectures
    JOIN public.professor_courses ON professor_lectures.professor_course_id = professor_courses.id
    WHERE professor_lectures.pdf_path LIKE '%' || storage.objects.name || '%'
    AND professor_courses.owner_id = auth.uid()
  ))
);

-- Create RLS policies for audio_podcasts bucket
CREATE POLICY "Allow authenticated users to upload podcast audio"
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'audio_podcasts');

CREATE POLICY "Allow users to download their podcast audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'audio_podcasts' AND
  EXISTS (
    SELECT 1 FROM public.lecture_podcast
    JOIN public.lectures ON lecture_podcast.lecture_id = lectures.id
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE (lecture_podcast.stored_audio_path LIKE '%' || storage.objects.name || '%'
    OR lecture_podcast.audio_url LIKE '%' || storage.objects.name || '%')
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "Allow users to delete their podcast audio"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'audio_podcasts' AND
  EXISTS (
    SELECT 1 FROM public.lecture_podcast
    JOIN public.lectures ON lecture_podcast.lecture_id = lectures.id
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE (lecture_podcast.stored_audio_path LIKE '%' || storage.objects.name || '%'
    OR lecture_podcast.audio_url LIKE '%' || storage.objects.name || '%')
    AND courses.owner_id = auth.uid()
  )
);

-- Create RLS policies for lecture_resources bucket
CREATE POLICY "Allow authenticated users to upload lecture resources"
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'lecture_resources');

CREATE POLICY "Allow users to download their lecture resources"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'lecture_resources' AND
  (EXISTS (
    SELECT 1 FROM public.lecture_additional_resources
    JOIN public.lectures ON lecture_additional_resources.lecture_id = lectures.id
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_additional_resources.content LIKE '%' || storage.objects.name || '%'
    AND courses.owner_id = auth.uid()
  ))
);

CREATE POLICY "Allow users to delete their lecture resources"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'lecture_resources' AND
  (EXISTS (
    SELECT 1 FROM public.lecture_additional_resources
    JOIN public.lectures ON lecture_additional_resources.lecture_id = lectures.id
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE lecture_additional_resources.content LIKE '%' || storage.objects.name || '%'
    AND courses.owner_id = auth.uid()
  ))
); 