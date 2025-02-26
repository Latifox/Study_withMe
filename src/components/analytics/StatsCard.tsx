
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
}

const StatsCard = ({ title, value, icon: Icon, gradientFrom, gradientTo }: StatsCardProps) => {
  return (
    <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <CardContent className={`pt-6 rounded-lg bg-gradient-to-br from-${gradientFrom}/90 to-${gradientTo}/90 hover:from-${gradientFrom} hover:to-${gradientTo} transition-colors relative group`}>
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
            <Icon 
              className="w-6 h-6 text-white" 
              strokeWidth={2}
              style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.3))' }}
            />
          </div>
          <div>
            <p className="text-lg font-semibold text-white/90">{title}</p>
            <p className="text-3xl font-bold text-white drop-shadow-md">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
