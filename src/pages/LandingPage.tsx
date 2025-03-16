
import NavigationBar from "@/components/landing/NavigationBar";
import HeroSection from "@/components/landing/HeroSection";
import GamificationSection from "@/components/landing/GamificationSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TechPartnersSection from "@/components/landing/TechPartnersSection";
import SubscriptionPlansSection from "@/components/landing/SubscriptionPlansSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import Footer from "@/components/landing/Footer";
import DynamicWaveform from "@/components/landing/DynamicWaveform";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white relative">
      {/* Dynamic Waveform Background */}
      <DynamicWaveform />
      
      {/* Content */}
      <div className="relative z-10">
        <NavigationBar />
        <HeroSection />
        <GamificationSection />
        <BenefitsSection />
        <FeaturesSection />
        <TechPartnersSection />
        <SubscriptionPlansSection />
        <TestimonialsSection />
        <Footer />
      </div>
    </div>
  );
};

export default LandingPage;
