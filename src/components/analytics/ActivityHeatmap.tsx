
import React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ActivityHeatmapProps {
  data: Array<{
    date: Date;
    score: number;
  }>;
  getHeatmapColor: (score: number) => string;
  weekDays: string[];
  months: string[];
}

const ActivityHeatmap = ({ data, getHeatmapColor, weekDays, months }: ActivityHeatmapProps) => {
  return (
    <div className="p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
      <div className="flex gap-4">
        {/* Week days labels */}
        <div className="flex flex-col justify-between text-xs text-white/40">
          {weekDays.map(day => (
            <div key={day} className="h-[14px]">{day}</div>
          ))}
        </div>
        
        {/* Main heatmap container */}
        <div className="flex-1 overflow-x-auto">
          <div className="relative min-w-[750px]">
            {/* Heatmap grid */}
            <div className="grid grid-cols-52 grid-rows-7 auto-rows-fr gap-[2px]" style={{ aspectRatio: '4/1' }}>
              {data.map((day, index) => (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div 
                        className={cn(
                          "w-full pb-[100%] relative rounded-sm cursor-pointer transition-all duration-300 hover:scale-125 hover:z-10",
                          getHeatmapColor(day.score),
                          "border border-white/10"
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">
                        {format(day.date, 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {day.score} XP earned
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
            </div>

            {/* Months labels */}
            <div className="absolute -bottom-6 left-0 right-0 flex justify-between text-xs text-white/40">
              {months.map(month => (
                <div key={month}>{month}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityHeatmap;

