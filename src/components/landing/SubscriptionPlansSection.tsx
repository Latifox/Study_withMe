
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";

const SubscriptionPlansSection = () => {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sectionRef, { once: false, margin: "-100px 0px" });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView) {
      setHasAnimated(true);
    } else {
      setHasAnimated(false);
    }
  }, [isInView]);

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
      index: 0,
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
      index: 1,
    },
    {
      name: "PREMIUM",
      price: "$9.99",
      period: "MONTH",
      features: ["Unlimited access to all functionalities provided by EduSync AI"],
      ctaText: "Choose Plan",
      color: "bg-gradient-to-b from-cyan-400 to-blue-500",
      circleBorderColor: "border-blue-300",
      index: 2,
    },
  ];

  const getCardPositions = (index: number) => {
    if (!hasAnimated) {
      // Stacked position (all cards in center, with only Standard visible)
      return {
        translateX: 0,
        translateY: index === 1 ? 0 : index === 0 ? -5 : 5, // Slight offset for stacking effect
        scale: index === 1 ? 1 : 0.9,
        zIndex: 3 - index,
        opacity: index === 1 ? 1 : 0.4,
      };
    } else {
      // Expanded position (cards side by side)
      return {
        translateX: index === 0 ? "-100%" : index === 2 ? "100%" : 0,
        translateY: index === 1 ? -20 : 0, // Elevate the center card slightly
        scale: index === 1 ? 1.1 : 1,
        zIndex: index === 1 ? 10 : 1,
        opacity: 1,
      };
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

  const transitionConfig = {
    type: "spring", 
    stiffness: 100, 
    damping: 15,
    mass: 1
  };

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 relative" ref={sectionRef}>
      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl mb-16 relative">
        <div className="absolute -inset-[2px] rounded-xl bg-gradient-to-r from-indigo-500 via-orange-500 to-cyan-500 -z-10"></div>
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-white">
          Choose Your Plan
        </h2>
        <p className="text-lg text-white text-center">
          Select the perfect subscription that fits your learning needs
        </p>
      </div>

      <div className="relative h-[750px] md:h-[600px] flex items-center justify-center">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto w-full">
          {subscriptionPlans.map((plan, index) => {
            const { translateX, translateY, scale, zIndex, opacity } = getCardPositions(index);
            
            return (
              <motion.div 
                key={index}
                className="md:col-span-1 flex"
                initial={false}
                animate={{
                  x: translateX,
                  y: translateY,
                  scale: scale,
                  zIndex: zIndex,
                  opacity: opacity
                }}
                transition={transitionConfig}
                style={{ 
                  position: 'absolute', 
                  width: 'calc(33.333% - 1rem)',
                  left: '33.333%',
                  right: '33.333%'
                }}
              >
                <Card className={`h-full w-full flex flex-col border-0 overflow-hidden rounded-3xl shadow-xl ${plan.color}`}>
                  <CardHeader className="pt-6 pb-2 px-6">
                    <div className="flex flex-col items-center">
                      <h3 className="text-xl font-bold text-white tracking-wider">{plan.name}</h3>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-grow px-6 pt-2 pb-4 flex flex-col">
                    <motion.ul 
                      className="space-y-2 mb-8"
                      variants={featuresVariants}
                      initial="hidden"
                      animate="visible"
                    >
                      {plan.features.map((feature, i) => (
                        <motion.li key={i} className="flex items-start" variants={featureItemVariants}>
                          <Check className="h-4 w-4 text-white mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-white text-sm">{feature}</span>
                        </motion.li>
                      ))}
                    </motion.ul>
                    
                    <div className="flex justify-center mt-auto">
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
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlansSection;
