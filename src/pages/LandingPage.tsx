
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight, BookOpen, Brain, Sparkles, ChevronLeft, ChevronRight, FileText, MessageSquare, HeartPulse, HelpCircle, Link2, Users } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isHovering, setIsHovering] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  
  const scrollPrev = () => emblaApi && emblaApi.scrollPrev();
  const scrollNext = () => emblaApi && emblaApi.scrollNext();

  const handleGetStarted = () => {
    navigate("/auth");
  };

  const handleSignUp = () => {
    // Navigate to auth page with register tab pre-selected
    navigate("/auth?tab=register");
  };

  const features = [
    {
      icon: <Users className="h-6 w-6 text-purple-600" />,
      title: "Study Plan",
      description: "Get a personalized learning path optimized for efficient knowledge acquisition."
    },
    {
      icon: <BookOpen className="h-6 w-6 text-purple-600" />,
      title: "Story Mode",
      description: "Experience your learning materials through engaging interactive stories."
    },
    {
      icon: <FileText className="h-6 w-6 text-purple-600" />,
      title: "Highlights",
      description: "Access key points and summaries extracted from your lecture materials."
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-purple-600" />,
      title: "Chat",
      description: "Engage in conversations with an AI tutor about your course materials."
    },
    {
      icon: <HeartPulse className="h-6 w-6 text-purple-600" />,
      title: "Flashcards",
      description: "Review concepts with automatically generated flashcards for effective memorization."
    },
    {
      icon: <HelpCircle className="h-6 w-6 text-purple-600" />,
      title: "Quiz",
      description: "Test your knowledge with AI-generated quizzes based on your lectures."
    },
    {
      icon: <Link2 className="h-6 w-6 text-purple-600" />,
      title: "Additional Resources",
      description: "Discover related materials and resources to deepen your understanding."
    }
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with mesh pattern */}
      <div className="absolute inset-0 bg-gradient-to-b from-violet-50 to-indigo-100">
        {/* Mesh grid overlay */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" className="text-purple-500" />
          </svg>
        </div>
        
        {/* Animated blobs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Navbar */}
        <nav className="px-8 py-4 flex justify-between items-center backdrop-blur-sm bg-white/30">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-purple-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              EduSync AI
            </span>
          </div>
          <div>
            <Button
              variant="outline"
              onClick={() => navigate("/auth")}
              className="border-purple-200 hover:bg-purple-100 hover:text-purple-700 mr-2"
            >
              Login
            </Button>
            <Button
              onClick={handleSignUp}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              Sign Up
            </Button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="container mx-auto px-4 py-16 md:py-32 flex flex-col items-center">
          <h1 className="text-4xl md:text-6xl font-bold text-center max-w-4xl mb-6">
            Transform Your Learning Experience with{" "}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              AI-Powered Education
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-700 text-center max-w-2xl mb-12">
            Upload your course materials and let our AI create personalized quizzes, flashcards, 
            study plans, and interactive learning experiences.
          </p>
          <Button 
            size="lg" 
            onClick={handleGetStarted}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg px-8 py-6 h-auto transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Get Started {isHovering ? <Sparkles className="ml-2 h-5 w-5 animate-pulse" /> : <ArrowRight className="ml-2 h-5 w-5" />}
          </Button>
        </div>

        {/* Features Carousel Section */}
        <div className="container mx-auto px-4 py-16 md:py-24">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            Powerful Learning Tools
          </h2>
          
          <div className="relative">
            {/* Carousel Navigation */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white/90 shadow-md rounded-full h-10 w-10"
              onClick={scrollPrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white/90 shadow-md rounded-full h-10 w-10"
              onClick={scrollNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
            
            {/* Carousel Container */}
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {features.map((feature, index) => (
                  <div key={index} className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_50%] md:flex-[0_0_33.33%] px-4">
                    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-md hover:shadow-xl transition-all border border-purple-100 h-full">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                        {feature.icon}
                      </div>
                      <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                      <p className="text-gray-700">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-white/30 backdrop-blur-sm py-12 border-t border-purple-100">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="flex items-center gap-2 mb-4 md:mb-0">
                <BookOpen className="h-5 w-5 text-purple-600" />
                <span className="text-lg font-bold text-gray-800">EduSync AI</span>
              </div>
              <div className="text-sm text-gray-600">
                © {new Date().getFullYear()} EduSync AI. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default LandingPage;
