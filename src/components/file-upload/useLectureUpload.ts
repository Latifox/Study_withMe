
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

  // Helper function to delay execution
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Enhanced function to verify lecture content with robust retry mechanism
  const verifyLectureContent = async (lectureId: number, isProfessor: boolean, maxRetries = 10): Promise<string | null> => {
    console.log(`Verifying lecture content for lecture ID ${lectureId}, isProfessor: ${isProfessor}`);
    const tableName = isProfessor ? 'professor_lectures' : 'lectures';
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Content verification attempt ${attempt}/${maxRetries}`);
      const { data, error } = await supabase
        .from(tableName)
        .select('content')
        .eq('id', lectureId)
        .single();
      
      if (error) {
        console.error(`Error verifying content (attempt ${attempt}):`, error);
      } else if (data?.content) {
        console.log(`Content found on attempt ${attempt}, length: ${data.content.length} characters`);
        return data.content;
      }
      
      if (attempt < maxRetries) {
        const waitTime = 3000 * attempt; // Exponential backoff
        console.log(`Waiting ${waitTime}ms before next verification attempt...`);
        await delay(waitTime);
      }
    }
    
    console.error(`Failed to verify lecture content after ${maxRetries} attempts`);
    return null;
  };

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
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('lecture_pdfs')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }
      console.log('PDF uploaded successfully to path:', filePath);

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
          
        if (error) throw new Error(`Failed to save lecture metadata: ${error.message}`);
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
          
        if (error) throw new Error(`Failed to save lecture metadata: ${error.message}`);
        lectureData = data;
      }

      console.log('Lecture saved successfully:', lectureData);

      if (!lectureData?.id) {
        throw new Error('No lecture ID returned from database');
      }

      setCurrentLectureId(lectureData.id);
      setShowAIProfessor(true);

      // Step 1: Extract PDF content with detailed error handling
      console.log('Extracting PDF content...');
      try {
        const extractParams = {
          filePath,
          lectureId: lectureData.id.toString(),
          isProfessorLecture: isProfessorCourse
        };
        
        console.log('Calling extract-pdf-text function with params:', extractParams);
        
        const { data: extractionData, error: extractionError } = await supabase.functions.invoke('extract-pdf-text', {
          body: extractParams
        });

        console.log('Response from extract-pdf-text:', { data: extractionData, error: extractionError });

        if (extractionError) {
          console.error('PDF extraction error:', extractionError);
          throw new Error(`Failed to extract PDF content: ${extractionError.message || 'Unknown error'}`);
        }
        
        if (!extractionData || extractionData.success === false) {
          throw new Error('PDF extraction failed: ' + (extractionData?.error || 'No content returned'));
        }
        
        console.log('PDF content extracted successfully, waiting for database update...');
        
        // Wait longer to ensure content is stored in the database before proceeding
        console.log('Waiting for content to be stored in the database...');
        await delay(10000); // 10 seconds initial delay to allow the edge function to complete
        
        // Verify content is saved and retry if needed
        console.log('Verifying lecture content...');
        const lectureContent = await verifyLectureContent(lectureData.id, isProfessorCourse);
        
        if (!lectureContent) {
          console.error('Unable to verify lecture content in the database after multiple attempts');
          throw new Error('Failed to store lecture content in the database');
        }
        
        console.log(`Verified lecture content in database. Content length: ${lectureContent.length} characters`);

        // Step 2: Generate segment structure with content explicitly provided
        console.log('Generating segment structure...');
        const segmentsFunctionName = isProfessorCourse ? 'generate-professor-segments-structure' : 'generate-segments-structure';
        
        console.log(`Invoking edge function: ${segmentsFunctionName}`);
        const segmentRequestBody = {
          lectureId: lectureData.id,
          lectureTitle: title,
          isProfessorLecture: isProfessorCourse,
          lectureContent: lectureContent // Explicitly provide the lecture content
        };
        
        console.log('Request payload for segment structure:', segmentRequestBody);
        
        try {
          const { data: segmentData, error: segmentError } = await supabase.functions.invoke(segmentsFunctionName, {
            body: segmentRequestBody
          });

          console.log('Response from segment generation:', { data: segmentData, error: segmentError });

          if (segmentError) {
            console.error('Segment generation error:', segmentError);
            throw new Error(`Failed to generate segments: ${segmentError.message || 'Unknown error'}`);
          }
          
          if (!segmentData || segmentData.success === false) {
            throw new Error('Segment generation failed: ' + (segmentData?.error || 'No segments returned'));
          }
          
          console.log('Segment structure generated successfully:', segmentData);

          // Step 3: Generate content for each segment
          console.log('Generating content for all segments...');
          const maxRetries = 3;

          const generateSegmentWithRetry = async (segment: any, attemptCount = 0) => {
            try {
              console.log(`Generating content for segment ${segment.sequence_number}, attempt ${attemptCount + 1}...`);
              const contentFunctionName = isProfessorCourse ? 'generate-professor-segment-content' : 'generate-segment-content';
              
              const response = await supabase.functions.invoke(contentFunctionName, {
                body: {
                  lectureId: lectureData.id,
                  segmentNumber: segment.sequence_number,
                  segmentTitle: segment.title,
                  segmentDescription: segment.segment_description,
                  lectureContent: lectureContent, // Explicitly pass lecture content
                  isProfessorLecture: isProfessorCourse
                }
              });

              console.log(`Response for segment ${segment.sequence_number}:`, response);

              if (response.error) {
                throw response.error;
              }

              if (!response.data?.success) {
                throw new Error(response.data?.error || 'Failed to generate segment content');
              }

              return response;
            } catch (error: any) {
              console.error(`Error generating segment ${segment.sequence_number}:`, error);
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
            } catch (error: any) {
              console.error(`Failed to generate content for segment ${segment.sequence_number}:`, error);
              // Continue with other segments even if one fails
            }
          }

          console.log('All segment content generated successfully');
        } catch (segmentProcessingError: any) {
          console.error('Error in segment processing:', segmentProcessingError);
          throw new Error(`Segment processing failed: ${segmentProcessingError.message || 'Unknown error'}`);
        }

        await queryClient.invalidateQueries({ queryKey: ['lectures', courseId] });
        
        await delay(500);

        toast({
          title: "Success",
          description: "Lecture uploaded and processed successfully!",
        });
        onClose();
      } catch (extractionError: any) {
        console.error('Error in PDF content extraction process:', extractionError);
        throw new Error(`Failed to process lecture: ${extractionError.message || 'Unknown error'}`);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setShowAIProfessor(false);
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
