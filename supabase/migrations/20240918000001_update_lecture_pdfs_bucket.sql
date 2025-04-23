-- Update the lecture_pdfs bucket to be public to allow direct access to PDF files
-- This is needed for PDF viewing in the chat interface

-- Set the lecture_pdfs bucket to public
UPDATE storage.buckets
SET public = true
WHERE id = 'lecture_pdfs';

-- Note: We keep the RLS policies in place for managing uploads and deletions
-- but we allow public access for viewing the PDFs

-- Add a notification about the change
DO $$
BEGIN
    RAISE NOTICE 'Updated lecture_pdfs bucket to be publicly accessible';
END $$; 