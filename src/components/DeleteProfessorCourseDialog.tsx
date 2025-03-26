
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
        
        // Step 1: First delete any podcast connections and files
        console.log('Deleting podcast data for lecture IDs:', lectureIds);
        
        // Get podcast records to check for stored files
        const { data: podcastRecords, error: podcastRecordsError } = await supabase
          .from('lecture_podcast')
          .select('id, stored_audio_path')
          .in('lecture_id', lectureIds);
          
        if (podcastRecordsError && !podcastRecordsError.message.includes('no rows')) {
          console.error('Error fetching podcast records:', podcastRecordsError);
          throw podcastRecordsError;
        } 
        
        if (podcastRecords && podcastRecords.length > 0) {
          // Delete any stored audio files if they exist
          for (const record of podcastRecords) {
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
          }
          
          // Delete podcast records
          const { error: podcastsError } = await supabase
            .from('lecture_podcast')
            .delete()
            .in('lecture_id', lectureIds);
            
          if (podcastsError) {
            console.error('Error deleting podcast records:', podcastsError);
            throw podcastsError;
          }
        }
        
        // Step 2: Delete professor segments content
        const { error: segmentsError } = await supabase
          .from('professor_segments_content')
          .delete()
          .in('lecture_id', lectureIds);

        if (segmentsError && !segmentsError.message.includes('no rows')) {
          console.error('Error deleting professor segments content:', segmentsError);
          throw segmentsError;
        }

        // Step 3: Delete professor segments info
        const { error: segmentInfoError } = await supabase
          .from('professor_lecture_segments')
          .delete()
          .in('lecture_id', lectureIds);

        if (segmentInfoError && !segmentInfoError.message.includes('no rows')) {
          console.error('Error deleting professor segments info:', segmentInfoError);
          throw segmentInfoError;
        }

        // Step 4: Delete all lectures
        console.log('Deleting professor lectures for course ID:', courseId);
        const { error: lecturesError } = await supabase
          .from('professor_lectures')
          .delete()
          .eq('professor_course_id', courseId);

        if (lecturesError) {
          console.error('Error deleting professor lectures:', lecturesError);
          throw lecturesError;
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
