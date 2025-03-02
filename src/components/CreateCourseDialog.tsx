
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

interface CreateCourseDialogProps {
  isProfessorMode?: boolean;
}

export function CreateCourseDialog({ isProfessorMode = false }: CreateCourseDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a course title",
        variant: "destructive"
      });
      return;
    }
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create a course",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Choose the right table based on the mode
      const tableName = isProfessorMode ? 'professor_courses' : 'courses';
      const queryKey = isProfessorMode ? 'professor-courses' : 'uploaded-courses';
      
      console.log(`Creating ${isProfessorMode ? 'professor' : 'student'} course:`, title);
      
      const { data, error } = await supabase
        .from(tableName)
        .insert([{ 
          title: title.trim(),
          owner_id: user.id
        }])
        .select();
      
      if (error) throw error;
      
      console.log('Course created:', data);
      
      toast({
        title: "Success",
        description: "Course created successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      setOpen(false);
      setTitle("");
    } catch (error: any) {
      console.error('Create error:', error);
      toast({
        title: "Error",
        description: "Failed to create course: " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PlusCircle className="w-4 h-4" />
          Create Course
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a new course</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="title" className="text-right">
              Title
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="col-span-3"
              placeholder="Enter course title"
            />
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleCreate}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Course"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
