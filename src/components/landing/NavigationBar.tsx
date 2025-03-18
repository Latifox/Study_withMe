
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen } from "lucide-react";

const NavigationBar = () => {
  const navigate = useNavigate();

  return (
    <nav className="px-8 py-4 flex justify-between items-center backdrop-blur-sm bg-white/30">
      <div className="flex items-center justify-center gap-2">
        <BookOpen className="h-6 w-6 text-purple-600" />
        <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          EduSync AI
        </span>
      </div>
      <div>
        <Button
          variant="outline"
          onClick={() => navigate("/auth")}
          className="border-purple-200 hover:bg-purple-100 hover:text-purple-700 mr-2"
        >
          Login
        </Button>
        <Button
          onClick={() => navigate("/auth?tab=register")}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          Sign Up
        </Button>
      </div>
    </nav>
  );
};

export default NavigationBar;
