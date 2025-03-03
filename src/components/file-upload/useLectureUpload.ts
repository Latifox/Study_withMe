
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
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      
      console.log('Uploading PDF to storage...');
      const { error: uploadError } = await supabase.storage
        .from('lecture_pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      console.log('PDF uploaded successfully');

      console.log(`Saving lecture to ${isProfessorCourse ? 'professor_lectures' : 'lectures'} table...`);
      
      let lectureData;
      
      if (isProfessorCourse) {
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
      
      try {
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

        console.log('Generating segment structure...');
        const segmentsFunctionName = isProfessorCourse ? 'generate-professor-segments-structure' : 'generate-segments-structure';
        
        try {
          const { data: segmentData, error: segmentError } = await supabase.functions.invoke(segmentsFunctionName, {
            body: {
              lectureId: lectureData.id,
              lectureContent: extractionData.content,
              lectureTitle: title,
              isProfessorLecture: isProfessorCourse
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

          console.log('Generating content for all segments...');
          const maxRetries = 5;
          const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

          const generateSegmentWithRetry = async (segment: any, attemptCount = 0) => {
            try {
              console.log(`Generating content for segment ${segment.sequence_number}, attempt ${attemptCount + 1}`);
              
              const requestBody = {
                lectureId: lectureData.id,
                segmentNumber: segment.sequence_number,
                segmentTitle: segment.title,
                segmentDescription: segment.segment_description,
                lectureContent: extractionData.content,
                isProfessorLecture: isProfessorCourse,
                contentLanguage: "english"
              };
              
              console.log('Request body prepared for segment content generation');
              
              try {
                console.log(`Calling edge function for segment ${segment.sequence_number}`);
                const response = await supabase.functions.invoke('generate-segment-content', {
                  body: requestBody
                });

                if (response.error) {
                  console.error(`Edge function error for segment ${segment.sequence_number}:`, response.error);
                  throw new Error(`Edge function error: ${response.error.message || 'Unknown error'}`);
                }

                console.log(`Response received for segment ${segment.sequence_number}:`, response.data);

                if (!response.data?.success) {
                  console.error(`Generation failure for segment ${segment.sequence_number}:`, response.data?.error);
                  throw new Error(response.data?.error || 'Failed to generate segment content');
                }

                return response;
              } catch (edgeFunctionError) {
                console.error(`Edge function call failed for segment ${segment.sequence_number}:`, edgeFunctionError);
                throw edgeFunctionError;
              }
            } catch (error) {
              console.error(`Error generating segment ${segment.sequence_number}:`, error);
              
              if (attemptCount < maxRetries) {
                const backoffTime = 2000 * Math.pow(1.5, attemptCount) + (Math.random() * 1000);
                console.log(`Retrying segment ${segment.sequence_number} in ${backoffTime}ms, attempt ${attemptCount + 1}...`);
                await delay(backoffTime);
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
              console.error(`Failed to generate content for segment ${segment.sequence_number} after multiple retries:`, error);
              toast({
                title: "Warning",
                description: `Failed to generate content for segment ${segment.sequence_number}. You may need to regenerate it later.`,
                variant: "destructive",
              });
            }
          }

          console.log('All segment content generation attempts completed');

          await queryClient.invalidateQueries({ queryKey: ['lectures', courseId] });
          
          await new Promise(resolve => setTimeout(resolve, 500));

          toast({
            title: "Success",
            description: "Lecture uploaded and processed successfully!",
          });
          onClose();
        } catch (segmentError) {
          console.error('Error during segment generation:', segmentError);
          throw segmentError;
        }
      } catch (textExtractionError) {
        console.error('Error during text extraction:', textExtractionError);
        throw textExtractionError;
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setShowAIProfessor(false);
      
      const errorMessage = error.message || "Failed to upload lecture";
      let detailedMessage = errorMessage;
      
      if (errorMessage.includes("Edge function error") || errorMessage.includes("failed to send request")) {
        detailedMessage = "Failed to communicate with AI processing service. Please try again later or contact support.";
      } else if (errorMessage.includes("network")) {
        detailedMessage = "Network error occurred. Please check your internet connection and try again.";
      } else if (errorMessage.includes("timeout")) {
        detailedMessage = "Request timed out. The server might be busy, please try again later.";
      }
      
      toast({
        title: "Error",
        description: detailedMessage,
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
