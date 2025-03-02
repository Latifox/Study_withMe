
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Bubbles from "./Bubbles";

const HeroSection = () => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  
  const handleGetStarted = () => navigate("/auth");
  
  return (
    <div className="container mx-auto px-4 py-16 md:py-32 flex flex-col items-center relative">
      {/* Bubble effects */}
      <Bubbles position="left" sectionHeight="100%" tint="purple" />
      <Bubbles position="right" sectionHeight="100%" tint="indigo" />
      
      <h1 className="text-4xl md:text-6xl font-bold text-center max-w-4xl mb-6">
        Transform Your Learning Experience with{" "}
        <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          AI-Powered Education
        </span>
      </h1>
      <p className="text-lg md:text-xl text-gray-700 text-center max-w-2xl mb-12">
        Upload your course materials and let our AI guide you on a journey of discovery, transforming
        learning into a meaningful exploration of growth and understanding!
      </p>
      <Button
        size="lg"
        onClick={handleGetStarted}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg px-8 py-6 h-auto transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
      >
        Get Started{" "}
        {isHovering ? (
          <Sparkles className="ml-2 h-5 w-5 animate-pulse" />
        ) : (
          <ArrowRight className="ml-2 h-5 w-5" />
        )}
      </Button>
    </div>
  );
};

export default HeroSection;
