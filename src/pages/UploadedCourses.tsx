import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CreateCourseDialog } from "@/components/CreateCourseDialog";
import { DeleteCourseDialog } from "@/components/DeleteCourseDialog";
import { Share } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">My Uploaded Courses</h1>
            <p className="text-gray-600 mt-2">Manage your uploaded courses</p>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => navigate('/')}>
              Back to Home
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
            <p className="text-gray-600">No courses uploaded yet. Create your first course!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow duration-300">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-xl">{course.title}</CardTitle>
                      <CardDescription>
                        Created on {new Date(course.created_at).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <DeleteCourseDialog courseId={course.id} courseTitle={course.title} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
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
                      // Share functionality will be added later
                      console.log('Share course:', course.id);
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
  );
};

export default UploadedCourses;