
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";

interface DeleteProfessorCourseDialogProps {
  courseId: number;
  courseTitle: string;
}

export function DeleteProfessorCourseDialog({ courseId, courseTitle }: DeleteProfessorCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      console.log('Deleting professor course:', courseId);
      
      // Get all lectures for this course
      const { data: lectures, error: lecturesQueryError } = await supabase
        .from('professor_lectures')
        .select('id')
        .eq('professor_course_id', courseId);

      if (lecturesQueryError) throw lecturesQueryError;

      // Delete related content for each lecture
      if (lectures && lectures.length > 0) {
        const lectureIds = lectures.map(lecture => lecture.id);
        console.log('Deleting content for lecture IDs:', lectureIds);
        
        // Process each lecture individually to ensure proper deletion order
        for (const lectureId of lectureIds) {
          // Step 1: Delete any podcast connections first
          const { data: podcastData, error: podcastQueryError } = await supabase
            .from('lecture_podcast')
            .select('id, stored_audio_path')
            .eq('lecture_id', lectureId);
            
          if (podcastQueryError && !podcastQueryError.message.includes('no rows')) {
            console.error(`Error fetching podcast data for lecture ${lectureId}:`, podcastQueryError);
            throw podcastQueryError;
          }
          
          if (podcastData && podcastData.length > 0) {
            // Delete stored podcast audio files if they exist
            for (const record of podcastData) {
              if (record.stored_audio_path) {
                console.log('Deleting stored podcast audio file:', record.stored_audio_path);
                const { error: storageError } = await supabase
                  .storage
                  .from('podcast_audio')
                  .remove([record.stored_audio_path]);
                  
                if (storageError) {
                  console.log('Error deleting podcast audio file (continuing):', storageError);
                  // Continue with deletion even if file removal fails
                }
              }
              
              // Delete individual podcast record
              const { error: podcastDeleteError } = await supabase
                .from('lecture_podcast')
                .delete()
                .eq('id', record.id);
              
              if (podcastDeleteError) {
                console.error(`Error deleting podcast record ${record.id}:`, podcastDeleteError);
                throw podcastDeleteError;
              }
            }
          }
          
          // Step 2: Delete professor segments content
          const { error: segmentsError } = await supabase
            .from('professor_segments_content')
            .delete()
            .eq('lecture_id', lectureId);

          if (segmentsError && !segmentsError.message.includes('no rows')) {
            console.error(`Error deleting professor segments content for lecture ${lectureId}:`, segmentsError);
            throw segmentsError;
          }

          // Step 3: Delete professor segments info
          const { error: segmentInfoError } = await supabase
            .from('professor_lecture_segments')
            .delete()
            .eq('lecture_id', lectureId);

          if (segmentInfoError && !segmentInfoError.message.includes('no rows')) {
            console.error(`Error deleting professor segments info for lecture ${lectureId}:`, segmentInfoError);
            throw segmentInfoError;
          }
        }
        
        // Step 4: Now it's safe to delete all lectures since dependencies are removed
        for (const lectureId of lectureIds) {
          // Get the PDF path before deleting
          const { data: lectureData, error: lectureDataError } = await supabase
            .from('professor_lectures')
            .select('pdf_path')
            .eq('id', lectureId)
            .maybeSingle();
            
          if (lectureDataError) {
            console.error(`Error fetching lecture data for ${lectureId}:`, lectureDataError);
            // Continue with deletion even if we can't get the PDF path
          }
          
          // Delete the lecture
          const { error: lectureDeleteError } = await supabase
            .from('professor_lectures')
            .delete()
            .eq('id', lectureId);

          if (lectureDeleteError) {
            console.error(`Error deleting professor lecture ${lectureId}:`, lectureDeleteError);
            throw lectureDeleteError;
          }
          
          // Delete the PDF file if it exists
          if (lectureData?.pdf_path) {
            const { error: storageError } = await supabase
              .storage
              .from('lecture_pdfs')
              .remove([lectureData.pdf_path]);
              
            if (storageError) {
              console.log(`Error deleting PDF file for lecture ${lectureId} (continuing):`, storageError);
              // Continue with other deletions even if file removal fails
            }
          }
        }
      }

      // Step 5: Delete student enrollment records
      const { error: enrollmentError } = await supabase
        .from('student_enrolled_courses')
        .delete()
        .eq('course_id', courseId);

      if (enrollmentError && !enrollmentError.message.includes('no rows')) {
        console.error('Error deleting student enrollments:', enrollmentError);
        throw enrollmentError;
      }

      // Step 6: Finally delete the course
      console.log('Deleting the professor course itself:', courseId);
      const { error: courseError } = await supabase
        .from('professor_courses')
        .delete()
        .eq('id', courseId);

      if (courseError) {
        console.error('Error deleting professor course:', courseError);
        throw courseError;
      }

      toast({
        title: "Success",
        description: "Professor course and all its content deleted successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['professor-courses'] });
      setOpen(false);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete course: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="icon">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Professor Course</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{courseTitle}"? This will also delete all lectures and related content. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-4 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Alias for backward compatibility
export const DeleteCourseDialog = DeleteProfessorCourseDialog;
