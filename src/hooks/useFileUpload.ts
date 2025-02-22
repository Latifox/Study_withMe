
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { readFileContent, validateFile } from "@/utils/fileUtils";

interface UseFileUploadProps {
  courseId?: string;
  onClose: () => void;
}

export const useFileUpload = ({ courseId, onClose }: UseFileUploadProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [showAIProfessor, setShowAIProfessor] = useState(false);
  const [currentLectureId, setCurrentLectureId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleUpload = async () => {
    const validationError = validateFile(file);
    if (!file || !title || !courseId || validationError) {
      toast({
        title: "Error",
        description: validationError || "Please provide both a title and a file",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Read and clean file content
      console.log('Reading file content...');
      const fileContent = await readFileContent(file);
      console.log('File content length:', fileContent.length);

      // Upload PDF to storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      
      console.log('Uploading PDF to storage...');
      const { error: uploadError } = await supabase.storage
        .from('lecture_pdfs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;
      console.log('PDF uploaded successfully');

      // Save lecture metadata
      console.log('Saving lecture to database...');
      const { data: lectureData, error: dbError } = await supabase
        .from('lectures')
        .insert({
          course_id: parseInt(courseId),
          title,
          pdf_path: filePath,
          content: fileContent
        })
        .select()
        .single();

      if (dbError) throw dbError;
      console.log('Lecture saved successfully');

      if (!lectureData?.id) {
        throw new Error('No lecture ID returned from database');
      }

      setCurrentLectureId(lectureData.id);
      setShowAIProfessor(true);

      // Generate segments structure
      console.log('Generating segment structure...');
      const { data: segmentData, error: segmentError } = await supabase.functions.invoke('generate-segments-structure', {
        body: {
          lectureId: lectureData.id,
          lectureContent: fileContent
        }
      });

      if (segmentError) throw segmentError;
      if (!segmentData?.segments) {
        throw new Error('No segments returned from generation');
      }

      console.log('Segment structure generated:', segmentData);

      // Generate content for each segment in parallel
      console.log('Generating content for all segments...');
      await Promise.all(segmentData.segments.map((segment: any) => 
        supabase.functions.invoke('generate-segment-content', {
          body: {
            lectureId: lectureData.id,
            segmentNumber: segment.sequence_number,
            lectureContent: fileContent,
            segmentTitle: segment.title,
            segmentDescription: segment.segment_description
          }
        })
      ));

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
