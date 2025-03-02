import { Star, Flame } from "lucide-react";
import Bubbles from "./Bubbles";
const GamificationSection = () => {
  const gamificationElements = [{
    icon: <Star className="h-8 w-8 text-white" />,
    title: "Experience Points (XP)",
    description: "Earn XP as you complete learning activities. Track your progress and level up your knowledge.",
    gradient: "bg-gradient-to-r from-yellow-500 to-amber-600"
  }, {
    icon: <Flame className="h-8 w-8 text-white" />,
    title: "Learning Streaks",
    description: "Build and maintain daily learning streaks. Consistency is the key to mastery and retention.",
    gradient: "bg-gradient-to-r from-red-500 to-orange-500"
  }];
  return <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
      {/* Bubble effects */}
      <Bubbles position="left" tint="purple" />
      <Bubbles position="right" tint="indigo" />
      
      <div className="text-center mb-12 p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl bg-white/10 backdrop-blur-sm border-2 border-purple-40">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-yellow-500 via-amber-600 to-red-500 bg-clip-text text-transparent">
            Learn with Purpose
          </span>
        </h2>
        <p className="text-lg text-gray-700">
          Our gamified learning approach keeps you motivated and tracks your progress through your
          educational journey
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-20">
        {gamificationElements.map((element, index) => <div key={index} className={`${element.gradient} p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 max-w-xs mx-auto w-full`}>
            <div className="flex items-center justify-center mb-4">
              <div className="bg-white/20 p-3 rounded-full flex items-center justify-center shadow-lg">
                {element.icon}
              </div>
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">{element.title}</h3>
            <p className="text-white text-center text-sm">{element.description}</p>
          </div>)}
      </div>
    </div>;
};
export default GamificationSection;