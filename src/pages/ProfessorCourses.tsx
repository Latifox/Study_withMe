
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { CreateCourseDialog } from "@/components/CreateCourseDialog";
import { DeleteProfessorCourseDialog } from "@/components/DeleteProfessorCourseDialog";
import { Share, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ui/use-toast";

const ProfessorCourses = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  
  // Redirect if not authenticated or not a teacher
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    
    // Check if the user has the teacher role
    if (!loading && user) {
      const checkUserRole = async () => {
        const { data } = await supabase.auth.getUser();
        const accountType = data.user?.user_metadata?.account_type;
        
        if (accountType !== 'teacher') {
          navigate('/dashboard');
        }
      };
      
      checkUserRole();
    }
  }, [user, loading, navigate]);
  
  const { data: courses, isLoading } = useQuery({
    queryKey: ['professor-courses'],
    queryFn: async () => {
      console.log('Fetching professor courses from Supabase...');
      const { data, error } = await supabase
        .from('professor_courses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching professor courses:', error);
        throw error;
      }
      
      console.log('Fetched professor courses:', data);
      return data || [];
    }
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 via-purple-500 to-violet-600">
      Loading...
    </div>;
  }

  return (
    <div className="relative min-h-screen">
      {/* Content */}
      <div className="relative p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-purple-700">Professor Courses</h1>
              <p className="text-gray-600 mt-2">Manage your courses as a professor</p>
            </div>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/teacher-dashboard')}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Button>
              <CreateCourseDialog isProfessorMode={true} />
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading courses...</p>
            </div>
          ) : !courses || courses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No courses created yet. Create your first course!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card key={course.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]">
                  <CardHeader className="relative pb-2">
                    <div className="absolute top-4 right-4">
                      <DeleteProfessorCourseDialog courseId={course.id} courseTitle={course.title} />
                    </div>
                    <div className="text-center w-full pr-8">
                      <CardTitle className="text-xl mb-1">{course.title}</CardTitle>
                      <CardDescription className="flex flex-col gap-1">
                        <span>Created on {new Date(course.created_at).toLocaleDateString()}</span>
                        {course.course_code && (
                          <span className="bg-purple-100 text-purple-800 text-xs font-medium py-0.5 px-2 rounded inline-block mx-auto">
                            Course Code: {course.course_code}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-4">
                    <Button 
                      className="w-full"
                      onClick={() => navigate(`/course/${course.id}`)}
                    >
                      View Lectures
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        console.log('Share course:', course.id);
                        toast({
                          title: "Coming Soon",
                          description: "Course sharing will be available in a future update",
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
