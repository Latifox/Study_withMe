
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Settings,
  Network,
  BookAudio
} from "lucide-react";

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
      icon: <Network className="h-6 w-6 text-purple-600" />,
      title: "Mindmap",
      description: "Visualize concepts and their relationships through interactive visual diagrams.",
    },
    {
      icon: <BookAudio className="h-6 w-6 text-purple-600" />,
      title: "Podcast",
      description: "Listen to your lecture content in podcast format for on-the-go learning.",
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
    slidesToScroll: 1,
    containScroll: "trimSnaps",
  });

  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    
    // Create an IntersectionObserver to detect when the section is visible
    const observer = new IntersectionObserver(
      (entries) => {
        setIsVisible(entries[0].isIntersecting);
      },
      { threshold: 0.1 } // 10% of the element is visible
    );
    
    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }
    
    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, [emblaApi, sectionRef]);

  useEffect(() => {
    if (!emblaApi || !isVisible) return;
    
    // Only auto-scroll when the section is visible and document is visible
    const autoScrollInterval = setInterval(() => {
      if (document.visibilityState === "visible" && isVisible) {
        scrollNext();
      }
    }, 5000);
    
    return () => clearInterval(autoScrollInterval);
  }, [emblaApi, scrollNext, isVisible]);

  return (
    <div ref={sectionRef} className="container mx-auto px-4 py-16 md:py-24 overflow-hidden relative">
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

      <div className="relative z-10 px-6 max-w-6xl mx-auto">
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {features.map((feature, i) => (
              <div key={i} className="flex-shrink-0 w-full md:w-1/3 px-4 relative group">
                <div 
                  className="absolute inset-0 rounded-xl animate-energy-glow" 
                  style={{
                    background: 'radial-gradient(circle at center, rgba(147, 51, 234, 0.95) 0%, rgba(79, 70, 229, 0.95) 35%, transparent 70%)',
                    filter: 'blur(18px)',
                    transform: 'scale(1.25)',
                    opacity: 0.95,
                    zIndex: 0
                  }}
                />
                
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-xl shadow-lg border border-purple-300 h-full transform transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-xl relative z-10">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3">
                      {React.cloneElement(feature.icon, { className: "h-6 w-6 text-white" })}
                    </div>
                    <h3 className="font-bold text-lg text-white">{feature.title}</h3>
                  </div>
                  <p className="text-white">{feature.description}</p>
                </div>
              </div>
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
