
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Clock, Rocket, Crown, Check, Sparkles } from "lucide-react";
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
      color: "bg-gradient-to-br from-purple-100 to-indigo-100",
      accentColor: "from-purple-400 to-indigo-300",
      darkAccent: "from-purple-600 to-indigo-500",
      textColor: "text-gray-800",
      iconColor: "text-purple-500",
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
      color: "bg-gradient-to-br from-violet-500 to-purple-600",
      accentColor: "from-pink-400 to-purple-500",
      darkAccent: "from-pink-600 to-purple-700",
      textColor: "text-white",
      iconColor: "text-white",
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
      color: "bg-gradient-to-br from-indigo-900 to-purple-900",
      accentColor: "from-indigo-600 to-purple-700",
      darkAccent: "from-indigo-800 to-purple-900",
      textColor: "text-white",
      iconColor: "text-yellow-400",
    },
  ];

  // Animation variants for cards
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        delayChildren: 0.2,
      },
    },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 50, rotateY: -15 },
    visible: { 
      opacity: 1, 
      y: 0,
      rotateY: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 12,
        duration: 0.6,
      }
    },
    hover: { 
      y: -12,
      scale: 1.03,
      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.2)",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 15,
      }
    }
  };

  const featuresContainerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3
      }
    }
  };

  const featureItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10
      }
    }
  };

  const buttonVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.05,
      transition: {
        type: "spring",
        stiffness: 400,
        damping: 10
      }
    },
    tap: { scale: 0.98 }
  };

  const titleVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 10,
        delay: 0.1
      }
    }
  };

  const priceVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 150,
        damping: 12,
        delay: 0.2
      }
    }
  };
  
  const badgeVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: { 
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 12,
        delay: 0.5
      }
    },
    pulse: {
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse"
      }
    }
  };

  const floatingIconsVariants = {
    animate: {
      y: [0, -10, 0],
      opacity: [0.7, 1, 0.7],
      transition: {
        duration: 3,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 relative overflow-hidden">
      {/* Background elements */}
      <Bubbles position="left" tint="purple" />
      <Bubbles position="right" tint="indigo" />
      
      {/* Decorative floating elements */}
      <motion.div 
        className="absolute left-[10%] top-[20%] opacity-70"
        variants={floatingIconsVariants}
        animate="animate"
        custom={0}
      >
        <div className="bg-gradient-to-br from-purple-300 to-indigo-300 p-3 rounded-xl rotate-12">
          <Check className="h-6 w-6 text-white" />
        </div>
      </motion.div>
      
      <motion.div 
        className="absolute right-[15%] top-[15%] opacity-70"
        variants={floatingIconsVariants}
        animate="animate"
        custom={1}
      >
        <div className="bg-gradient-to-br from-indigo-400 to-purple-400 p-2 rounded-lg -rotate-12">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
      </motion.div>
      
      <motion.div 
        className="absolute left-[20%] bottom-[15%] opacity-70"
        variants={floatingIconsVariants}
        animate="animate"
        custom={2}
      >
        <div className="bg-gradient-to-br from-pink-400 to-purple-400 p-2 rounded-full">
          <Clock className="h-5 w-5 text-white" />
        </div>
      </motion.div>
      
      <motion.div 
        className="absolute right-[25%] bottom-[25%] opacity-70"
        variants={floatingIconsVariants}
        animate="animate" 
        custom={3}
      >
        <div className="bg-gradient-to-br from-purple-500 to-indigo-500 p-3 rounded-xl rotate-12">
          <Crown className="h-5 w-5 text-yellow-300" />
        </div>
      </motion.div>

      {/* Section header with animations */}
      <motion.div 
        className="relative bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl border border-purple-200/40 mb-16 max-w-3xl mx-auto overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        {/* Background gradient blobs */}
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-purple-200 rounded-full mix-blend-multiply opacity-70 blur-xl"></div>
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-200 rounded-full mix-blend-multiply opacity-70 blur-xl"></div>
        
        <motion.h2 
          className="text-3xl md:text-4xl font-bold text-center mb-4 relative z-10"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Choose Your Plan
          </span>
        </motion.h2>
        
        <motion.p 
          className="text-lg text-gray-700 text-center relative z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          Select the perfect subscription that fits your learning needs
        </motion.p>
      </motion.div>

      {/* Subscription cards with staggered animations */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {subscriptionPlans.map((plan, index) => (
          <motion.div 
            key={index}
            className={`${plan.recommended ? "md:transform md:scale-105 z-20" : "z-10"}`}
            variants={cardVariants}
            whileHover="hover"
          >
            <Card className="h-full flex flex-col shadow-xl border-0 rounded-2xl overflow-hidden transform perspective-1000">
              {/* Popular badge */}
              {plan.recommended && (
                <motion.div 
                  className="absolute top-0 right-0 m-4 z-20"
                  variants={badgeVariants}
                  initial="hidden"
                  animate={["visible", "pulse"]}
                >
                  <div className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span className="text-xs font-bold">POPULAR</span>
                  </div>
                </motion.div>
              )}

              {/* Header with gradient background */}
              <CardHeader className={`relative p-8 ${plan.color}`}>
                {/* Background patterns */}
                <div className="absolute inset-0 opacity-10">
                  <svg width="100%" height="100%">
                    <pattern id={`grid-${index}`} width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" />
                    </pattern>
                    <rect width="100%" height="100%" fill={`url(#grid-${index})`} />
                  </svg>
                </div>
                
                {/* Decorative gradient circle */}
                <div className={`absolute -right-12 -top-12 w-40 h-40 bg-gradient-to-br ${plan.accentColor} rounded-full opacity-30 blur-xl`}></div>
                <div className={`absolute -left-12 -bottom-12 w-32 h-32 bg-gradient-to-tr ${plan.darkAccent} rounded-full opacity-20 blur-xl`}></div>

                {/* Plan icon and name */}
                <motion.div 
                  className="relative flex items-center mb-4"
                  variants={titleVariants}
                >
                  <div className={`p-3 mr-3 rounded-xl bg-white/20 backdrop-blur-sm ${plan.iconColor}`}>
                    {plan.icon}
                  </div>
                  <h3 className={`text-2xl font-bold ${plan.textColor}`}>{plan.name}</h3>
                </motion.div>

                {/* Price display with animation */}
                <motion.div 
                  className="relative mb-3"
                  variants={priceVariants}
                >
                  <div className="flex items-baseline">
                    <span className={`text-4xl font-extrabold ${plan.textColor}`}>{plan.price}</span>
                    <span className={`ml-1.5 ${plan.textColor} opacity-80`}>/{plan.period}</span>
                  </div>
                  <p className={`mt-1 ${plan.textColor} opacity-90 text-sm`}>{plan.description}</p>
                </motion.div>
              </CardHeader>

              {/* Plan features */}
              <CardContent className="flex-grow pt-6 pb-4 px-8 bg-white">
                <motion.ul 
                  className="space-y-4"
                  variants={featuresContainerVariants}
                >
                  {plan.features.map((feature, i) => (
                    <motion.li 
                      key={i} 
                      className="flex items-start" 
                      variants={featureItemVariants}
                    >
                      <div className="flex-shrink-0 mt-1 mr-3">
                        <Check className="h-5 w-5 text-purple-500" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </motion.li>
                  ))}
                </motion.ul>
              </CardContent>

              {/* Call to action button */}
              <CardFooter className="pt-2 pb-8 px-8 bg-white">
                <motion.div 
                  className="w-full"
                  variants={buttonVariants}
                  initial="initial"
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button
                    className={`w-full ${
                      plan.recommended 
                        ? "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-500/20" 
                        : "bg-white border-2 border-purple-500 text-purple-700 hover:bg-purple-50"
                    } py-6 rounded-xl text-base`}
                    onClick={() => plan.recommended ? handleSignUp() : navigate("/auth")}
                  >
                    {plan.ctaText}
                  </Button>
                </motion.div>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default SubscriptionPlansSection;
