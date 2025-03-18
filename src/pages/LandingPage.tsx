
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
