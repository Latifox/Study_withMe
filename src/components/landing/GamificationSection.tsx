
import { BookOpen, Star, Flame } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

const GamificationSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          // Once we've seen it, no need to keep observing
          if (sectionRef.current) {
            observer.unobserve(sectionRef.current);
          }
        }
      },
      { threshold: 0.2 } // 20% of the section is visible
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  const gamificationElements = [
    {
      icon: <Star className="h-8 w-8 text-white" />,
      title: "Experience Points (XP)",
      description: "Earn XP as you complete learning activities. Track your progress and level up your knowledge.",
      gradient: "bg-gradient-to-r from-yellow-500 to-amber-600",
    },
    {
      icon: <BookOpen className="h-8 w-8 text-white" />,
      title: "Lecture Tracking",
      description: "Monitor your completed lectures and visualize your educational journey with comprehensive analytics.",
      gradient: "bg-gradient-to-r from-teal-500 to-teal-600",
    },
    {
      icon: <Flame className="h-8 w-8 text-white" />,
      title: "Learning Streaks",
      description: "Build and maintain daily learning streaks. Consistency is the key to mastery and retention.",
      gradient: "bg-gradient-to-r from-red-500 to-orange-500",
    }
  ];

  // Animation variants for the container and items
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { 
      y: 50, 
      opacity: 0 
    },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };
  
  return (
    <div ref={sectionRef} className="container mx-auto px-4 py-16 md:py-24 relative z-10">
      <motion.div 
        className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl mb-12 relative z-10 border-2 rounded-xl"
        style={{ 
          borderImage: 'linear-gradient(to bottom, #FFC107, #FF9800) 1',
          borderStyle: 'solid'
        }}
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        variants={itemVariants}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Learn with{" "}
          <span className="bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">
            Purpose
          </span>
        </h2>
        <p className="text-lg text-gray-700 text-center">
          Our gamified learning approach keeps you motivated and tracks your progress through your
          educational journey
        </p>
      </motion.div>

      <motion.div 
        className="grid grid-cols-1 sm:grid-cols-3 gap-8 relative z-20"
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        variants={containerVariants}
      >
        {gamificationElements.map((element, index) => (
          <motion.div key={index} className="relative" variants={itemVariants}>
            <div className={`${element.gradient} p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 max-w-xs mx-auto w-full relative z-10`}>
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white/20 p-3 rounded-full flex items-center justify-center shadow-lg">
                  {element.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">{element.title}</h3>
              <p className="text-white text-center text-sm">{element.description}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default GamificationSection;
