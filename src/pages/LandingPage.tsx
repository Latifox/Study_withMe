
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight, BookOpen, Brain, Sparkles } from "lucide-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isHovering, setIsHovering] = useState(false);

  const handleGetStarted = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-indigo-100">
      {/* Navbar */}
      <nav className="px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
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
            onClick={() => navigate("/auth")}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
          >
            Sign Up
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16 md:py-32 flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl font-bold text-center max-w-4xl mb-6">
          Transform Your Learning Experience with{" "}
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            AI-Powered Education
          </span>
        </h1>
        <p className="text-lg md:text-xl text-gray-700 text-center max-w-2xl mb-12">
          Upload your course materials and let our AI create personalized quizzes, flashcards, 
          study plans, and interactive learning experiences.
        </p>
        <Button 
          size="lg" 
          onClick={handleGetStarted}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg px-8 py-6 h-auto transition-all duration-300 transform hover:scale-105"
        >
          Get Started {isHovering ? <Sparkles className="ml-2 h-5 w-5 animate-pulse" /> : <ArrowRight className="ml-2 h-5 w-5" />}
        </Button>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
          Powerful Learning Tools
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-md hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Brain className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold mb-3">AI-Generated Quizzes</h3>
            <p className="text-gray-700">
              Test your knowledge with automatically generated quizzes based on your lecture content.
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-md hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold mb-3">Interactive Flashcards</h3>
            <p className="text-gray-700">
              Study efficiently with flashcards created from key concepts in your course materials.
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-md hover:shadow-xl transition-all">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold mb-3">Personalized Study Plans</h3>
            <p className="text-gray-700">
              Get customized study plans that help you focus on the most important concepts.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white/30 backdrop-blur-sm py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <BookOpen className="h-5 w-5 text-purple-600" />
              <span className="text-lg font-bold text-gray-800">EduSync AI</span>
            </div>
            <div className="text-sm text-gray-600">
              © {new Date().getFullYear()} EduSync AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
