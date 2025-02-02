import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Upload, Mail } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-800 mb-8 text-center">Welcome to Course Manager</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-2xl mx-auto">
          <Card 
            className="hover:shadow-lg transition-shadow duration-300 cursor-pointer"
            onClick={() => navigate('/uploaded-courses')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-6 h-6" />
                My Uploaded Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Access and manage courses you've created and uploaded
              </p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-shadow duration-300 cursor-pointer"
            onClick={() => navigate('/invited-courses')}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-6 h-6" />
                Invited Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                View courses you've been invited to join
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;