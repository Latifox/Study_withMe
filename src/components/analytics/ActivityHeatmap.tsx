
import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface ActivityHeatmapProps {
  data: Array<{
    date: Date;
    score: number;
  }>;
  weekDays: string[];
  months: string[];
  getHeatmapColor: (score: number) => string;
}

const ActivityHeatmap = ({ data, weekDays, months }: ActivityHeatmapProps) => {
  // Transform data into the format needed for the BarChart
  const transformDataForChart = () => {
    const weekMap = new Map();
    
    data.forEach((day) => {
      const weekNumber = format(day.date, 'w');
      if (!weekMap.has(weekNumber)) {
        weekMap.set(weekNumber, {
          week: weekNumber,
          Sun: 0,
          Mon: 0,
          Tue: 0,
          Wed: 0,
          Thu: 0,
          Fri: 0,
          Sat: 0
        });
      }
      const dayName = format(day.date, 'E');
      weekMap.get(weekNumber)[dayName] = day.score;
    });

    return Array.from(weekMap.values());
  };

  const chartData = transformDataForChart();

  // Calculate min and max scores for normalization
  const allScores = data.map(d => d.score);
  const minScore = Math.min(...allScores);
  const maxScore = Math.max(...allScores);

  // Normalize scores (0 to 1)
  const normalizeScore = (score: number) => {
    if (maxScore === minScore) return 0;
    return (score - minScore) / (maxScore - minScore);
  };

  // Custom tooltip to show the exact score
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2">
          <p className="text-white text-sm">Score: {payload[0].value}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
          layout="vertical"
          barGap={1}
          barCategoryGap={1}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis type="number" hide />
          <YAxis
            dataKey="week"
            type="category"
            tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          {weekDays.map((day) => (
            <Bar
              key={day}
              dataKey={day}
              fill="url(#colorGradient)"
              radius={[2, 2, 2, 2]}
              stackId="stack"
            >
              {chartData.map((entry, index) => (
                <rect
                  key={`cell-${index}`}
                  fill={entry[day] === 0 ? 'rgba(255, 255, 255, 0.05)' : `rgba(168, 85, 247, ${0.2 + normalizeScore(entry[day]) * 0.8})`}
                  className="transition-all duration-300 hover:opacity-80"
                />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ActivityHeatmap;
