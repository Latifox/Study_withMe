
import { Star, Flame } from "lucide-react";

const GamificationSection = () => {
  const gamificationElements = [
    {
      icon: <Star className="h-10 w-10 text-white" />,
      title: "Experience Points (XP)",
      description:
        "Earn XP as you complete learning activities. Track your progress and level up your knowledge.",
      color: "bg-yellow-400",
      textColor: "text-yellow-900",
      gradientText: "bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent",
    },
    {
      icon: <Flame className="h-10 w-10 text-white" />,
      title: "Learning Streaks",
      description: "Build and maintain daily learning streaks. Consistency is the key to mastery and retention.",
      color: "bg-red-500",
      textColor: "text-red-900",
      gradientText: "bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
      <div className="text-center mb-12 bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl border-2 border-purple-300">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            Learn with Purpose
          </span>
        </h2>
        <p className="text-lg text-gray-700">
          Our gamified learning approach keeps you motivated and tracks your progress through your
          educational journey
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-20">
        {gamificationElements.map((element, index) => (
          <div
            key={index}
            className="bg-white/50 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-white/20 transform transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-1"
          >
            <div className="flex items-center justify-center mb-6">
              <div className={`${element.color} p-4 rounded-full flex items-center justify-center shadow-lg mr-0`}>
                {element.icon}
              </div>
            </div>
            <p className={`font-bold ${element.gradientText} text-center`}>{element.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GamificationSection;
