
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
              >
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-xl shadow-lg border border-purple-300 h-full relative overflow-hidden group">
                  {/* Glowing energy effects */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-purple-400 to-indigo-500 rounded-xl blur opacity-30 group-hover:opacity-70 transition duration-1000"></div>
                  <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-500 rounded-full blur-2xl opacity-40 group-hover:opacity-70 animate-pulse"></div>
                  <div className="absolute -top-4 -left-4 w-20 h-20 bg-indigo-500 rounded-full blur-2xl opacity-40 group-hover:opacity-70 animate-pulse" style={{ animationDelay: "0.5s" }}></div>
                  
                  {/* Card content with relative positioning to stay above the glow */}
                  <div className="relative">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                        {React.cloneElement(feature.icon, { className: "h-6 w-6 text-white" })}
                      </div>
                      <h3 className="font-bold text-lg text-white">{feature.title}</h3>
                    </div>
                    <p className="text-white">{feature.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <button
          onClick={scrollPrev}
          className="absolute left-0 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg border border-purple-100"
          aria-label="Previous"
        >
          <ChevronLeft className="h-6 w-6 text-purple-600" />
        </button>
        <button
          onClick={scrollNext}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm p-2 rounded-full shadow-lg border border-purple-100"
          aria-label="Next"
        >
          <ChevronRight className="h-6 w-6 text-purple-600" />
        </button>
      </div>
    </div>
  );
};

export default FeaturesSection;
