
import { Card } from "@/components/ui/card";

interface KeyTopicsCardProps {
  topics: string[];
}

const KeyTopicsCard = ({ topics }: KeyTopicsCardProps) => {
  return (
    <Card className="relative overflow-hidden group hover:shadow-2xl transition-all duration-300 shadow-xl bg-white/90 backdrop-blur-lg border border-purple-200/50">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 to-indigo-50/30 opacity-70"></div>
      
      <div className="p-6 relative z-10">
        <h2 className="text-xl font-semibold mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Key Topics
        </h2>
        
        <div className="flex flex-wrap gap-2.5">
          {topics?.map((topic, index) => (
            <span
              key={index}
              className="px-3.5 py-1.5 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 rounded-full text-sm backdrop-blur-xl border border-purple-200/60 hover:bg-purple-200 transition-all duration-300 hover:shadow-md hover:scale-105 cursor-default"
            >
              {topic}
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
};

export default KeyTopicsCard;
