
import { Card } from "@/components/ui/card";

interface KeyTopicsCardProps {
  topics: string[];
}

const KeyTopicsCard = ({ topics }: KeyTopicsCardProps) => {
  return (
    <Card className="relative group hover:shadow-2xl transition-all duration-300 shadow-xl bg-white/80 backdrop-blur-md border-purple-200">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-3 text-purple-800">Key Topics</h2>
        <div className="flex flex-wrap gap-2">
          {topics?.map((topic, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm backdrop-blur-xl border border-purple-200 hover:bg-purple-200 transition-colors"
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
