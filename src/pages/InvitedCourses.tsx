
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { useEffect } from "react";
import { EnterInviteCodeDialog } from "@/components/EnterInviteCodeDialog";

// Define enrolled course interface
interface EnrolledCourse {
  id: number;
  course: {
    id: number;
    title: string;
    created_at: string;
    course_code: string | null;
  };
}

const InvitedCourses = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);
  
  // Fetch enrolled courses
  const { data: enrolledCourses, isLoading } = useQuery({
    queryKey: ['enrolled-courses'],
    queryFn: async () => {
      console.log('Fetching enrolled courses from Supabase...');
      
      const { data, error } = await supabase
        .from('student_enrolled_courses')
        .select(`
          id,
          course: course_id (
            id,
            title,
            created_at,
            course_code
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching enrolled courses:', error);
        throw error;
      }
      
      console.log('Fetched enrolled courses:', data);
      return data || [] as EnrolledCourse[];
    },
    enabled: !!user
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      Loading...
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Invited Courses</h1>
            <p className="text-gray-600 mt-2">Join courses you've been invited to</p>
          </div>
          <div className="flex gap-4 items-center">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Button>
            <EnterInviteCodeDialog />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading courses...</p>
          </div>
        ) : !enrolledCourses || enrolledCourses.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-12 space-y-6">
            <p className="text-gray-600 text-center">You haven't joined any courses yet.</p>
            <EnterInviteCodeDialog />
          </div>
        ) : (
          <div>
            {/* Remove the dialog from here since it's now in the header */}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {enrolledCourses.map((enrollment) => (
                <Card key={enrollment.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02]">
                  <CardHeader className="pb-2">
                    <div className="text-center w-full">
                      <CardTitle className="text-xl mb-1">{enrollment.course.title}</CardTitle>
                      <CardDescription className="flex flex-col gap-1">
                        <span>Joined on {new Date(enrollment.course.created_at).toLocaleDateString()}</span>
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-4">
                    <Button 
                      className="w-full"
                      onClick={() => navigate(`/course/${enrollment.course.id}`)}
                    >
                      View Lectures
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitedCourses;
