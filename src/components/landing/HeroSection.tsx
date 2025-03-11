
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import Bubbles from "./Bubbles";
import { motion } from "framer-motion";

const HeroSection = () => {
  const navigate = useNavigate();
  const [isHovering, setIsHovering] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  useEffect(() => {
    // Set isLoaded to true after a short delay to trigger animations
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  const handleGetStarted = () => navigate("/auth");
  
  // Animation variants
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
  
  const radiationVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        duration: 1.2, 
        delay: 0.6,
        ease: "easeOut"
      }
    }
  };
  
  // Catchphrase animation variants - character by character reveal
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
  
  // Catchphrase text - split into array for character animation
  const catchphrase = "Your Professor. Your Platform. Your Pace.";
  const catchphraseArray = catchphrase.split("");
  
  return (
    <motion.div 
      className="container mx-auto px-4 py-16 md:py-32 flex flex-col items-center relative"
      initial="hidden"
      animate={isLoaded ? "visible" : "hidden"}
      variants={containerVariants}
    >
      {/* Energy radiation background effect */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] max-w-[1200px] pointer-events-none z-0 opacity-60"
        style={{
          background: 'radial-gradient(circle at center, rgba(147, 51, 234, 0.15) 0%, rgba(79, 70, 229, 0.1) 35%, rgba(0, 0, 0, 0) 70%)',
          filter: 'blur(40px)',
        }}
        variants={radiationVariants}
      />
      
      {/* Bubble effects with bolder colors and constrained height - 20 bubbles for hero section */}
      <Bubbles position="left" tint="purple" opacity={0.5} sectionHeight="80vh" bubbleCount={20} />
      <Bubbles position="right" tint="indigo" opacity={0.5} sectionHeight="80vh" bubbleCount={20} />
      
      {/* Radiation effect from title */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-4xl h-32 md:h-40 blur-[80px] rounded-full bg-gradient-to-r from-purple-600/30 to-indigo-600/30 z-0"
        variants={radiationVariants}
      />
      
      {/* Animated catchphrase - appears before the main title */}
      <motion.div
        className="text-xl md:text-2xl font-medium mb-4 text-center relative z-10"
        variants={catchphraseVariants}
        initial="hidden"
        animate={isLoaded ? "visible" : "hidden"}
      >
        {catchphraseArray.map((char, index) => (
          <motion.span
            key={index}
            variants={characterVariants}
            className={char === "." ? "text-purple-600 font-bold" : ""}
          >
            {char}
          </motion.span>
        ))}
      </motion.div>
      
      <motion.h1 
        className="text-4xl md:text-6xl font-bold text-center max-w-4xl mb-6 relative z-10"
        variants={itemVariants}
      >
        Transform Your Learning Experience with{" "}
        <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent relative">
          {/* Small inner glow for the colored text */}
          <span className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-indigo-600/20 blur-md -z-10 rounded-lg"></span>
          AI-Powered Education
        </span>
      </motion.h1>
      
      <motion.p 
        className="text-lg md:text-xl text-gray-700 text-center max-w-2xl mb-12 relative z-10"
        variants={itemVariants}
      >
        Upload your course materials and let our AI guide you on a journey of discovery, transforming
        learning into a meaningful exploration of growth and understanding!
      </motion.p>
      
      {/* Connection radiation effect from title to button */}
      <motion.div 
        className="absolute top-[60%] left-1/2 -translate-x-1/2 w-40 h-40 blur-[60px] rounded-full bg-gradient-to-r from-purple-600/20 to-indigo-600/20 z-0"
        variants={radiationVariants}
      />
      
      <motion.div variants={itemVariants}>
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
      </motion.div>
    </motion.div>
  );
};

export default HeroSection;
