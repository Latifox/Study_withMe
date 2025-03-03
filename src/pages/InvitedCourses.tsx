
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Key, ArrowLeft } from "lucide-react";

const InvitedCourses = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">Invited Courses</h1>
            <p className="text-gray-600 mt-2">Join courses you've been invited to</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => navigate('/dashboard')}
            className="gap-2 hover:bg-white/20 border-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Button>
        </div>

        <div className="flex flex-col items-center justify-center mt-12">
          <Button 
            size="lg"
            className="flex items-center gap-2 text-lg"
            onClick={() => {
              // Will be implemented later
              console.log("Enter invite code clicked");
            }}
          >
            <Key className="w-5 h-5" />
            Enter Invite Code
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InvitedCourses;
