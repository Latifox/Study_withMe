-- Make sure the audio_podcasts bucket exists
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('audio_podcasts', 'audio_podcasts', true, false, 52428800, '{audio/mpeg,audio/mp3,audio/mp4,audio/wav,audio/ogg}')
ON CONFLICT (id) DO UPDATE 
SET public = true;

-- Create RLS policies for audio_podcasts bucket with unique names
DO $$
BEGIN
    -- Create the upload policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'audio_podcasts_upload_policy' 
        AND tablename = 'objects' 
        AND schemaname = 'storage'
    ) THEN
        EXECUTE 'CREATE POLICY "audio_podcasts_upload_policy"
                ON storage.objects
                FOR INSERT 
                TO authenticated
                WITH CHECK (bucket_id = ''audio_podcasts'')';
    END IF;
    
    -- Create the select policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'audio_podcasts_select_policy' 
        AND tablename = 'objects' 
        AND schemaname = 'storage'
    ) THEN
        EXECUTE 'CREATE POLICY "audio_podcasts_select_policy"
                ON storage.objects
                FOR SELECT
                TO authenticated
                USING (
                  bucket_id = ''audio_podcasts'' AND
                  EXISTS (
                    SELECT 1 FROM public.lecture_podcast
                    JOIN public.lectures ON lecture_podcast.lecture_id = lectures.id
                    JOIN public.courses ON lectures.course_id = courses.id
                    WHERE (lecture_podcast.stored_audio_path LIKE ''%'' || storage.objects.name || ''%''
                    OR lecture_podcast.audio_url LIKE ''%'' || storage.objects.name || ''%'')
                    AND courses.owner_id = auth.uid()
                  )
                )';
    END IF;
    
    -- Create the public select policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE policyname = 'audio_podcasts_select_public_policy' 
        AND tablename = 'objects' 
        AND schemaname = 'storage'
    ) THEN
        EXECUTE 'CREATE POLICY "audio_podcasts_select_public_policy"
                ON storage.objects
                FOR SELECT
                TO authenticated
                USING (bucket_id = ''audio_podcasts'' AND 
                      (SELECT public FROM storage.buckets WHERE id = ''audio_podcasts''))';
    END IF;
END
$$;

-- Make sure the bucket is public
UPDATE storage.buckets
SET public = true
WHERE id = 'audio_podcasts';

-- Add a notification about the change
DO $$
BEGIN
    RAISE NOTICE 'Ensured audio_podcasts bucket exists and is public';
END $$; 