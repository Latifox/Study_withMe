
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, ArrowLeft, Settings } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LectureActionsDialog from "@/components/LectureActionsDialog";
import { DeleteLectureDialog } from "@/components/DeleteLectureDialog";
import LectureAIConfigDialog from "@/components/LectureAIConfigDialog";

// Define interface for course data including course_code
interface CourseData {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
  course_code?: string;
  isProfessor?: boolean;
}

const Course = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [selectedLectureId, setSelectedLectureId] = useState<number | null>(null);
  const [showAIConfig, setShowAIConfig] = useState<number | null>(null);
  
  const parsedCourseId = courseId ? parseInt(courseId) : null;
  
  if (!parsedCourseId || isNaN(parsedCourseId)) {
    navigate('/');
    return null;
  }
  
  // Attempt to fetch course from both tables
  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ['course-combined', parsedCourseId],
    queryFn: async () => {
      // Try regular courses first
      const { data: regularCourse, error: regularError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', parsedCourseId)
        .single();
      
      if (!regularError && regularCourse) {
        console.log('Found in regular courses:', regularCourse);
        return { ...regularCourse, isProfessor: false } as CourseData;
      }
      
      // Try professor courses next
      const { data: professorCourse, error: professorError } = await supabase
        .from('professor_courses')
        .select('*')
        .eq('id', parsedCourseId)
        .single();
      
      if (!professorError && professorCourse) {
        console.log('Found in professor courses:', professorCourse);
        return { ...professorCourse, isProfessor: true } as CourseData;
      }
      
      if (regularError && professorError) {
        throw new Error('Course not found in either table');
      }
      
      return null;
    }
  });

  const { data: lectures, isLoading } = useQuery({
    queryKey: ['lectures', parsedCourseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('course_id', parsedCourseId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    refetchInterval: 1000,
  });

  return (
    <div className="relative min-h-screen overflow-hidden">
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

      <div className="relative p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="outline" 
              onClick={() => navigate(course?.isProfessor ? '/professor-courses' : '/uploaded-courses')}
              className="gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-white text-white"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Courses
            </Button>
            <div>
              <h1 className="text-4xl font-bold text-white">
                {courseLoading ? 'Loading...' : course?.title || 'Course not found'}
              </h1>
              {course?.course_code && (
                <div className="bg-white/20 text-white text-sm font-medium py-1 px-2 rounded mt-2 inline-block">
                  Course Code: {course.course_code}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end mb-6">
            <Button 
              onClick={() => setShowUpload(true)} 
              className="gap-2 bg-white/20 hover:bg-white/30 text-white border-white/10"
            >
              <Upload className="w-4 h-4" />
              Upload Lecture
            </Button>
          </div>

          <div className="grid gap-4">
            {isLoading ? (
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="p-6 text-white">
                  Loading lectures...
                </CardContent>
              </Card>
            ) : lectures?.length === 0 ? (
              <Card className="bg-white/10 backdrop-blur-md border-white/20">
                <CardContent className="p-6 text-center text-white/80">
                  No lectures yet. Upload your first lecture!
                </CardContent>
              </Card>
            ) : (
              lectures?.map((lecture) => (
                <Card 
                  key={lecture.id}
                  className="group hover:shadow-2xl transition-all duration-300 cursor-pointer bg-white/10 backdrop-blur-md border-white/20 hover:scale-[1.02] hover:bg-white/20"
                  onClick={() => setSelectedLectureId(lecture.id)}
                >
                  <CardContent className="flex justify-between items-center p-6">
                    <div>
                      <h3 className="text-xl font-semibold text-white">{lecture.title}</h3>
                      <p className="text-white/70">
                        {new Date(lecture.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <DeleteLectureDialog 
                        lectureId={lecture.id} 
                        lectureTitle={lecture.title} 
                        courseId={parsedCourseId}
                      />
                      <Button 
                        variant="outline"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAIConfig(lecture.id);
                        }}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configure AI
                      </Button>
                      <Button 
                        variant="outline"
                        className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedLectureId(lecture.id);
                        }}
                      >
                        Take Action
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {showUpload && (
            <FileUpload 
              courseId={parsedCourseId.toString()} 
              onClose={() => setShowUpload(false)}
            />
          )}

          <LectureActionsDialog
            isOpen={!!selectedLectureId}
            onClose={() => setSelectedLectureId(null)}
            lectureId={selectedLectureId!}
          />

          <LectureAIConfigDialog
            isOpen={!!showAIConfig}
            onClose={() => setShowAIConfig(null)}
            lectureId={showAIConfig!}
          />
        </div>
      </div>
    </div>
  );
};

export default Course;
