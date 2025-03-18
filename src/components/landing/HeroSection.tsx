
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion, useAnimation } from "framer-motion";
import ThreeBackground from "./ThreeBackground";

const HeroSection = () => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const sectionRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 300);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (sectionRef.current) {
        const { left, top, width, height } = sectionRef.current.getBoundingClientRect();
        setMousePosition({
          x: (e.clientX - left) / width - 0.5,
          y: (e.clientY - top) / height - 0.5
        });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);
  
  // Trigger subtle animations when content is loaded
  useEffect(() => {
    if (isLoaded) {
      controls.start({
        y: [5, -5, 0],
        transition: { 
          repeat: Infinity, 
          repeatType: "reverse", 
          duration: 6,
          ease: "easeInOut" 
        }
      });
    }
  }, [isLoaded, controls]);
  
  const handleGetStarted = () => navigate("/auth");
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.3,
        duration: 0.6
      }
    }
  };
  
  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100, damping: 10 }
    }
  };
  
  const catchphraseVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      }
    }
  };
  
  const characterVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.8 
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        type: "spring",
        damping: 12,
        stiffness: 200
      }
    }
  };
  
  const catchphrase = "Your Professor. Your Platform. Your Pace.";
  const catchphraseArray = catchphrase.split("");
  
  // Calculate parallax effect based on mouse position
  const calculateParallaxTransform = (factor = 1) => {
    return {
      transform: `translate(${mousePosition.x * factor * 20}px, ${mousePosition.y * factor * 20}px)`
    };
  };
  
  return (
    <motion.div 
      ref={sectionRef}
      className="container mx-auto px-4 py-16 md:py-32 flex flex-col items-center relative overflow-hidden min-h-screen"
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      <ThreeBackground />
      
      <motion.div
        className="relative z-10 px-6 py-3 mb-8 rounded-xl backdrop-blur-lg bg-white/10 border border-purple-500/20"
        variants={catchphraseVariants}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
        style={calculateParallaxTransform(0.5)}
      >
        <div className="relative z-10 flex justify-center">
          {catchphraseArray.map((char, index) => (
            <motion.span
              key={index}
              variants={characterVariants}
              className={
                char === "." 
                  ? "text-purple-400 font-bold text-2xl md:text-3xl" 
                  : char === " " 
                    ? "text-transparent w-2 md:w-3"
                    : "text-white font-medium text-2xl md:text-3xl"
              }
            >
              {char}
            </motion.span>
          ))}
        </div>
      </motion.div>
      
      <motion.h1 
        className="text-4xl md:text-6xl font-bold text-center max-w-4xl mb-8 relative z-10 text-white"
        variants={itemVariants}
        style={calculateParallaxTransform(0.2)}
      >
        Transform Your Learning Experience with{" "}
        <span className="bg-gradient-to-r from-purple-400 to-indigo-400 bg-clip-text text-transparent">
          AI-Powered Education
        </span>
      </motion.h1>
      
      <motion.p 
        className="text-lg md:text-xl text-purple-100 text-center max-w-2xl mb-12 relative z-10"
        variants={itemVariants}
        style={calculateParallaxTransform(0.3)}
      >
        Upload your course materials and let our AI guide you on a journey of discovery, transforming
        learning into a meaningful exploration of growth and understanding!
      </motion.p>
      
      <motion.div 
        variants={itemVariants}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        animate={controls}
      >
        <Button
          size="lg"
          onClick={handleGetStarted}
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg px-8 py-6 h-auto transition-all duration-300 shadow-lg hover:shadow-purple-500/25 text-white relative overflow-hidden group"
        >
          <span className="relative z-10">Get Started</span>{" "}
          <span className="relative z-10 ml-2">
            {isHovering ? (
              <Sparkles className="h-5 w-5 animate-pulse" />
            ) : (
              <ArrowRight className="h-5 w-5" />
            )}
          </span>
          <span className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
        </Button>
      </motion.div>
    </motion.div>
  );
};

export default HeroSection;
