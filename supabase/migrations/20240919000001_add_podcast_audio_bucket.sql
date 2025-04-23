-- Create the podcast_audio bucket as an alias to audio_podcasts for backward compatibility
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('podcast_audio', 'podcast_audio', true, false, 52428800, '{audio/mpeg,audio/mp3,audio/mp4,audio/wav,audio/ogg}')
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for podcast_audio bucket with unique names
CREATE POLICY "podcast_audio_upload_policy"
ON storage.objects
FOR INSERT 
TO authenticated
WITH CHECK (bucket_id = 'podcast_audio');

CREATE POLICY "podcast_audio_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'podcast_audio' AND
  EXISTS (
    SELECT 1 FROM public.lecture_podcast
    JOIN public.lectures ON lecture_podcast.lecture_id = lectures.id
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE (lecture_podcast.stored_audio_path LIKE '%' || storage.objects.name || '%'
    OR lecture_podcast.audio_url LIKE '%' || storage.objects.name || '%')
    AND courses.owner_id = auth.uid()
  )
);

CREATE POLICY "podcast_audio_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'podcast_audio' AND
  EXISTS (
    SELECT 1 FROM public.lecture_podcast
    JOIN public.lectures ON lecture_podcast.lecture_id = lectures.id
    JOIN public.courses ON lectures.course_id = courses.id
    WHERE (lecture_podcast.stored_audio_path LIKE '%' || storage.objects.name || '%'
    OR lecture_podcast.audio_url LIKE '%' || storage.objects.name || '%')
    AND courses.owner_id = auth.uid()
  )
);

-- Make the bucket public for access but keep RLS for uploads/deletes
UPDATE storage.buckets
SET public = true
WHERE id = 'podcast_audio';

-- Add a notification about the change
DO $$
BEGIN
    RAISE NOTICE 'Added podcast_audio bucket for backward compatibility with audio_podcasts';
END $$; 