
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
    delay: 0.05
  }, {
    id: 2,
    title: "AI Processing",
    description: "Our AI analyzes student performance",
    icon: <Brain className="h-6 w-6 text-blue-100" />,
    delay: 0.1
  }, {
    id: 3,
    title: "Data Anonymization",
    description: "Personal data is anonymized for privacy",
    icon: <UserX className="h-6 w-6 text-blue-100" />,
    delay: 0.15
  }, {
    id: 4,
    title: "Analytics Generation",
    description: "Comprehensive reports are produced",
    icon: <ChartBar className="h-6 w-6 text-blue-100" />,
    delay: 0.2
  }, {
    id: 5,
    title: "Teacher Insights",
    description: "Educators gain valuable insights for improvement",
    icon: <div className="flex space-x-2">
          <Lightbulb className="h-6 w-6 text-blue-100" />
          <GraduationCap className="h-6 w-6 text-blue-100" />
        </div>,
    delay: 0.25
  }];

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 80,
        damping: 12,
        when: "beforeChildren",
        staggerChildren: 0.08
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (delay: number) => ({
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 80,
        damping: 10,
        delay
      }
    })
  };

  const pulseAnimation = {
    scale: [1, 1.08, 1],
    opacity: [0.8, 1, 0.8],
    transition: {
      duration: 1.8,
      repeat: Infinity,
      repeatType: "reverse" as const
    }
  };

  const connectingLineVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { 
          type: "spring", 
          duration: 1.5, 
          bounce: 0 
        },
        opacity: { duration: 0.3 }
      }
    }
  };

  return (
    <div ref={timelineRef} className="mt-16 max-w-6xl mx-auto px-4">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate={isVisible ? "visible" : "hidden"}
        className="relative flex justify-center"
      >
        {/* Center Circle */}
        <motion.div 
          className="absolute w-32 h-32 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-center z-10"
          animate={pulseAnimation}
        >
          <div className="text-white text-center">
            <p className="font-bold">Continuous</p>
            <p className="text-sm">Learning Cycle</p>
          </div>
        </motion.div>

        {/* SVG for connecting circular lines */}
        <svg className="absolute w-full h-full" viewBox="0 0 400 400" style={{ maxWidth: '600px' }}>
          <motion.circle
            cx="200"
            cy="200"
            r="150"
            fill="none"
            stroke="url(#circleGradient)"
            strokeWidth="2"
            strokeDasharray="15,10"
            variants={connectingLineVariants}
            className="opacity-60"
          />
          <defs>
            <linearGradient id="circleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
        </svg>

        {/* Timeline items positioned in a circle */}
        <div className="relative w-[350px] h-[350px] md:w-[500px] md:h-[500px]">
          {timelineSteps.map((step, index) => {
            // Calculate position on a circle
            const angle = (index * (360 / timelineSteps.length)) * (Math.PI / 180);
            const radius = 180; // Adjust this value to change the size of the circle
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            return (
              <motion.div 
                key={step.id}
                custom={step.delay}
                variants={itemVariants}
                className="absolute w-24 md:w-28 text-center"
                style={{ 
                  left: `calc(50% + ${x}px - 12px)`, 
                  top: `calc(50% + ${y}px - 12px)`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <motion.div 
                  className="w-16 h-16 rounded-full bg-gradient-to-b from-blue-400 to-blue-600 flex items-center justify-center mb-3 mx-auto"
                  animate={pulseAnimation}
                >
                  {step.icon}
                </motion.div>
                <h4 className="font-semibold text-center mb-1">{step.title}</h4>
                <p className="text-xs text-gray-500 text-center max-w-[120px] mx-auto">
                  {step.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default EducationalFlowTimeline;
