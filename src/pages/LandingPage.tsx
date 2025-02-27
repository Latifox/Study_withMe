
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ArrowRight, BookOpen, Brain, Sparkles, ChevronLeft, ChevronRight, FileText, MessageSquare, HeartPulse, HelpCircle, Link2, Users, Settings, GraduationCap, School, Trophy, Flame, Star, Zap, Award, Check, Clock, Diamond, Shield, Rocket, Crown } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";

const LandingPage = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [isHovering, setIsHovering] = useState(false);
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    startIndex: 0 // Start with "Study Plan"
  });
  
  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  // Auto-scroll functionality
  useEffect(() => {
    if (!emblaApi) return;

    // Auto-scroll interval (5 seconds)
    const autoScrollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        scrollNext();
      }
    }, 5000);

    // Clear interval on unmount
    return () => clearInterval(autoScrollInterval);
  }, [emblaApi, scrollNext]);

  const handleGetStarted = () => {
    navigate("/auth");
  };

  const handleSignUp = () => {
    // Navigate to auth page with register tab pre-selected
    navigate("/auth?tab=register");
  };

  const features = [{
    icon: <Users className="h-6 w-6 text-purple-600" />,
    title: "Study Plan",
    description: "Get a personalized learning path optimized for efficient knowledge acquisition."
  }, {
    icon: <BookOpen className="h-6 w-6 text-purple-600" />,
    title: "Story Mode",
    description: "Experience your learning materials through engaging interactive stories."
  }, {
    icon: <FileText className="h-6 w-6 text-purple-600" />,
    title: "Highlights",
    description: "Access key points and summaries extracted from your lecture materials."
  }, {
    icon: <MessageSquare className="h-6 w-6 text-purple-600" />,
    title: "Chat",
    description: "Engage in conversations with an AI tutor about your course materials."
  }, {
    icon: <HeartPulse className="h-6 w-6 text-purple-600" />,
    title: "Flashcards",
    description: "Review concepts with automatically generated flashcards for effective memorization."
  }, {
    icon: <HelpCircle className="h-6 w-6 text-purple-600" />,
    title: "Quiz",
    description: "Test your knowledge with AI-generated quizzes based on your lectures."
  }, {
    icon: <Link2 className="h-6 w-6 text-purple-600" />,
    title: "Additional Resources",
    description: "Discover related materials and resources to deepen your understanding."
  }, {
    icon: <Settings className="h-6 w-6 text-purple-600" />,
    title: "AI Configuration",
    description: "Customize the AI's behavior with adjustable parameters for personalized learning experiences."
  }];

  const studentBenefits = [
    "Personalized study plans tailored to your learning style and pace",
    "Interactive content that makes complex concepts easier to understand",
    "AI-generated summaries and highlights to save study time",
    "Intelligent flashcards that adapt to your knowledge gaps",
    "24/7 AI tutor available to answer questions about course material",
    "Self-assessment quizzes that identify areas needing improvement",
    "Integrated resources to expand your knowledge beyond course material"
  ];

  const teacherBenefits = [
    "Automated content transformation from your lecture materials",
    "Detailed analytics on student engagement and performance",
    "Reduced workload with AI-generated quizzes and assessments",
    "Ability to customize learning paths for individual students or groups",
    "Insights into common student misunderstandings and knowledge gaps",
    "More time for meaningful student interactions and personalized support",
    "Easy integration with your existing course materials and teaching style"
  ];

  // Gamification elements to display with bold, eye-catching colors
  const gamificationElements = [
    {
      icon: <Star className="h-10 w-10 text-white" />,
      title: "Experience Points (XP)",
      description: "Earn XP as you complete learning activities. Track your progress and level up your knowledge.",
      color: "bg-yellow-400",
      textColor: "text-yellow-900"
    },
    {
      icon: <Flame className="h-10 w-10 text-white" />,
      title: "Learning Streaks",
      description: "Build and maintain daily learning streaks. Consistency is the key to mastery and retention.",
      color: "bg-red-500",
      textColor: "text-red-900"
    }
  ];

  // Revised subscription plans
  const subscriptionPlans = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Basic features to get you started",
      features: [
        "5 AI chat messages per day",
        "Basic study plans",
        "Limited highlights & summaries",
        "Standard quiz generation",
        "Basic flashcards"
      ],
      ctaText: "Get Started",
      recommended: false,
      icon: <Clock className="h-7 w-7" />,
      color: "bg-gradient-to-b from-slate-50 to-slate-100",
      borderColor: "border-slate-200",
      textColor: "text-slate-700",
      iconColor: "text-slate-500",
      buttonVariant: "outline"
    },
    {
      name: "Plus",
      price: "$4.99",
      period: "month",
      description: "Enhanced learning experience",
      features: [
        "50 AI chat messages per day",
        "Personalized study paths",
        "Full lecture highlights",
        "Advanced quiz generation",
        "Unlimited flashcards",
        "Priority support"
      ],
      ctaText: "Upgrade Now",
      recommended: true,
      icon: <Rocket className="h-7 w-7" />,
      color: "bg-gradient-to-b from-purple-50 to-indigo-100",
      borderColor: "border-purple-200",
      textColor: "text-purple-700",
      iconColor: "text-purple-500",
      buttonVariant: "default"
    },
    {
      name: "Premium",
      price: "$9.99",
      period: "month",
      description: "Ultimate learning toolkit",
      features: [
        "Unlimited AI chat conversations",
        "Advanced personalized study plans",
        "Interactive story mode access",
        "Advanced analytics & progress tracking",
        "Exclusive learning resources",
        "Premium support",
        "No advertisements"
      ],
      ctaText: "Go Premium",
      recommended: false,
      icon: <Crown className="h-7 w-7" />,
      color: "bg-gradient-to-b from-amber-50 to-amber-100",
      borderColor: "border-amber-200",
      textColor: "text-amber-700",
      iconColor: "text-amber-500",
      buttonVariant: "outline"
    }
  ];

  return <div className="min-h-screen relative overflow-hidden">
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
            <Button variant="outline" onClick={() => navigate("/auth")} className="border-purple-200 hover:bg-purple-100 hover:text-purple-700 mr-2">
              Login
            </Button>
            <Button onClick={handleSignUp} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700">
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
          <p className="text-lg md:text-xl text-gray-700 text-center max-w-2xl mb-12">Upload your course materials and let our AI guide you on a journey of discovery, transforming learning into a meaningful exploration of growth and understanding!</p>
          <Button size="lg" onClick={handleGetStarted} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-lg px-8 py-6 h-auto transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
            Get Started {isHovering ? <Sparkles className="ml-2 h-5 w-5 animate-pulse" /> : <ArrowRight className="ml-2 h-5 w-5" />}
          </Button>
        </div>

        {/* Gamification Section */}
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12 bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl border-2 border-purple-300">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Learn with Purpose
              </span>
            </h2>
            <p className="text-lg text-gray-700">
              Our gamified learning approach keeps you motivated and tracks your progress through your educational journey
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {gamificationElements.map((element, index) => (
              <div 
                key={index} 
                className="bg-white/50 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-white/20 transform transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-1"
              >
                <div className="flex items-center mb-6">
                  <div className={`${element.color} p-4 rounded-full flex items-center justify-center shadow-lg mr-4`}>
                    {element.icon}
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    {element.title}
                  </h3>
                </div>
                <p className={`text-gray-700 ${element.textColor}`}>
                  {element.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Features Carousel Section - Reduced top padding here */}
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl mb-12 border-2 border-purple-400">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Powerful Learning Tools
              </span>
            </h2>
            <p className="text-lg text-gray-700 text-center">
              Explore our range of AI-powered features designed to enhance your educational experience
            </p>
          </div>
          
          <div className="relative">
            {/* Carousel Navigation */}
            <Button variant="ghost" size="icon" className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white/90 shadow-md rounded-full h-10 w-10" onClick={scrollPrev}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <Button variant="ghost" size="icon" className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/80 hover:bg-white/90 shadow-md rounded-full h-10 w-10" onClick={scrollNext}>
              <ChevronRight className="h-5 w-5" />
            </Button>
            
            {/* Carousel Container with improved shadow visibility */}
            <div className="overflow-visible" ref={emblaRef}>
              <div className="flex py-6">
                {features.map((feature, index) => (
                  <div key={index} className="min-w-0 flex-[0_0_100%] sm:flex-[0_0_50%] md:flex-[0_0_33.33%] px-4 py-2">
                    <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-xl hover:shadow-2xl transition-shadow border border-purple-100 h-full transform hover:scale-105 duration-300">
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

        {/* Benefits Sections - Students and Teachers */}
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl mb-12 border-2 border-purple-500">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              Who Benefits from <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">EduSync AI</span>
            </h2>
            <p className="text-lg text-gray-700 text-center">
              Our platform serves both students and educators with specialized tools and features
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
            {/* Students Section */}
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-purple-100 transform transition-all hover:scale-105">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                  <GraduationCap className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">For Students</h3>
              </div>
              
              <ul className="space-y-3">
                {studentBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <div className="mt-1 min-w-6 min-h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                    </div>
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Teachers Section */}
            <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-purple-100 transform transition-all hover:scale-105">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
                  <School className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">For Teachers</h3>
              </div>
              
              <ul className="space-y-3">
                {teacherBenefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <div className="mt-1 min-w-6 min-h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                      <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                    </div>
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Subscription Plans Section - Redesigned */}
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl mb-16 border-2 border-purple-500">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
              <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Choose Your Plan
              </span>
            </h2>
            <p className="text-lg text-gray-700 text-center">
              Select the perfect subscription that fits your learning needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12">
            {subscriptionPlans.map((plan, index) => (
              <div 
                key={index}
                className={`relative rounded-2xl overflow-hidden transition-all duration-300 group hover:-translate-y-2 ${
                  plan.recommended ? 'md:scale-110 md:-mt-4 md:mb-4 z-10 shadow-xl' : 'shadow-lg'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-1.5 font-medium text-sm">
                    MOST POPULAR
                  </div>
                )}
                
                <div className={`${plan.color} p-8 ${plan.recommended ? 'pt-10' : ''} ${plan.borderColor} border-b`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-full bg-white/30 ${plan.iconColor}`}>
                      {plan.icon}
                    </div>
                    <h3 className={`text-2xl font-bold ${plan.textColor}`}>{plan.name}</h3>
                  </div>
                  
                  <div className="mb-2">
                    <span className={`text-3xl font-bold ${plan.textColor}`}>{plan.price}</span>
                    <span className={`text-sm ml-1 ${plan.textColor} opacity-80`}>/{plan.period}</span>
                  </div>
                  
                  <p className={`mb-4 ${plan.textColor} opacity-90`}>{plan.description}</p>
                </div>
                
                <div className="bg-white p-8 border-t-0 h-full flex flex-col">
                  <ul className="space-y-3 mb-6 flex-grow">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start">
                        <div className={`${plan.iconColor} flex-shrink-0 mt-0.5 mr-2`}>
                          <Check className="h-5 w-5" />
                        </div>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    variant={plan.buttonVariant as any}
                    className={`w-full ${
                      plan.buttonVariant === 'default' 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                        : `border ${plan.borderColor} ${plan.textColor} hover:bg-gray-50`
                    }`}
                    onClick={() => plan.recommended ? handleSignUp() : navigate("/auth")}
                  >
                    {plan.ctaText}
                  </Button>
                </div>
              </div>
            ))}
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
    </div>;
};

export default LandingPage;
