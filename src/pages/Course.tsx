import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload } from "lucide-react";
import FileUpload from "@/components/FileUpload";

const Course = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [showUpload, setShowUpload] = useState(false);
  
  const lectures = [
    { id: 1, title: "Introduction", date: "2024-02-20" },
    { id: 2, title: "Basic Concepts", date: "2024-02-22" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">Course Lectures</h1>
          <Button onClick={() => setShowUpload(true)} className="gap-2">
            <Upload className="w-4 h-4" />
            Upload Lecture
          </Button>
        </div>

        <div className="grid gap-4">
          {lectures.map((lecture) => (
            <Card 
              key={lecture.id}
              className="hover:shadow-lg transition-shadow duration-300 cursor-pointer"
              onClick={() => navigate(`/lecture/${lecture.id}`)}
            >
              <CardContent className="flex justify-between items-center p-6">
                <div>
                  <h3 className="text-xl font-semibold">{lecture.title}</h3>
                  <p className="text-gray-500">{lecture.date}</p>
                </div>
                <Button variant="outline">Open Lecture</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {showUpload && (
          <FileUpload 
            courseId={courseId} 
            onClose={() => setShowUpload(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Course;