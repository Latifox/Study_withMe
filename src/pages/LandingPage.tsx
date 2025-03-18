
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
import ThreeBackground from "@/components/landing/ThreeBackground";

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
      {/* Purple Light Beam with Sun Rays */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-[20vw] h-[70vh] pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/60 via-purple-500/20 to-transparent animate-pulse-beam rounded-full blur-2xl"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-400/50 via-violet-500/30 to-transparent animate-glow-beam rounded-full blur-xl"></div>
      </div>
      
      {/* Sun Rays */}
      <div className="sun-rays-container">
        <div className="sun-rays-rotate">
          {/* 8 rays at different angles */}
          <div className="sun-ray sun-ray-1" style={{ height: '70vh', width: '3px', transform: 'rotate(0deg)' }}></div>
          <div className="sun-ray sun-ray-2" style={{ height: '65vh', width: '2px', transform: 'rotate(45deg)' }}></div>
          <div className="sun-ray sun-ray-3" style={{ height: '70vh', width: '3px', transform: 'rotate(90deg)' }}></div>
          <div className="sun-ray sun-ray-4" style={{ height: '65vh', width: '2px', transform: 'rotate(135deg)' }}></div>
          <div className="sun-ray sun-ray-5" style={{ height: '70vh', width: '3px', transform: 'rotate(180deg)' }}></div>
          <div className="sun-ray sun-ray-6" style={{ height: '65vh', width: '2px', transform: 'rotate(225deg)' }}></div>
          <div className="sun-ray sun-ray-7" style={{ height: '70vh', width: '3px', transform: 'rotate(270deg)' }}></div>
          <div className="sun-ray sun-ray-8" style={{ height: '65vh', width: '2px', transform: 'rotate(315deg)' }}></div>
        </div>
      </div>
      
      {/* 3D Particles Background */}
      <ThreeBackground />
      
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
