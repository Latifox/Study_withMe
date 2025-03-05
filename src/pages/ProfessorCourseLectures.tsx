import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/AuthProvider";
import { FileText, ArrowLeft, Upload } from "lucide-react";
import { useState } from "react";
import FileUpload from "@/components/FileUpload";

const ProfessorCourseLectures = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  const numericCourseId = courseId ? parseInt(courseId, 10) : undefined;

  const { data: course } = useQuery({
    queryKey: ['professor-course', numericCourseId],
    queryFn: async () => {
      if (!numericCourseId || !user) return null;
      
      const { data, error } = await supabase
        .from('professor_courses')
        .select('*')
        .eq('id', numericCourseId)
        .eq('owner_id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching course details:', error);
        toast({
          title: "Error",
          description: "Failed to load course details",
          variant: "destructive"
        });
        throw error;
      }
      
      return data;
    },
    enabled: !!numericCourseId && !!user
  });

  const { data: lectures, isLoading } = useQuery({
    queryKey: ['professor-lectures', numericCourseId],
    queryFn: async () => {
      if (!numericCourseId) return [];
      
      const { data, error } = await supabase
        .from('professor_lectures')
        .select('*')
        .eq('professor_course_id', numericCourseId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching professor lectures:', error);
        toast({
          title: "Error",
          description: "Failed to load lectures",
          variant: "destructive"
        });
        throw error;
      }
      
      return data || [];
    },
    enabled: !!numericCourseId
  });

  return (
    <div className="relative min-h-screen">
      <div className="relative p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button 
                variant="outline" 
                onClick={() => navigate('/professor-courses')} 
                className="mr-4"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Courses
              </Button>
              <div>
                <h1 className="text-4xl font-bold text-purple-700">{course?.title || 'Course Lectures'}</h1>
                <p className="text-gray-600 mt-2">Manage your lectures for this course</p>
              </div>
            </div>
            <Button 
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Lecture
            </Button>
          </div>
          
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Loading lectures...</p>
            </div>
          ) : !lectures || lectures.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">No lectures in this course yet.</p>
              <Button 
                className="mt-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white"
                onClick={() => setShowUploadDialog(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Your First Lecture
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lectures.map((lecture) => (
                <Card key={lecture.id} className="hover:shadow-lg transition-all duration-300">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="mr-2 h-5 w-5 text-purple-600" />
                      {lecture.title}
                    </CardTitle>
                    <CardDescription>
                      Created on {new Date(lecture.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full"
                      onClick={() => {
                        toast({
                          title: "Coming Soon",
                          description: "Lecture details view is under development",
                        });
                      }}
                    >
                      View Lecture
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {showUploadDialog && (
        <FileUpload 
          courseId={courseId} 
          onClose={() => setShowUploadDialog(false)} 
        />
      )}
    </div>
  );
};

export default ProfessorCourseLectures;
