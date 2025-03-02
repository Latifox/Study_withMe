
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Clock, Rocket, Crown, Check, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

const SubscriptionPlansSection = () => {
  const navigate = useNavigate();

  const handleSignUp = () => navigate("/auth?tab=register");

  const plans = [
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
      icon: Clock,
      color: "from-blue-400 to-cyan-300",
      accent: "border-blue-200",
      buttonVariant: "outline" as const,
      popular: false,
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
      icon: Rocket,
      color: "from-purple-500 to-indigo-500",
      accent: "border-purple-300",
      buttonVariant: "gradient" as const,
      popular: true,
    },
    {
      name: "Premium",
      price: "$9.99",
      period: "month",
      description: "Ultimate learning toolkit",
      features: [
        "Unlimited AI chat messages",
        "Custom learning pathways",
        "Advanced content analysis",
        "Comprehensive quiz system",
        "Enhanced flashcard system",
        "24/7 priority support",
        "Early access to new features",
      ],
      icon: Crown,
      color: "from-amber-500 to-pink-500",
      accent: "border-amber-300",
      buttonVariant: "default" as const,
      popular: false,
    },
  ];

  // Main container animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  // Individual card animations
  const cardVariants = {
    hidden: { 
      opacity: 0,
      y: 50,
      scale: 0.9,
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { 
        type: "spring",
        stiffness: 100,
        damping: 15,
        mass: 1,
      }
    },
    hover: { 
      y: -15,
      scale: 1.03,
      boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 15,
      }
    },
    tap: {
      scale: 0.98,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 15, 
      }
    }
  };

  // Feature items animation
  const featureVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1 + 0.2,
        duration: 0.5,
        ease: [0.25, 0.1, 0.25, 1],
      },
    }),
  };

  // Title animation
  const titleVariants = {
    hidden: { opacity: 0, y: -50 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 15,
      }
    }
  };

  // Pricing text animation
  const priceVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        delay: 0.4,
      }
    },
    hover: {
      scale: 1.1,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 10,
      }
    }
  };

  // Animation for the popular badge
  const badgeVariants = {
    hidden: { opacity: 0, scale: 0 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 300,
        delay: 0.6,
        damping: 12,
      }
    },
  };

  return (
    <section className="relative py-24 overflow-hidden bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-gradient-to-br from-blue-100/40 to-purple-100/40 dark:from-blue-900/10 dark:to-purple-900/10 rounded-full blur-3xl"></div>
        <div className="absolute top-[60%] -right-[5%] w-[35%] h-[35%] bg-gradient-to-br from-amber-100/40 to-pink-100/40 dark:from-amber-900/10 dark:to-pink-900/10 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Section Header */}
        <motion.div 
          className="max-w-3xl mx-auto text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={titleVariants}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Choose Your <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">Learning Plan</span>
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
            Unlock your full potential with our flexible subscription options designed for every learning journey
          </p>
        </motion.div>

        {/* Plans Grid */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              className={`relative ${plan.popular ? "md:-mt-4 md:mb-4" : ""}`}
              variants={cardVariants}
              whileHover="hover"
              whileTap="tap"
            >
              {/* Popular badge */}
              {plan.popular && (
                <motion.div 
                  className="absolute top-0 inset-x-0 -translate-y-1/2 flex justify-center"
                  variants={badgeVariants}
                >
                  <span className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1 rounded-full text-sm font-medium shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    MOST POPULAR
                  </span>
                </motion.div>
              )}

              <Card 
                className={`relative overflow-hidden h-full border-2 ${plan.accent} shadow-lg dark:bg-gray-800 ${plan.popular ? "ring-2 ring-purple-500/50 shadow-xl" : ""}`}
              >
                {/* Background gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-[0.03] dark:opacity-[0.07]`}></div>
                
                <CardHeader className="relative pb-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${plan.color} text-white shadow-md`}>
                        <plan.icon className="h-5 w-5" />
                      </div>
                      <h3 className="text-2xl font-bold">{plan.name}</h3>
                    </div>
                  </div>
                  
                  <motion.div 
                    className="mt-4 mb-1 flex items-end gap-1"
                    variants={priceVariants}
                    whileHover="hover"
                  >
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-gray-500 dark:text-gray-400 pb-1">/{plan.period}</span>
                  </motion.div>
                  
                  <p className="text-gray-600 dark:text-gray-300">{plan.description}</p>
                </CardHeader>
                
                <CardContent className="pt-6">
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, i) => (
                      <motion.li 
                        key={i} 
                        className="flex items-start"
                        custom={i}
                        variants={featureVariants}
                      >
                        <div className={`flex-shrink-0 mt-1 mr-3 p-0.5 rounded-full bg-gradient-to-br ${plan.color}`}>
                          <div className="bg-white dark:bg-gray-800 rounded-full p-0.5">
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          </div>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300 text-sm">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>
                
                <CardFooter className="pt-0">
                  <Button 
                    onClick={handleSignUp}
                    variant={plan.buttonVariant}
                    className={`w-full ${plan.buttonVariant === 'outline' ? `border-2 ${plan.accent} hover:bg-gray-50 dark:hover:bg-gray-700` : ''}`}
                  >
                    {plan.popular ? "Get Started" : "Choose Plan"}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </motion.div>
        
        {/* Satisfaction guarantee */}
        <motion.div 
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            transition: { delay: 1.2, duration: 0.5 }
          }}
        >
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            All plans include a 7-day free trial. No credit card required to start.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default SubscriptionPlansSection;
