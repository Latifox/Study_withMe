
import React from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ResponsiveContainer } from "recharts";
import { format, parse } from "date-fns";

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
  // Transform data into scatter plot format (x: week, y: day)
  const transformData = () => {
    return data.map((item) => {
      const date = new Date(item.date);
      return {
        x: parseInt(format(date, 'w')), // Week number
        y: (date.getDay() + 6) % 7, // Shift days to start from Monday (0) to Sunday (6)
        z: item.score,
        date: date
      };
    });
  };

  // Calculate min and max scores for color scaling
  const allScores = data.map(d => d.score);
  const minScore = Math.min(...allScores);
  const maxScore = Math.max(...allScores);

  // Normalize score between 0 and 1
  const normalizeScore = (score: number) => {
    if (maxScore === minScore) return 0;
    return (score - minScore) / (maxScore - minScore);
  };

  // Get color based on score
  const getColor = (score: number) => {
    const normalized = normalizeScore(score);
    return `rgba(168, 85, 247, ${0.2 + normalized * 0.8})`; // Purple with opacity based on score
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2">
          <p className="text-white text-sm">{format(data.date, 'MMM d, yyyy')}</p>
          <p className="text-white text-sm">Score: {data.z}</p>
        </div>
      );
    }
    return null;
  };

  // Custom shape for scatter points (square cells)
  const CustomCell = (props: any) => {
    const { cx, cy, z } = props;
    return (
      <rect
        x={cx - 10}
        y={cy - 10}
        width={20}
        height={20}
        fill={z === 0 ? 'rgba(255, 255, 255, 0.05)' : getColor(z)}
        className="transition-all duration-300 hover:opacity-80"
        rx={2}
      />
    );
  };

  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
        >
          <XAxis
            type="number"
            dataKey="x"
            domain={[1, 52]}
            tickFormatter={(week) => {
              // Convert week number to date and format as month
              const date = parse(week.toString(), 'w', new Date());
              return format(date, 'MMM');
            }}
            interval={4}
            tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}
          />
          <YAxis
            type="number"
            dataKey="y"
            domain={[0, 6]}
            tickFormatter={(day) => weekDays[day]}
            tick={{ fill: 'rgba(255, 255, 255, 0.4)', fontSize: 12 }}
            reverse
          />
          <ZAxis type="number" dataKey="z" range={[100, 100]} />
          <Tooltip content={<CustomTooltip />} />
          <Scatter
            data={transformData()}
            shape={<CustomCell />}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ActivityHeatmap;
