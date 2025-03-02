
import React, { useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  BookOpen, 
  FileText, 
  MessageSquare, 
  HeartPulse, 
  HelpCircle, 
  Link2, 
  Settings 
} from "lucide-react";
import Bubbles from "./Bubbles";
import { motion } from "framer-motion";

const FeaturesSection = () => {
  const features = [
    {
      icon: <Users className="h-6 w-6 text-purple-600" />,
      title: "Study Plan",
      description: "Get a personalized learning path optimized for efficient knowledge acquisition.",
    },
    {
      icon: <BookOpen className="h-6 w-6 text-purple-600" />,
      title: "Story Mode",
      description: "Experience your learning materials through engaging interactive stories.",
    },
    {
      icon: <FileText className="h-6 w-6 text-purple-600" />,
      title: "Highlights",
      description: "Access key points and summaries extracted from your lecture materials.",
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-purple-600" />,
      title: "Chat",
      description: "Engage in conversations with an AI tutor about your course materials.",
    },
    {
      icon: <HeartPulse className="h-6 w-6 text-purple-600" />,
      title: "Flashcards",
      description: "Review concepts with automatically generated flashcards for effective memorization.",
    },
    {
      icon: <HelpCircle className="h-6 w-6 text-purple-600" />,
      title: "Quiz",
      description: "Test your knowledge with AI-generated quizzes based on your lectures.",
    },
    {
      icon: <Link2 className="h-6 w-6 text-purple-600" />,
      title: "Additional Resources",
      description: "Discover related materials and resources to deepen your understanding.",
    },
    {
      icon: <Settings className="h-6 w-6 text-purple-600" />,
      title: "AI Configuration",
      description: "Customize the AI's behavior with adjustable parameters for personalized learning experiences.",
    },
  ];

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    align: "center",
    dragFree: true,
    containScroll: "trimSnaps",
    slidesToScroll: 1,
  });

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const autoScrollInterval = setInterval(() => {
      if (document.visibilityState === "visible") {
        scrollNext();
      }
    }, 5000);
    return () => clearInterval(autoScrollInterval);
  }, [emblaApi, scrollNext]);

  // Animation variants for the cards
  const cardVariants = {
    initial: {
      opacity: 0,
      y: 20
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    },
    hover: {
      y: -8,
      scale: 1.03,
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 overflow-hidden relative">
      <Bubbles position="left" tint="purple" />
      <Bubbles position="right" tint="purple" />
      
      <div className="bg-white/10 backdrop-blur-sm p-6 shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl mb-16 border-2 border-purple-500 relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          <span className="text-black">Feature Rich</span>{" "}
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Learning Platform
          </span>
        </h2>
        <p className="text-lg text-gray-700 text-center">
          Discover all the tools designed to enhance your educational experience
        </p>
      </div>

      <div className="relative z-10 px-6">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {features.map((feature, i) => (
              <motion.div 
                key={i} 
                className="flex-shrink-0 w-[280px] md:w-[320px] mx-1"
                variants={cardVariants}
                initial="initial"
                animate="animate"
                whileHover="hover"
                viewport={{ once: true }}
              >
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-xl shadow-lg h-full relative overflow-hidden group">
                  {/* Enhanced glowing effects */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 via-indigo-500 to-purple-600 rounded-xl blur-md opacity-0 group-hover:opacity-80 transition-opacity duration-700 -z-10"></div>
                  
                  {/* Additional energy glows */}
                  <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-purple-500 rounded-full blur-3xl opacity-20 group-hover:opacity-50 animate-pulse-slow"></div>
                  <div className="absolute -top-8 -left-8 w-28 h-28 bg-indigo-400 rounded-full blur-3xl opacity-20 group-hover:opacity-50 animate-pulse-slow" style={{ animationDelay: "1s" }}></div>
                  
                  {/* Highlight edge glow */}
                  <div className="absolute inset-0 border border-purple-300/50 rounded-xl group-hover:border-purple-200/70 transition-colors duration-500"></div>
                  
                  {/* Card content with relative positioning to stay above the glow */}
                  <div className="relative z-10">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3 group-hover:bg-white/30 transition-colors duration-300">
                        {React.cloneElement(feature.icon, { className: "h-6 w-6 text-white" })}
                      </div>
                      <h3 className="font-bold text-xl text-white">{feature.title}</h3>
                    </div>
                    <p className="text-white/90 group-hover:text-white transition-colors duration-300">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <button
          onClick={scrollPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg border border-purple-100 hover:bg-white/95 transition-colors z-10"
          aria-label="Previous"
        >
          <ChevronLeft className="h-6 w-6 text-purple-600" />
        </button>
        <button
          onClick={scrollNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg border border-purple-100 hover:bg-white/95 transition-colors z-10"
          aria-label="Next"
        >
          <ChevronRight className="h-6 w-6 text-purple-600" />
        </button>
      </div>
    </div>
  );
};

export default FeaturesSection;
