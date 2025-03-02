
import { Star, Flame } from "lucide-react";
import Bubbles from "./Bubbles";

const GamificationSection = () => {
  const gamificationElements = [{
    icon: <Star className="h-8 w-8 text-white" />,
    title: "Experience Points (XP)",
    description: "Earn XP as you complete learning activities. Track your progress and level up your knowledge.",
    gradient: "bg-gradient-to-r from-yellow-500 to-amber-600",
    bubbleTint: "yellow", // Adding tint for XP card
    glowColor: "rgba(255, 215, 0, 0.6)" // Brighter yellow glow color with higher opacity
  }, {
    icon: <Flame className="h-8 w-8 text-white" />,
    title: "Learning Streaks",
    description: "Build and maintain daily learning streaks. Consistency is the key to mastery and retention.",
    gradient: "bg-gradient-to-r from-red-500 to-orange-500",
    bubbleTint: "red", // Adding tint for Learning Streaks card
    glowColor: "rgba(255, 69, 0, 0.6)" // Brighter orange-red glow color with higher opacity
  }];
  
  return <div className="container mx-auto px-4 py-16 md:py-24 relative z-10">
      {/* Bubble effects - Update tints to match the cards */}
      <Bubbles position="left" tint={gamificationElements[0].bubbleTint} />
      <Bubbles position="right" tint={gamificationElements[1].bubbleTint} />
      
      <div 
        className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl mb-12 relative z-10 border-2 rounded-xl"
        style={{ 
          borderImage: 'linear-gradient(to bottom, #FFC107, #FF9800) 1',
          borderStyle: 'solid'
        }}
      >
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Learn with{" "}
          <span className="bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">
            Purpose
          </span>
        </h2>
        <p className="text-lg text-gray-700 text-center">
          Our gamified learning approach keeps you motivated and tracks your progress through your
          educational journey
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 relative z-20">
        {gamificationElements.map((element, index) => (
          <div key={index} className="relative">
            {/* Enhanced energy radiation effect for each card */}
            <div 
              className="absolute inset-0 rounded-xl animate-energy" 
              style={{
                background: `radial-gradient(circle at center, ${element.glowColor} 0%, transparent 80%)`,
                filter: 'blur(20px)',
                transform: 'scale(1.3)',
                opacity: 0.85
              }}
            />
            
            <div className={`${element.gradient} p-6 rounded-xl shadow-lg transform transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:-translate-y-1 max-w-xs mx-auto w-full relative z-10`}>
              <div className="flex items-center justify-center mb-4">
                <div className="bg-white/20 p-3 rounded-full flex items-center justify-center shadow-lg">
                  {element.icon}
                </div>
              </div>
              <h3 className="text-xl font-bold text-white text-center mb-2">{element.title}</h3>
              <p className="text-white text-center text-sm">{element.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>;
};

export default GamificationSection;
