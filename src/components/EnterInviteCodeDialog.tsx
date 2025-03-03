
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export function EnterInviteCodeDialog() {
  const [open, setOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleEnrollInCourse = async () => {
    if (!inviteCode.trim()) {
      toast({
        title: "Missing invite code",
        description: "Please enter a valid invite code",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);

      // First, find the course with the given invite code
      const { data: courseData, error: courseError } = await supabase
        .from("professor_courses")
        .select("id, title")
        .eq("course_code", inviteCode.trim())
        .single();

      if (courseError || !courseData) {
        toast({
          title: "Invalid invite code",
          description: "No course found with this invite code. Please check and try again.",
          variant: "destructive",
        });
        return;
      }

      // Now enroll the user in the course
      const { error: enrollError } = await supabase
        .from("student_enrolled_courses")
        .insert({
          course_id: courseData.id,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        });

      if (enrollError) {
        // Check if it's a unique violation (user already enrolled)
        if (enrollError.code === "23505") {
          toast({
            title: "Already enrolled",
            description: "You are already enrolled in this course.",
            variant: "default",
          });
          setOpen(false);
          setInviteCode("");
          queryClient.invalidateQueries({ queryKey: ["enrolled-courses"] });
          return;
        }

        toast({
          title: "Enrollment failed",
          description: enrollError.message,
          variant: "destructive",
        });
        return;
      }

      // Success
      toast({
        title: "Successfully enrolled!",
        description: `You've been enrolled in the course: ${courseData.title}`,
      });

      // Reset form and close dialog
      setInviteCode("");
      setOpen(false);

      // Refresh the enrolled courses list
      queryClient.invalidateQueries({ queryKey: ["enrolled-courses"] });
    } catch (error: any) {
      toast({
        title: "Error occurred",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="flex items-center gap-2 text-lg">
          <Key className="w-5 h-5" />
          Enter Invite Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Course Invite Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Label htmlFor="inviteCode" className="text-left">
            Course Invite Code
          </Label>
          <Input
            id="inviteCode"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            placeholder="Enter the invite code"
            className="col-span-3"
          />
          <p className="text-sm text-muted-foreground">
            Enter the course invite code provided by your professor to access the course materials.
          </p>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleEnrollInCourse} disabled={isLoading}>
            {isLoading ? "Enrolling..." : "Enroll in Course"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
