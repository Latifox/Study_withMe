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
  const {
    courseId
  } = useParams();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    user
  } = useAuth();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const numericCourseId = courseId ? parseInt(courseId, 10) : undefined;
  const {
    data: course
  } = useQuery({
    queryKey: ['professor-course', numericCourseId],
    queryFn: async () => {
      if (!numericCourseId || !user) return null;
      const {
        data,
        error
      } = await supabase.from('professor_courses').select('*').eq('id', numericCourseId).eq('owner_id', user.id).single();
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
  const {
    data: lectures,
    isLoading
  } = useQuery({
    queryKey: ['professor-lectures', numericCourseId],
    queryFn: async () => {
      if (!numericCourseId) return [];
      const {
        data,
        error
      } = await supabase.from('professor_lectures').select('*').eq('professor_course_id', numericCourseId).order('created_at', {
        ascending: false
      });
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

  return <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-500 to-violet-600">
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
        
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/50 via-transparent to-transparent"></div>
      </div>

      <div className="relative p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Button variant="outline" onClick={() => navigate('/professor-courses')} className="mr-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 border-white/20 text-white">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Courses
              </Button>
              <div>
                <h1 className="text-4xl font-bold text-white">{course?.title || 'Course Lectures'}</h1>
                <p className="text-white/80 mt-2">Manage your lectures for this course</p>
              </div>
            </div>
            <Button className="bg-white/20 hover:bg-white/30 text-white" onClick={() => setShowUploadDialog(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Lecture
            </Button>
          </div>
          
          {isLoading ? <div className="text-center py-8">
              <p className="text-white/80">Loading lectures...</p>
            </div> : !lectures || lectures.length === 0 ? <div className="text-center py-8">
              <p className="text-white/80">No lectures in this course yet.</p>
              
            </div> : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lectures.map(lecture => <Card key={lecture.id} className="group hover:shadow-xl transition-all duration-300 cursor-pointer hover:scale-[1.02] bg-white/10 backdrop-blur-md border-white/20">
                  <CardHeader>
                    <CardTitle className="flex items-center text-white">
                      <FileText className="mr-2 h-5 w-5 text-white" />
                      {lecture.title}
                    </CardTitle>
                    <CardDescription className="text-white/70">
                      Created on {new Date(lecture.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full bg-white/20 hover:bg-white/30 text-white" onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "Lecture details view is under development"
                });
              }}>
                      View Lecture
                    </Button>
                  </CardContent>
                </Card>)}
            </div>}
        </div>
      </div>
      
      {showUploadDialog && <FileUpload courseId={courseId} onClose={() => setShowUploadDialog(false)} mode="professor" />}
    </div>;
};

export default ProfessorCourseLectures;
