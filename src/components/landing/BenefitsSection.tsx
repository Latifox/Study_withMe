import { GraduationCap, School } from "lucide-react";
import Bubbles from "./Bubbles";

const BenefitsSection = () => {
  const studentBenefits = [
    "Personalized study plans tailored to your learning style and pace",
    "Interactive content that makes complex concepts easier to understand",
    "AI-generated summaries and highlights to save study time",
    "Intelligent flashcards that adapt to your knowledge gaps",
    "24/7 AI tutor available to answer questions about course material",
    "Self-assessment quizzes that identify areas needing improvement",
    "Integrated resources to expand your knowledge beyond course material",
  ];

  const teacherBenefits = [
    "Automated content transformation from your lecture materials",
    "Detailed analytics on student engagement and performance",
    "Reduced workload with AI-generated quizzes and assessments",
    "Ability to customize learning paths for individual students or groups",
    "Insights into common student misunderstandings and knowledge gaps",
    "More time for meaningful student interactions and personalized support",
    "Easy integration with your existing course materials and teaching style",
  ];

  return (
    <div className="container mx-auto px-4 py-8 md:py-12 relative">
      {/* Bubble effects - Updated to blue on both sides */}
      <Bubbles position="left" tint="blue" />
      <Bubbles position="right" tint="blue" />
      
      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl mb-12 border-2 border-purple-400 relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Who Benefits from{" "}
          <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
            EduSync AI
          </span>
        </h2>
        <p className="text-lg text-gray-700 text-center">
          Our platform serves both students and educators with specialized tools and features
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16 relative z-20">
        <div className="flex justify-center relative">
          <div 
            className="absolute inset-0 rounded-xl animate-energy" 
            style={{
              background: 'radial-gradient(circle at center, rgba(96, 165, 250, 0.7) 0%, transparent 80%)',
              filter: 'blur(20px)',
              transform: 'scale(1.3)',
              opacity: 0.85
            }}
          />
          
          <div className="bg-gradient-to-b from-blue-400 to-blue-600 p-8 rounded-xl shadow-lg border border-blue-200 transform transition-all hover:scale-105 max-w-sm w-full relative z-10">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">
                For Students
              </h3>
            </div>
            <ul className="space-y-3">
              {studentBenefits.map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <div className="mt-1 min-w-6 min-h-6 bg-white/20 rounded-full flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-white">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-center relative">
          <div 
            className="absolute inset-0 rounded-xl animate-energy" 
            style={{
              background: 'radial-gradient(circle at center, rgba(96, 165, 250, 0.7) 0%, transparent 80%)',
              filter: 'blur(20px)',
              transform: 'scale(1.3)',
              opacity: 0.85
            }}
          />
          
          <div className="bg-gradient-to-b from-blue-400 to-blue-600 p-8 rounded-xl shadow-lg border border-blue-200 transform transition-all hover:scale-105 max-w-sm w-full relative z-10">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mr-4">
                <School className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-white">
                For Teachers
              </h3>
            </div>
            <ul className="space-y-3">
              {teacherBenefits.map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <div className="mt-1 min-w-6 min-h-6 bg-white/20 rounded-full flex items-center justify-center mr-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-white">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BenefitsSection;
