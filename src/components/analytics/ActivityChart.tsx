
import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ActivityChartProps {
  data: Array<{
    date: string;
    cumulative: number;
  }>;
}

const ActivityChart = ({ data }: ActivityChartProps) => {
  return (
    <div className="h-[400px] rounded-lg p-4 bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="date" stroke="#fff" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#fff" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{
              backgroundColor: "rgba(255,255,255,0.1)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: "8px",
              color: "white"
            }} 
            labelStyle={{ color: "white" }}
            itemStyle={{ color: "white" }}
          />
          <Line 
            type="monotone" 
            dataKey="cumulative" 
            stroke="#ffffff" 
            strokeWidth={4}
            dot={false}
            activeDot={{
              r: 8,
              style: { fill: "#ffffff", stroke: "white", strokeWidth: 2 }
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ActivityChart;
