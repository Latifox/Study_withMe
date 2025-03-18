
import NavigationBar from "@/components/landing/NavigationBar";
import HeroSection from "@/components/landing/HeroSection";
import GamificationSection from "@/components/landing/GamificationSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import TechPartnersSection from "@/components/landing/TechPartnersSection";
import SubscriptionPlansSection from "@/components/landing/SubscriptionPlansSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import Footer from "@/components/landing/Footer";
import SectionDivider from "@/components/ui/SectionDivider";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-900 relative">
      {/* Content */}
      <div className="relative z-10">
        <NavigationBar />
        
        {/* Hero Section */}
        <div className="relative">
          <HeroSection />
          <SectionDivider position="bottom" variant="purple-indigo" height={100} />
        </div>
        
        {/* Gamification Section */}
        <div className="relative">
          <SectionDivider position="top" variant="purple-indigo" height={100} className="opacity-70" />
          <GamificationSection />
          <SectionDivider position="bottom" variant="indigo-purple" height={100} />
        </div>
        
        {/* Benefits Section */}
        <div className="relative">
          <SectionDivider position="top" variant="indigo-purple" height={100} className="opacity-70" />
          <BenefitsSection />
          <SectionDivider position="bottom" variant="purple-blue" height={100} />
        </div>
        
        {/* Features Section */}
        <div className="relative">
          <SectionDivider position="top" variant="purple-blue" height={100} className="opacity-70" />
          <FeaturesSection />
          <SectionDivider position="bottom" variant="blue-purple" height={100} />
        </div>
        
        {/* Tech Partners Section (white background) */}
        <div className="relative">
          <SectionDivider position="top" variant="blue-purple" height={100} className="opacity-70" />
          <TechPartnersSection />
          <SectionDivider position="bottom" variant="white-purple" height={100} />
        </div>
        
        {/* Subscription Plans Section */}
        <div className="relative">
          <SectionDivider position="top" variant="white-purple" height={100} className="opacity-70" />
          <SubscriptionPlansSection />
          <SectionDivider position="bottom" variant="purple-indigo" height={100} />
        </div>
        
        {/* Testimonials Section */}
        <div className="relative">
          <SectionDivider position="top" variant="purple-indigo" height={100} className="opacity-70" />
          <TestimonialsSection />
          <SectionDivider position="bottom" variant="indigo-purple" height={100} className="opacity-70" />
        </div>
        
        <Footer />
      </div>
    </div>
  );
};

export default LandingPage;
