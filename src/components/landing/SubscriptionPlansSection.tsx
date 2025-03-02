
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
      icon: <Clock className="h-7 w-7" />,
      color: "bg-gradient-to-br from-purple-200 to-indigo-100",
      textColor: "text-purple-900",
      iconColor: "text-purple-400",
      borderColor: "border-purple-200",
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
      icon: <Rocket className="h-7 w-7" />,
      color: "bg-gradient-to-br from-purple-500 to-indigo-400",
      textColor: "text-white",
      iconColor: "text-white",
      borderColor: "border-purple-400",
    },
    {
      name: "Premium",
      price: "$9.99",
      period: "month",
      description: "Ultimate learning toolkit",
      features: ["Unlimited access to all functionalities provided by EduSync AI"],
      ctaText: "Choose Plan",
      recommended: false,
      icon: <Crown className="h-7 w-7" />,
      color: "bg-gradient-to-br from-purple-800 to-indigo-700",
      textColor: "text-white",
      iconColor: "text-purple-300",
      borderColor: "border-purple-700",
    },
  ];

  // Animation variants for the framer-motion components
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
      {/* Bubble effects */}
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
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto"
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
            <Card className={`h-full flex flex-col shadow-lg border ${plan.borderColor} overflow-hidden`}>
              {plan.recommended && (
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-1.5 text-sm font-medium">
                  MOST POPULAR
                </div>
              )}
              <CardHeader className={`${plan.color} pb-8`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-full ${plan.recommended ? "bg-white/30" : "bg-white/60"} ${plan.iconColor}`}>
                    {plan.icon}
                  </div>
                  <h3 className={`text-2xl font-bold ${plan.textColor}`}>{plan.name}</h3>
                </div>
                <div className="mb-2 flex items-baseline">
                  <span className={`text-3xl font-bold ${plan.textColor}`}>{plan.price}</span>
                  <span className={`text-sm ml-1 ${plan.textColor} opacity-80`}>/{plan.period}</span>
                </div>
                <p className={`${plan.textColor} opacity-90`}>{plan.description}</p>
              </CardHeader>
              <CardContent className="bg-white flex-grow">
                <motion.ul 
                  className="space-y-3 mb-6"
                  variants={featuresVariants}
                >
                  {plan.features.map((feature, i) => (
                    <motion.li key={i} className="flex items-start" variants={featureItemVariants}>
                      <div className="text-purple-600 flex-shrink-0 mt-0.5 mr-2">
                        <Check className="h-5 w-5" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              </CardContent>
              <CardFooter className="bg-white pt-0 pb-6 px-6">
                <Button
                  className={`w-full ${
                    plan.recommended 
                      ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white" 
                      : "bg-white border-2 border-purple-500 text-purple-700 hover:bg-purple-50"
                  }`}
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
