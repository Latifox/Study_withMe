
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Clock, Rocket, Crown, Check } from "lucide-react";
import Bubbles from "./Bubbles";

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
      color: "bg-white",
      textColor: "text-purple-900",
      iconColor: "text-purple-400",
      headerBg: "bg-gradient-to-b from-purple-100 via-purple-50/70 to-white",
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
      color: "bg-white",
      textColor: "text-purple-900",
      iconColor: "text-purple-600",
      headerBg: "bg-gradient-to-b from-purple-300 via-purple-200/80 to-white",
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
      color: "bg-white",
      textColor: "text-purple-900",
      iconColor: "text-purple-300",
      headerBg: "bg-gradient-to-b from-purple-700 via-purple-500/80 to-white",
    },
  ];

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
        {subscriptionPlans.map((plan, index) => (
          <div key={index} className={`${plan.recommended ? "md:transform md:scale-105" : ""}`}>
            <Card className="overflow-hidden h-full flex flex-col shadow-lg transition-all duration-300 hover:shadow-xl border-0">
              {plan.recommended && (
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-center py-1.5 text-sm font-medium">
                  MOST POPULAR
                </div>
              )}
              <CardHeader className={`${plan.headerBg} pb-8`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-2 rounded-full bg-white/30 ${plan.iconColor}`}>{plan.icon}</div>
                  <h3 className={`text-2xl font-bold ${plan.textColor}`}>{plan.name}</h3>
                </div>
                <div className="mb-2">
                  <span className={`text-3xl font-bold ${plan.textColor}`}>{plan.price}</span>
                  <span className={`text-sm ml-1 ${plan.textColor} opacity-80`}>/{plan.period}</span>
                </div>
                <p className={`${plan.textColor} opacity-90`}>{plan.description}</p>
              </CardHeader>
              <CardContent className="bg-white flex-grow">
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <div className="text-purple-600 flex-shrink-0 mt-0.5 mr-2">
                        <Check className="h-5 w-5" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="bg-white pt-0 pb-6 px-6">
                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
                  onClick={() => (plan.recommended ? handleSignUp() : navigate("/auth"))}
                >
                  {plan.ctaText}
                </Button>
              </CardFooter>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPlansSection;
