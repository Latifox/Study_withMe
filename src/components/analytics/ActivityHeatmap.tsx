
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
        <div className="flex flex-col justify-between py-1 text-xs text-white/40">
          {weekDays.map(day => (
            <div key={day} className="h-8 flex items-center">{day}</div>
          ))}
        </div>
        
        <div className="flex-1 relative">
          <div 
            className="grid gap-1" 
            style={{
              gridTemplateColumns: `repeat(52, minmax(10px, 1fr))`,
              gridTemplateRows: `repeat(7, 1fr)`,
              gridAutoFlow: 'column',
              height: '100%',
              minHeight: '150px'
            }}
          >
            {data.map((day, index) => (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={cn(
                        "w-full h-full rounded-sm cursor-pointer transition-all duration-300 hover:scale-125 hover:z-10",
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

          <div className="absolute -bottom-6 left-0 right-0 flex justify-between">
            {months.map((month) => (
              <div key={month} className="text-xs text-white/40">
                {month}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityHeatmap;

