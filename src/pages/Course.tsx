import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Upload, ArrowLeft } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import LectureActionsDialog from "@/components/LectureActionsDialog";
import { DeleteLectureDialog } from "@/components/DeleteLectureDialog";

const Course = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  const [selectedLectureId, setSelectedLectureId] = useState<number | null>(null);
  
  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', parseInt(courseId!))
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: lectures, isLoading } = useQuery({
    queryKey: ['lectures', courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lectures')
        .select('*')
        .eq('course_id', parseInt(courseId!))
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Courses
          </Button>
          <h1 className="text-4xl font-bold text-gray-800">
            {course?.title || 'Loading...'}
          </h1>
        </div>

        <div className="flex justify-end mb-6">
          <Button onClick={() => setShowUpload(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Lecture
          </Button>
        </div>

        <div className="grid gap-4">
          {isLoading ? (
            <Card>
              <CardContent className="p-6">
                Loading lectures...
              </CardContent>
            </Card>
          ) : lectures?.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No lectures yet. Upload your first lecture!
              </CardContent>
            </Card>
          ) : (
            lectures?.map((lecture) => (
              <Card 
                key={lecture.id}
                className="hover:shadow-lg transition-shadow duration-300 cursor-pointer"
                onClick={() => setSelectedLectureId(lecture.id)}
              >
                <CardContent className="flex justify-between items-center p-6">
                  <div>
                    <h3 className="text-xl font-semibold">{lecture.title}</h3>
                    <p className="text-gray-500">
                      {new Date(lecture.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <DeleteLectureDialog 
                      lectureId={lecture.id} 
                      lectureTitle={lecture.title} 
                      courseId={parseInt(courseId!)}
                    />
                    <Button 
                      variant="outline"
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
            courseId={courseId} 
            onClose={() => setShowUpload(false)}
          />
        )}

        <LectureActionsDialog
          isOpen={!!selectedLectureId}
          onClose={() => setSelectedLectureId(null)}
          lectureId={selectedLectureId!}
        />
      </div>
    </div>
  );
};

export default Course;