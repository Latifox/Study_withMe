
import NavigationBar from "@/components/landing/NavigationBar";
import HeroSection from "@/components/landing/HeroSection";
import GamificationSection from "@/components/landing/GamificationSection";
import BenefitsSection from "@/components/landing/BenefitsSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import SubscriptionPlansSection from "@/components/landing/SubscriptionPlansSection";
import Footer from "@/components/landing/Footer";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <NavigationBar />
      <HeroSection />
      <GamificationSection />
      <BenefitsSection />
      <FeaturesSection />
      <SubscriptionPlansSection />
      <Footer />
    </div>
  );
};

export default LandingPage;
