
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { ActivityData, transformDataForChart, getMonthLabelPositions, createChartData, createChartOptions } from './HeatmapUtils';
import { createMonthLabelsPlugin, createDayLabelsPlugin } from './ChartPlugins';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
);

interface ActivityHeatmapProps {
  data: ActivityData[];
}

const ActivityHeatmap = ({ data }: ActivityHeatmapProps) => {
  // Transform the data for the chart
  const transformedData = transformDataForChart(data);
  
  // Calculate month positions for labels
  const monthPositions = getMonthLabelPositions();
  
  // Create chart data
  const chartData = createChartData(transformedData);
  
  // Create chart options - ensure we're hiding default y-axis tick labels
  const options = createChartOptions();
  
  // Create plugins for custom rendering
  const monthLabelsPlugin = createMonthLabelsPlugin(monthPositions);
  const dayLabelsPlugin = createDayLabelsPlugin();

  return (
    <div className="w-full h-[300px] p-4 rounded-lg bg-background/5">
      <Scatter 
        data={chartData} 
        options={options} 
        plugins={[monthLabelsPlugin, dayLabelsPlugin]} 
      />
    </div>
  );
};

export default ActivityHeatmap;
