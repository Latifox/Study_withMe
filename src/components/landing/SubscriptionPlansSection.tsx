
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Clock, Rocket, Crown, Check } from "lucide-react";
import Bubbles from "./Bubbles";
import { motion } from "framer-motion";

const SubscriptionPlansSection = () => {
  const navigate = useNavigate();

  const handleSignUp = () => navigate("/auth?tab=register");

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
        "Basic flashcards",
      ],
      ctaText: "Get Started Now",
      recommended: false,
      icon: <Clock className="h-8 w-8" />,
      color: "bg-gradient-to-br from-red-400 to-red-500",
      textColor: "text-white",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      borderColor: "border-red-400",
      shadowColor: "shadow-red-300/30",
      hoverShadow: "hover:shadow-red-400/40",
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
        "Priority support",
      ],
      ctaText: "Choose Plan",
      recommended: true,
      icon: <Rocket className="h-8 w-8" />,
      color: "bg-gradient-to-br from-blue-400 to-blue-500",
      textColor: "text-white",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      borderColor: "border-blue-400",
      shadowColor: "shadow-blue-300/40",
      hoverShadow: "hover:shadow-blue-500/50",
    },
    {
      name: "Premium",
      price: "$9.99",
      period: "month",
      description: "Ultimate learning toolkit",
      features: ["Unlimited access to all functionalities provided by EduSync AI"],
      ctaText: "Choose Plan",
      recommended: false,
      icon: <Crown className="h-8 w-8" />,
      color: "bg-gradient-to-br from-purple-500 to-purple-600",
      textColor: "text-white",
      iconBg: "bg-white/20",
      iconColor: "text-white",
      borderColor: "border-purple-500",
      shadowColor: "shadow-purple-400/40",
      hoverShadow: "hover:shadow-purple-600/50",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.5, 
        ease: "easeOut"
      }
    },
    hover: { 
      y: -8,
      boxShadow: "0 10px 25px rgba(124, 58, 237, 0.3)",
      transition: {
        duration: 0.3,
        ease: "easeOut"
      }
    }
  };

  const featuresVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const featureItemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  };

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 relative">
      <Bubbles position="left" tint="purple" />
      <Bubbles position="right" tint="indigo" />
      
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

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {subscriptionPlans.map((plan, index) => (
          <motion.div 
            key={index} 
            className={`${plan.recommended ? "md:transform md:scale-105 z-10" : ""}`}
            variants={cardVariants}
            whileHover="hover"
          >
            <Card className={`h-full flex flex-col border-0 overflow-hidden ${plan.shadowColor} shadow-xl transition-all duration-300 ${plan.hoverShadow} rounded-3xl`}>
              {plan.recommended && (
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-1.5 text-sm font-medium">
                  MOST POPULAR
                </div>
              )}
              <CardHeader className={`${plan.color} py-8 px-8`}>
                <div className="flex flex-col items-center">
                  <div className={`${plan.iconBg} rounded-full p-4 mb-4`}>
                    {plan.icon}
                  </div>
                  <h3 className={`text-2xl font-bold uppercase tracking-wider ${plan.textColor} mb-2`}>{plan.name}</h3>
                  <p className={`${plan.textColor} opacity-90 text-sm mb-4 text-center`}>{plan.description}</p>
                  <div className={`h-px w-3/4 bg-white/20 mb-4`}></div>
                  <div className="flex items-baseline">
                    <span className={`text-5xl font-bold ${plan.textColor}`}>{plan.price}</span>
                    <span className={`text-sm ml-1 ${plan.textColor} opacity-80`}>/{plan.period}</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className={`${plan.color} flex-grow px-8 pt-6 pb-4`}>
                <motion.ul 
                  className="space-y-3"
                  variants={featuresVariants}
                >
                  {plan.features.map((feature, i) => (
                    <motion.li key={i} className="flex items-start" variants={featureItemVariants}>
                      <div className={`${plan.iconBg} rounded-full p-1 flex-shrink-0 mt-0.5 mr-2`}>
                        <Check className="h-3.5 w-3.5 text-white" />
                      </div>
                      <span className="text-white text-sm">{feature}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              </CardContent>
              <CardFooter className={`${plan.color} pt-0 pb-8 px-8`}>
                <Button
                  className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-0 rounded-full py-6"
                  onClick={() => (plan.recommended ? handleSignUp() : navigate("/auth"))}
                >
                  {plan.ctaText}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default SubscriptionPlansSection;
