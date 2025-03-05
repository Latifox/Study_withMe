
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

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
      console.log('Deleting professor course with ID:', courseId);
      const { error } = await supabase
        .from('professor_courses')
        .delete()
        .eq('id', courseId);

      if (error) {
        console.error('Error deleting professor course:', error);
        throw error;
      }

      toast({
        title: "Success",
        description: "Course deleted successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['professor-courses'] });
      setOpen(false);
    } catch (error) {
      console.error('Error in handleDelete:', error);
      toast({
        title: "Error",
        description: "Failed to delete course. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="rounded-full h-8 w-8 hover:bg-red-100 hover:text-red-600"
          onClick={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Delete Course</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{courseTitle}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
