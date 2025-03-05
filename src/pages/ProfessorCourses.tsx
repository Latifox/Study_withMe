import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CreateCourseDialog } from "@/components/CreateProfessorCourseDialog";
import { DeleteCourseDialog } from "@/components/DeleteProfessorCourseDialog";
import { Share } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/AuthProvider";

const ProfessorCourses = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const { data: courses, isLoading } = useQuery({
    queryKey: ['professor-courses', user?.id],
    queryFn: async () => {
      if (!user) {
        return [];
      }
      
      console.log('Fetching professor courses for user:', user.id);
      const { data, error } = await supabase
        .from('professor_courses')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching professor courses:', error);
        toast({
          title: "Error",
          description: "Failed to load professor courses. Please try again.",
          variant: "destructive"
        });
        throw error;
      }
      
      console.log('Fetched professor courses:', data);
      return data || [];
    },
    enabled: !!user
  });

  return (
    <div className="relative min-h-screen">
      <div className="relative p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-purple-700">My Professor Courses</h1>
              <p className="text-gray-600 mt-2">Manage your professor courses</p>
            </div>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/teacher-dashboard')}
              >
                Back to Dashboard
              </Button>
              <CreateCourseDialog />
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading courses...</p>
            </div>
          ) : !courses || courses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No professor courses uploaded yet. Create your first course!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card key={course.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]">
                  <CardHeader className="relative pb-2">
                    <div className="absolute top-4 right-4">
                      <DeleteCourseDialog courseId={course.id} courseTitle={course.title} />
                    </div>
                    <div className="text-center w-full pr-8">
                      <CardTitle className="text-xl mb-1">{course.title}</CardTitle>
                      <CardDescription>
                        Created on {new Date(course.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-4">
                    <Button 
                      className="w-full"
                      onClick={() => navigate(`/professor-courses/${course.id}`)}
                    >
                      View Lectures
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        console.log('Share course:', course.id);
                        toast({
                          title: "Share feature",
                          description: "Share functionality coming soon!",
                        });
                      }}
                    >
                      <Share className="mr-2 h-4 w-4" />
                      Share Course
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessorCourses;
