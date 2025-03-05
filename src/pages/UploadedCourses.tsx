
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CreateCourseDialog } from "@/components/CreateCourseDialog";
import { DeleteCourseDialog } from "@/components/DeleteCourseDialog";
import { supabase } from "@/integrations/supabase/client";

const UploadedCourses = () => {
  const navigate = useNavigate();
  
  const { data: courses, isLoading } = useQuery({
    queryKey: ['uploaded-courses'],
    queryFn: async () => {
      console.log('Fetching courses from Supabase...');
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching courses:', error);
        throw error;
      }
      
      console.log('Fetched courses:', data);
      return data || [];
    }
  });

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background with gradient and animated blobs */}
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-500 to-indigo-600">
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        
        <div className="absolute top-0 left-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-violet-900/50 via-transparent to-transparent"></div>
      </div>

      {/* Content */}
      <div className="relative p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold text-white">My Uploaded Courses</h1>
              <p className="text-white/80 mt-2">Manage your uploaded courses</p>
            </div>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                onClick={() => navigate('/dashboard')}
                className="bg-white/10 backdrop-blur-sm hover:bg-white/20 border-white/20 text-white"
              >
                Back to Home
              </Button>
              <CreateCourseDialog />
            </div>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-white/80">Loading courses...</p>
            </div>
          ) : !courses || courses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-white/80">No courses uploaded yet. Create your first course!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Card key={course.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader className="relative pb-2">
                    <div className="absolute top-4 right-4">
                      <DeleteCourseDialog courseId={course.id} courseTitle={course.title} />
                    </div>
                    <div className="text-center w-full pr-8">
                      <CardTitle className="text-xl mb-1 text-white">{course.title}</CardTitle>
                      <CardDescription className="text-white/70">
                        Created on {new Date(course.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-4">
                    <Button 
                      className="w-full bg-white/20 hover:bg-white/30 text-white"
                      onClick={() => navigate(`/course/${course.id}`)}
                    >
                      View Lectures
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

export default UploadedCourses;
