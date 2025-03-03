
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

export const useLectureUpload = (onClose: () => void, courseId?: string, isProfessorCourse = false) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showAIProfessor, setShowAIProfessor] = useState(false);
  const [currentLectureId, setCurrentLectureId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleUpload = async () => {
    if (!file || !title || !courseId) {
      toast({
        title: "Error",
        description: "Please provide both a title and a file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Upload PDF to storage first
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      
      console.log('Uploading PDF to storage...');
      const { error: uploadError } = await supabase.storage
        .from('lecture_pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      console.log('PDF uploaded successfully');

      // Save lecture metadata to the appropriate table based on course type
      console.log(`Saving lecture to ${isProfessorCourse ? 'professor_lectures' : 'lectures'} table...`);
      
      let lectureData;
      
      if (isProfessorCourse) {
        // Insert into professor_lectures table
        const { data, error } = await supabase
          .from('professor_lectures')
          .insert({
            professor_course_id: parseInt(courseId),
            title,
            pdf_path: filePath,
          })
          .select()
          .single();
          
        if (error) throw error;
        lectureData = data;
      } else {
        // Insert into regular lectures table
        const { data, error } = await supabase
          .from('lectures')
          .insert({
            course_id: parseInt(courseId),
            title,
            pdf_path: filePath,
          })
          .select()
          .single();
          
        if (error) throw error;
        lectureData = data;
      }

      console.log('Lecture saved successfully:', lectureData);

      if (!lectureData?.id) {
        throw new Error('No lecture ID returned from database');
      }

      setCurrentLectureId(lectureData.id);
      setShowAIProfessor(true);

      console.log('Extracting PDF content...');
      const { data: extractionData, error: extractionError } = await supabase.functions.invoke('extract-pdf-text', {
        body: {
          filePath,
          lectureId: lectureData.id.toString(),
          isProfessorLecture: isProfessorCourse
        }
      });

      if (extractionError) throw extractionError;
      if (!extractionData || !extractionData.content) {
        throw new Error('No content returned from PDF extraction');
      }
      
      console.log('PDF content extracted, first 200 chars:', extractionData.content.substring(0, 200));
      console.log('Content length:', extractionData.content.length);

      // Update the content column in the appropriate table
      const updateContentError = isProfessorCourse
        ? (await supabase
            .from('professor_lectures')
            .update({ content: extractionData.content })
            .eq('id', lectureData.id)).error
        : (await supabase
            .from('lectures')
            .update({ content: extractionData.content })
            .eq('id', lectureData.id)).error;

      if (updateContentError) {
        console.error('Error updating lecture content:', updateContentError);
        throw updateContentError;
      }

      console.log('Lecture content updated successfully');

      // Generate segment structure (titles and descriptions)
      console.log('Generating segment structure...');
      const segmentsFunctionName = isProfessorCourse ? 'generate-professor-segments-structure' : 'generate-segments-structure';
      
      console.log(`Invoking edge function: ${segmentsFunctionName}`);
      console.log('Request payload:', {
        lectureId: lectureData.id,
        lectureContent: extractionData.content,
        lectureTitle: title
      });
      
      const { data: segmentData, error: segmentError } = await supabase.functions.invoke(segmentsFunctionName, {
        body: {
          lectureId: lectureData.id,
          lectureContent: extractionData.content,
          lectureTitle: title
        }
      });

      if (segmentError) {
        console.error('Segment generation error:', segmentError);
        throw new Error(`Failed to generate segments: ${segmentError.message || 'Unknown error'}`);
      }
      
      if (!segmentData || !segmentData.segments) {
        throw new Error('No segments returned from generation');
      }
      
      console.log('Segment structure generated:', segmentData);

      // Generate content for each segment with proper error handling and retries
      console.log('Generating content for all segments...');
      const maxRetries = 3;
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      const generateSegmentWithRetry = async (segment: any, attemptCount = 0) => {
        try {
          const response = await supabase.functions.invoke('generate-segment-content', {
            body: {
              lectureId: lectureData.id,
              segmentNumber: segment.sequence_number,
              segmentTitle: segment.title,
              segmentDescription: segment.segment_description,
              lectureContent: extractionData.content,
              isProfessorLecture: isProfessorCourse
            }
          });

          if (response.error) {
            throw response.error;
          }

          if (!response.data?.success) {
            throw new Error(response.data?.error || 'Failed to generate segment content');
          }

          return response;
        } catch (error) {
          if (attemptCount < maxRetries) {
            console.log(`Retrying segment ${segment.sequence_number}, attempt ${attemptCount + 1}...`);
            await delay(2000 * (attemptCount + 1));
            return generateSegmentWithRetry(segment, attemptCount + 1);
          }
          throw error;
        }
      };

      for (const segment of segmentData.segments) {
        try {
          console.log(`Processing segment ${segment.sequence_number}...`);
          await generateSegmentWithRetry(segment);
          console.log(`Segment ${segment.sequence_number} completed`);
        } catch (error) {
          console.error(`Failed to generate content for segment ${segment.sequence_number}:`, error);
          throw new Error(`Failed to generate content for segment ${segment.sequence_number}: ${error.message}`);
        }
      }

      console.log('All segment content generated successfully');

      await queryClient.invalidateQueries({ queryKey: ['lectures', courseId] });
      
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: "Success",
        description: "Lecture uploaded and processed successfully!",
      });
      onClose();
    } catch (error: any) {
      console.error('Upload error:', error);
      setIsUploading(false);
      toast({
        title: "Error",
        description: error.message || "Failed to upload lecture",
        variant: "destructive",
      });
    }
  };

  return {
    file,
    setFile,
    title,
    setTitle,
    isUploading,
    showAIProfessor,
    currentLectureId,
    handleUpload
  };
};
