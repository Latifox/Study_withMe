
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, value, change }) => {
  const isPositive = change.startsWith('+');
  
  return (
    <Card className="bg-white/10 backdrop-blur-md border-white/20 transition-all duration-200 hover:bg-white/15">
      <CardContent className="p-6">
        <h3 className="text-white/80 font-medium text-sm mb-1">{title}</h3>
        <div className="flex items-end justify-between">
          <p className="text-white text-2xl font-bold">{value}</p>
          <div className={`flex items-center text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? (
              <ArrowUpIcon className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDownIcon className="h-3 w-3 mr-1" />
            )}
            {change}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
