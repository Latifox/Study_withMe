
import NavigationBar from "@/components/landing/NavigationBar";
import HeroSection from "@/components/landing/HeroSection";
import GamificationSection from "@/components/landing/GamificationSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import SubscriptionPlansSection from "@/components/landing/SubscriptionPlansSection";
import Footer from "@/components/landing/Footer";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white relative">
      {/* Mesh pattern overlay with sharp corners */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path 
                d="M0,5 L0,0 L5,0 L40,0 L40,5 L40,40 L0,40 L0,5"
                fill="none" 
                stroke="purple" 
                strokeWidth="1" 
                strokeLinecap="square"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        <NavigationBar />
        <HeroSection />
        <GamificationSection />
        <BenefitsSection />
        <FeaturesSection />
        <SubscriptionPlansSection />
        <Footer />
      </div>
    </div>
  );
};

export default LandingPage;
