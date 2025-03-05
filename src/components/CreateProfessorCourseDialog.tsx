
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function CreateCourseDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a course title",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Creating professor course with title:', title.trim());
      
      // Get the current user
      const { data: userData } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('professor_courses')
        .insert([{ 
          title: title.trim(),
          owner_id: userData.user?.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating professor course:', error);
        throw error;
      }

      console.log('Professor course created successfully:', data);
      toast({
        title: "Success",
        description: "Professor course created successfully",
      });
      
      queryClient.invalidateQueries({ queryKey: ['professor-courses'] });
      setTitle("");
      setOpen(false);
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      toast({
        title: "Error",
        description: "Failed to create professor course",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create Course</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Professor Course</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter course title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
