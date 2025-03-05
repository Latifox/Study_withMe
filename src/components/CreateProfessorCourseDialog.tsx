
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Function to generate a random course code
const generateCourseCode = () => {
  // Generate a random alphanumeric code (3 letters followed by 3 numbers)
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lettersCode = Array.from({ length: 3 }, () => letters.charAt(Math.floor(Math.random() * letters.length))).join('');
  const numbersCode = Array.from({ length: 3 }, () => Math.floor(Math.random() * 10)).join('');
  return `${lettersCode}-${numbersCode}`;
};

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
      
      // Generate a unique course code
      let isUnique = false;
      let courseCode = '';
      
      while (!isUnique) {
        courseCode = generateCourseCode();
        
        // Check if the code already exists
        const { data: existingCourses } = await supabase
          .from('professor_courses')
          .select('id')
          .eq('course_code', courseCode)
          .limit(1);
          
        isUnique = !existingCourses || existingCourses.length === 0;
      }
      
      console.log('Generated unique course code:', courseCode);
      
      const { data, error } = await supabase
        .from('professor_courses')
        .insert([{ 
          title: title.trim(),
          owner_id: userData.user?.id,
          course_code: courseCode
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
