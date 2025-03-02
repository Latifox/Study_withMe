
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
      {/* Energy radiation background effect */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] max-w-[1200px] pointer-events-none z-0 opacity-60"
        style={{
          background: 'radial-gradient(circle at center, rgba(147, 51, 234, 0.15) 0%, rgba(79, 70, 229, 0.1) 35%, rgba(0, 0, 0, 0) 70%)',
          filter: 'blur(40px)',
        }}
      />
      
      {/* Bubble effects with bolder colors and constrained height */}
      <Bubbles position="left" tint="purple" opacity={0.5} sectionHeight="80vh" />
      <Bubbles position="right" tint="indigo" opacity={0.5} sectionHeight="80vh" />
      
      {/* Radiation effect from title */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-4xl h-32 md:h-40 blur-[80px] rounded-full bg-gradient-to-r from-purple-600/30 to-indigo-600/30 z-0" />
      
      <h1 className="text-4xl md:text-6xl font-bold text-center max-w-4xl mb-6 relative z-10">
        Transform Your Learning Experience with{" "}
        <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent relative">
          {/* Small inner glow for the colored text */}
          <span className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 blur-md -z-10 rounded-lg"></span>
          AI-Powered Education
        </span>
      </h1>
      <p className="text-lg md:text-xl text-gray-700 text-center max-w-2xl mb-12 relative z-10">
        Upload your course materials and let our AI guide you on a journey of discovery, transforming
        learning into a meaningful exploration of growth and understanding!
      </p>
      
      {/* Connection radiation effect from title to button */}
      <div 
        className="absolute top-[60%] left-1/2 -translate-x-1/2 w-40 h-40 blur-[60px] rounded-full bg-gradient-to-r from-purple-600/20 to-indigo-600/20 z-0"
      />
      
      <Button
        size="lg"
        onClick={handleGetStarted}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg px-8 py-6 h-auto transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl relative z-10"
      >
        {/* Button glow effect */}
        <span className="absolute inset-0 -z-10 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
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
