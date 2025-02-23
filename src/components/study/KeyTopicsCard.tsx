
import { Card } from "@/components/ui/card";

interface KeyTopicsCardProps {
  topics: string[];
}

const KeyTopicsCard = ({ topics }: KeyTopicsCardProps) => {
  return (
    <Card className="group hover:shadow-2xl transition-all duration-300 bg-white/10 backdrop-blur-md border-white/20">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-3 text-white">Key Topics</h2>
        <div className="flex flex-wrap gap-2">
          {topics?.map((topic, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-white/10 text-white/90 rounded-full text-sm backdrop-blur-xl border border-white/20"
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
