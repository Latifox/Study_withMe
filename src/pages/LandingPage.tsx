
import { Suspense } from "react";
import NavigationBar from "@/components/landing/NavigationBar";
import HeroSection from "@/components/landing/HeroSection";
import GamificationSection from "@/components/landing/GamificationSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TechPartnersSection from "@/components/landing/TechPartnersSection";
import SubscriptionPlansSection from "@/components/landing/SubscriptionPlansSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import Footer from "@/components/landing/Footer";
import { Loader } from "lucide-react";

// Loading component for suspense fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-gray-900">
    <div className="flex flex-col items-center">
      <Loader className="h-12 w-12 text-purple-500 animate-spin" />
      <p className="mt-4 text-white font-medium">Loading amazing experience...</p>
    </div>
  </div>
);

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-900 relative overflow-hidden">
      {/* Sun-like Rays */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden z-[5]">
        {/* Main light beam */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[20vw] h-[70vh] bg-gradient-to-b from-purple-500/50 to-transparent rounded-b-full filter blur-[20px] opacity-70"></div>
        
        {/* Rotating rays container */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 ray-rotate">
          {[...Array(18)].map((_, i) => (
            <div 
              key={i} 
              className={`absolute top-0 left-1/2 -translate-x-1/2 h-[15vh] w-[2px] bg-gradient-to-b from-purple-400 to-transparent rounded-b-full opacity-50 filter blur-[3px]`}
              style={{ 
                transform: `translateX(-50%) rotate(${i * 20}deg)`, 
                animationDelay: `${i * 0.2}s`,
                animation: `ray-pulse ${4 + (i % 5) * 0.2}s infinite ease-in-out, ray-grow ${6 + (i % 5) * 0.4}s infinite ease-in-out` 
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <NavigationBar />
        <Suspense fallback={<LoadingFallback />}>
          <HeroSection />
          <GamificationSection />
          <BenefitsSection />
          <FeaturesSection />
          <TechPartnersSection />
          <SubscriptionPlansSection />
          <TestimonialsSection />
          <Footer />
        </Suspense>
      </div>
    </div>
  );
};

export default LandingPage;
