
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";

interface DeleteLectureDialogProps {
  lectureId: number;
  lectureTitle: string;
  courseId: number;
}

export function DeleteLectureDialog({ lectureId, lectureTitle, courseId }: DeleteLectureDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      console.log('Deleting lecture:', lectureId);
      
      // First, delete any related content
      const { error: segmentsError } = await supabase
        .from('segments_content')
        .delete()
        .eq('lecture_id', lectureId);

      if (segmentsError) {
        console.error('Error deleting segments:', segmentsError);
        throw segmentsError;
      }

      // Delete any AI configs
      const { error: configError } = await supabase
        .from('lecture_ai_configs')
        .delete()
        .eq('lecture_id', lectureId);

      if (configError) {
        console.error('Error deleting AI configs:', configError);
        throw configError;
      }

      // Delete segments info
      const { error: segmentInfoError } = await supabase
        .from('lecture_segments')
        .delete()
        .eq('lecture_id', lectureId);

      if (segmentInfoError) {
        console.error('Error deleting segment info:', segmentInfoError);
        throw segmentInfoError;
      }

      // Finally delete the lecture
      const { error: lectureError } = await supabase
        .from('lectures')
        .delete()
        .eq('id', lectureId);

      if (lectureError) {
        console.error('Error deleting lecture:', lectureError);
        throw lectureError;
      }

      toast({
        title: "Success",
        description: "Lecture deleted successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['lectures', courseId] });
      setOpen(false);
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "Failed to delete lecture: " + error.message,
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
          variant="destructive" 
          size="icon" 
          className="bg-red-500/90 hover:bg-red-600/90"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-slate-900/95 backdrop-blur-md border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-white">Delete Lecture</DialogTitle>
        </DialogHeader>
        <div className="text-slate-300 mt-2">
          Are you sure you want to delete "{lectureTitle}"? This action cannot be undone.
        </div>
        <div className="flex justify-end gap-4 mt-4">
          <Button 
            variant="outline" 
            onClick={() => setOpen(false)}
            className="bg-transparent text-white border-slate-700 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-red-500/90 hover:bg-red-600/90 text-white"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
