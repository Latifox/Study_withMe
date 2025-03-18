
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";

interface DeleteCourseDialogProps {
  courseId: number;
  courseTitle: string;
}

export function DeleteCourseDialog({ courseId, courseTitle }: DeleteCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      console.log('Deleting course:', courseId);
      
      // Get all lectures for this course
      const { data: lectures, error: lecturesQueryError } = await supabase
        .from('lectures')
        .select('id')
        .eq('course_id', courseId);

      if (lecturesQueryError) throw lecturesQueryError;

      // Delete related content for each lecture
      if (lectures && lectures.length > 0) {
        const lectureIds = lectures.map(lecture => lecture.id);
        
        // Step 1: First handle the foreign key constraint by explicitly deleting from lecture_podcast
        console.log('Deleting lecture podcasts for lecture IDs:', lectureIds);
        const { error: podcastsError } = await supabase
          .from('lecture_podcast')
          .delete()
          .in('lecture_id', lectureIds);
        
        // If there's an error but it's not "no rows" error, throw it
        if (podcastsError && !podcastsError.message.includes('no rows')) {
          console.error('Error deleting podcasts:', podcastsError);
          throw podcastsError;
        }
        
        // Step 2: Now delete generated quizzes
        const { error: quizzesError } = await supabase
          .from('generated_quizzes')
          .delete()
          .in('lecture_id', lectureIds);

        if (quizzesError && !quizzesError.message.includes('no rows')) {
          console.error('Error deleting quizzes:', quizzesError);
          throw quizzesError;
        }
        
        // Delete quiz progress
        const { error: quizProgressError } = await supabase
          .from('quiz_progress')
          .delete()
          .in('lecture_id', lectureIds);

        if (quizProgressError && !quizProgressError.message.includes('no rows')) {
          console.error('Error deleting quiz progress:', quizProgressError);
          throw quizProgressError;
        }

        // Delete user progress
        const { error: userProgressError } = await supabase
          .from('user_progress')
          .delete()
          .in('lecture_id', lectureIds);

        if (userProgressError && !userProgressError.message.includes('no rows')) {
          console.error('Error deleting user progress:', userProgressError);
          throw userProgressError;
        }

        // Delete flashcards
        const { error: flashcardsError } = await supabase
          .from('flashcards')
          .delete()
          .in('lecture_id', lectureIds);

        if (flashcardsError && !flashcardsError.message.includes('no rows')) {
          console.error('Error deleting flashcards:', flashcardsError);
          throw flashcardsError;
        }

        // Delete lecture highlights
        const { error: highlightsError } = await supabase
          .from('lecture_highlights')
          .delete()
          .in('lecture_id', lectureIds);

        if (highlightsError && !highlightsError.message.includes('no rows')) {
          console.error('Error deleting highlights:', highlightsError);
          throw highlightsError;
        }

        // Delete segments content
        const { error: segmentsError } = await supabase
          .from('segments_content')
          .delete()
          .in('lecture_id', lectureIds);

        if (segmentsError && !segmentsError.message.includes('no rows')) {
          console.error('Error deleting segments:', segmentsError);
          throw segmentsError;
        }

        // Delete AI configs
        const { error: configError } = await supabase
          .from('lecture_ai_configs')
          .delete()
          .in('lecture_id', lectureIds);

        if (configError && !configError.message.includes('no rows')) {
          console.error('Error deleting AI configs:', configError);
          throw configError;
        }

        // Delete segments info
        const { error: segmentInfoError } = await supabase
          .from('lecture_segments')
          .delete()
          .in('lecture_id', lectureIds);

        if (segmentInfoError && !segmentInfoError.message.includes('no rows')) {
          console.error('Error deleting segment info:', segmentInfoError);
          throw segmentInfoError;
        }

        // Delete study plans
        const { error: studyPlansError } = await supabase
          .from('study_plans')
          .delete()
          .in('lecture_id', lectureIds);

        if (studyPlansError && !studyPlansError.message.includes('no rows')) {
          console.error('Error deleting study plans:', studyPlansError);
          throw studyPlansError;
        }

        // Step 3: Finally delete the lectures
        console.log('Deleting lectures for course ID:', courseId);
        const { error: lecturesError } = await supabase
          .from('lectures')
          .delete()
          .eq('course_id', courseId);

        if (lecturesError) {
          console.error('Error deleting lectures:', lecturesError);
          throw lecturesError;
        }
      }

      // Step 4: Finally delete the course itself
      console.log('Deleting the course itself:', courseId);
      const { error: courseError } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (courseError) {
        console.error('Error deleting course:', courseError);
        throw courseError;
      }

      toast({
        title: "Success",
        description: "Course and all its content deleted successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['uploaded-courses'] });
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
          <DialogTitle>Delete Course</DialogTitle>
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
