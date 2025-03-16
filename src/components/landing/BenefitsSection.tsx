import { useEffect, useRef, useState } from "react";
import { GraduationCap, School } from "lucide-react";
import { motion, Variants } from "framer-motion";
import EducationalFlowTimeline from "./EducationalFlowTimeline";

const BenefitsSection = () => {
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

  const studentBenefits = [
    "Personalized study plans tailored to your learning style and pace",
    "Interactive content that makes complex concepts easier to understand",
    "AI-generated summaries and highlights to save study time",
    "Intelligent flashcards that adapt to your knowledge gaps",
    "24/7 AI tutor available to answer questions about course material",
    "Self-assessment quizzes that identify areas needing improvement",
    "Integrated resources to expand your knowledge beyond course material",
  ];

  const teacherBenefits = [
    "Automated content transformation from your lecture materials",
    "Detailed analytics on student engagement and performance",
    "Reduced workload with AI-generated quizzes and assessments",
    "Ability to customize learning paths for individual students or groups",
    "Insights into common student misunderstandings and knowledge gaps",
    "More time for meaningful student interactions and personalized support",
    "Easy integration with your existing course materials and teaching style",
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        when: "beforeChildren",
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const titleVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  const cardVariants: Variants = {
    hidden: { 
      opacity: 0,
      y: 50,
      scale: 0.9,
      rotateY: 15
    },
    visible: index => ({
      opacity: 1,
      y: 0,
      scale: 1,
      rotateY: 0,
      transition: {
        type: "spring",
        stiffness: 80,
        damping: 12,
        delay: 0.2 + (index * 0.1)
      }
    })
  };

  const listItemVariants: Variants = {
    hidden: { opacity: 0, x: -20 },
    visible: index => ({
      opacity: 1, 
      x: 0,
      transition: { 
        duration: 0.4,
        delay: 0.2 + (index * 0.08)
      }
    })
  };

  const floatingAnimation = {
    y: ["0px", "-10px", "0px"],
    transition: {
      duration: 2.5,
      repeat: Infinity,
      repeatType: "reverse" as const,
      ease: "easeInOut"
    }
  };

  return (
    <div ref={sectionRef} className="container mx-auto px-4 py-16 md:py-24 relative overflow-hidden">
      <motion.div 
        className="absolute inset-0 pointer-events-none"
        initial={{ opacity: 0 }}
        animate={isVisible ? { opacity: 0.4 } : { opacity: 0 }}
        transition={{ duration: 1, delay: 0.5 }}
      >
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-400/10 blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-indigo-400/10 blur-[100px]" />
      </motion.div>
      
      <motion.div 
        className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl mb-12 relative z-10 border-2 rounded-xl"
        style={{ 
          borderImage: 'linear-gradient(to bottom, #60a5fa, #2563eb) 1',
          borderStyle: 'solid'
        }}
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        variants={titleVariants}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Who Benefits from{" "}
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            EduSync AI
          </span>
        </h2>
        <p className="text-lg text-gray-700 text-center">
          Our platform serves both students and educators with specialized tools and features
        </p>
      </motion.div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 relative z-20"
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        variants={containerVariants}
      >
        <motion.div 
          className="flex justify-center perspective-1000 relative"
          custom={0}
          variants={cardVariants}
        >
          <motion.div 
            className="bg-gradient-to-b from-blue-400 to-blue-600 p-8 rounded-xl shadow-lg border border-blue-200 transform transition-all hover:scale-105 max-w-sm w-full relative z-10 transform-style-3d"
            whileHover={{
              boxShadow: "0 25px 50px -12px rgba(37, 99, 235, 0.4)",
              transform: "translateY(-10px)"
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center mb-6">
              <motion.div 
                className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4"
                animate={floatingAnimation}
              >
                <GraduationCap className="h-6 w-6 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white">
                For Students
              </h3>
            </div>
            <motion.ul className="space-y-3">
              {studentBenefits.map((benefit, index) => (
                <motion.li 
                  key={index} 
                  className="flex items-start"
                  custom={index}
                  variants={listItemVariants}
                >
                  <div className="mt-1 min-w-6 min-h-6 bg-white/20 rounded-full flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-white">{benefit}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </motion.div>

        <motion.div 
          className="flex justify-center perspective-1000 relative"
          custom={1}
          variants={cardVariants}
        >
          <motion.div 
            className="bg-gradient-to-b from-blue-400 to-blue-600 p-8 rounded-xl shadow-lg border border-blue-200 transform transition-all hover:scale-105 max-w-sm w-full relative z-10 transform-style-3d"
            whileHover={{
              boxShadow: "0 25px 50px -12px rgba(37, 99, 235, 0.4)",
              transform: "translateY(-10px)"
            }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center mb-6">
              <motion.div 
                className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4"
                animate={floatingAnimation}
              >
                <School className="h-6 w-6 text-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white">
                For Teachers
              </h3>
            </div>
            <motion.ul className="space-y-3">
              {teacherBenefits.map((benefit, index) => (
                <motion.li 
                  key={index} 
                  className="flex items-start"
                  custom={index}
                  variants={listItemVariants}
                >
                  <div className="mt-1 min-w-6 min-h-6 bg-white/20 rounded-full flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-white">{benefit}</span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </motion.div>
      </motion.div>
      
      <EducationalFlowTimeline />
    </div>
  );
};

export default BenefitsSection;
