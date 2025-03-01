
import { GraduationCap, School } from "lucide-react";

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
    <div className="container mx-auto px-4 py-8 md:py-12">
      <div className="bg-white/10 backdrop-blur-sm p-6 rounded-xl shadow-xl hover:shadow-2xl transition-shadow mx-auto max-w-3xl mb-12 border-2 border-purple-400">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
          Who Benefits from{" "}
          <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            EduSync AI
          </span>
        </h2>
        <p className="text-lg text-gray-700 text-center">
          Our platform serves both students and educators with specialized tools and features
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-16">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-purple-100 transform transition-all hover:scale-105">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
              <GraduationCap className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              For Students
            </h3>
          </div>
          <ul className="space-y-3">
            {studentBenefits.map((benefit, index) => (
              <li key={index} className="flex items-start">
                <div className="mt-1 min-w-6 min-h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                </div>
                <span className="text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-xl shadow-lg border border-purple-100 transform transition-all hover:scale-105">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
              <School className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              For Teachers
            </h3>
          </div>
          <ul className="space-y-3">
            {teacherBenefits.map((benefit, index) => (
              <li key={index} className="flex items-start">
                <div className="mt-1 min-w-6 min-h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                </div>
                <span className="text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BenefitsSection;
