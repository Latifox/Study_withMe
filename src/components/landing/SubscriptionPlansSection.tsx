
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Check } from "lucide-react";
import { motion } from "framer-motion";

const SubscriptionPlansSection = () => {
  const navigate = useNavigate();

  const handleSignUp = () => navigate("/auth?tab=register");

  const subscriptionPlans = [
    {
      name: "BASIC PACK",
      price: "$0",
      period: "FOREVER",
      features: [
        "5 AI chat messages per day",
        "Basic study plans",
        "Limited highlights & summaries",
        "Standard quiz generation",
        "Basic flashcards",
      ],
      ctaText: "Get Started",
      color: "bg-gradient-to-b from-purple-400 to-indigo-500",
      circleBorderColor: "border-indigo-300",
      checkColor: "text-indigo-400",
    },
    {
      name: "STANDARD",
      price: "$4.99",
      period: "MONTH",
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
      color: "bg-gradient-to-b from-orange-400 to-red-500",
      circleBorderColor: "border-orange-400",
      checkColor: "text-orange-400",
    },
    {
      name: "PREMIUM",
      price: "$9.99",
      period: "MONTH",
      features: ["Unlimited access to all functionalities provided by EduSync AI"],
      ctaText: "Choose Plan",
      color: "bg-gradient-to-b from-cyan-400 to-blue-500",
      circleBorderColor: "border-blue-300",
      checkColor: "text-blue-400",
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
      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl mb-16 relative">
        <div className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-indigo-500 via-orange-500 to-cyan-500 -z-10"></div>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-white">
          Choose Your Plan
        </h2>
        <p className="text-lg text-white text-center">
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
            className={`${plan.recommended ? "md:transform md:-my-4 md:scale-110 z-10" : ""}`}
            variants={cardVariants}
            whileHover="hover"
          >
            <Card className={`h-full flex flex-col border-0 overflow-hidden rounded-3xl shadow-xl ${plan.color}`}>
              <CardHeader className="pt-6 pb-2 px-6">
                <div className="flex flex-col items-center">
                  <h3 className="text-xl font-bold text-white tracking-wider">{plan.name}</h3>
                </div>
              </CardHeader>
              
              <CardContent className="flex-grow px-6 pt-2 pb-4">
                <motion.ul 
                  className="space-y-2 mb-8"
                  variants={featuresVariants}
                >
                  {plan.features.map((feature, i) => (
                    <motion.li key={i} className="flex items-start" variants={featureItemVariants}>
                      <Check className={`h-4 w-4 ${plan.checkColor} mr-2 mt-0.5 flex-shrink-0`} />
                      <span className="text-white text-sm">{feature}</span>
                    </motion.li>
                  ))}
                </motion.ul>
                
                <div className="flex justify-center mt-auto mb-6">
                  <div className="bg-gray-900 text-white rounded-full p-4 flex flex-col items-center justify-center w-32 h-32 border-4 border-white/20">
                    <div className="text-3xl font-bold">{plan.price}</div>
                    <div className="text-xs font-medium mt-1">{plan.period}</div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="pt-0 pb-6 px-6">
                <Button
                  className="w-full bg-white hover:bg-gray-100 text-gray-800 border-0 rounded-full py-5 font-medium"
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
