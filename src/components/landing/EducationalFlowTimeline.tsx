import { useEffect, useRef, useState } from "react";
import { BookOpenText, Brain, ChartBar, ArrowRight, UserX, Lightbulb, GraduationCap, FileText } from "lucide-react";
import { motion } from "framer-motion";
const EducationalFlowTimeline = () => {
  const [isVisible, setIsVisible] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        setIsVisible(true);
        if (timelineRef.current) {
          observer.unobserve(timelineRef.current);
        }
      }
    }, {
      threshold: 0.3
    });
    if (timelineRef.current) {
      observer.observe(timelineRef.current);
    }
    return () => {
      if (timelineRef.current) {
        observer.unobserve(timelineRef.current);
      }
    };
  }, []);
  const timelineSteps = [{
    id: 1,
    title: "Student Activities",
    description: "Students engage with various learning tools",
    icon: <div className="flex space-x-2">
          <BookOpenText className="h-6 w-6 text-blue-100" />
          <FileText className="h-6 w-6 text-blue-100" />
        </div>,
    delay: 0.1
  }, {
    id: 2,
    title: "AI Processing",
    description: "Our AI analyzes student performance",
    icon: <Brain className="h-6 w-6 text-blue-100" />,
    delay: 0.3
  }, {
    id: 3,
    title: "Data Anonymization",
    description: "Personal data is anonymized for privacy",
    icon: <UserX className="h-6 w-6 text-blue-100" />,
    delay: 0.5
  }, {
    id: 4,
    title: "Analytics Generation",
    description: "Comprehensive reports are produced",
    icon: <ChartBar className="h-6 w-6 text-blue-100" />,
    delay: 0.7
  }, {
    id: 5,
    title: "Teacher Insights",
    description: "Educators gain valuable insights for improvement",
    icon: <div className="flex space-x-2">
          <Lightbulb className="h-6 w-6 text-blue-100" />
          <GraduationCap className="h-6 w-6 text-blue-100" />
        </div>,
    delay: 0.9
  }];
  const containerVariants = {
    hidden: {
      opacity: 0,
      y: 50
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 50,
        damping: 20,
        when: "beforeChildren",
        staggerChildren: 0.2
      }
    }
  };
  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20
    },
    visible: (delay: number) => ({
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 40,
        damping: 15,
        delay
      }
    })
  };
  const arrowVariants = {
    hidden: {
      opacity: 0,
      width: 0
    },
    visible: {
      opacity: 1,
      width: "100%",
      transition: {
        type: "spring",
        stiffness: 30,
        damping: 10,
        delay: 0.5
      }
    }
  };
  const pulseAnimation = {
    scale: [1, 1.1, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 3,
      repeat: Infinity,
      repeatType: "reverse" as const
    }
  };
  const dataFlowAnimation = {
    x: [0, 10, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "linear"
    }
  };
  return <div ref={timelineRef} className="mt-16 max-w-6xl mx-auto px-4">
      <motion.div className="text-center mb-12" initial={{
      opacity: 0,
      y: 20
    }} animate={isVisible ? {
      opacity: 1,
      y: 0
    } : {
      opacity: 0,
      y: 20
    }} transition={{
      duration: 0.6
    }}>
        <h3 className="text-2xl md:text-3xl font-bold mb-3">
          How{" "}
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            EduSync AI
          </span>{" "}
          Creates Value
        </h3>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Our platform creates a seamless flow of information between students and teachers, 
          using AI to transform learning experiences into valuable insights.
        </p>
      </motion.div>

      <motion.div className="relative" variants={containerVariants} initial="hidden" animate={isVisible ? "visible" : "hidden"}>
        {/* Timeline Track */}
        <div className="absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full mx-10 md:mx-20" />

        {/* Timeline Steps */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative z-10">
          {timelineSteps.map((step, index) => <motion.div key={step.id} className="flex flex-col items-center" custom={step.delay} variants={itemVariants}>
              <motion.div className="w-16 h-16 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 flex items-center justify-center mb-3" animate={pulseAnimation}>
                {step.icon}
              </motion.div>
              <div className="h-8" /> {/* Spacer for timeline alignment */}
              <h4 className="font-semibold text-center mb-1">{step.title}</h4>
              <p className="text-sm text-gray-500 text-center max-w-[200px]">
                {step.description}
              </p>

              {/* Flow arrows between steps (except last) */}
              {index < timelineSteps.length - 1 && <motion.div className="absolute top-24 transform -translate-y-1/2 hidden md:block" style={{
            left: `${index * 20 + 16}%`,
            width: '8%'
          }} variants={arrowVariants}>
                  
                </motion.div>}
            </motion.div>)}
        </div>
      </motion.div>
    </div>;
};
export default EducationalFlowTimeline;