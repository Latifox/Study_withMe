
import React from 'react';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
  ScatterController,
} from 'chart.js';
import 'chart.js/auto';
import { transformDataForChart, createChartData, createChartOptions, getMonthLabelPositions } from './HeatmapUtils';
import { createMonthLabelsPlugin, createDayLabelsPlugin } from './ChartPlugins';

// Register required Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  ScatterController,
  Tooltip,
  Legend
);

export interface ActivityData {
  date: Date;
  score: number;
}

interface ActivityHeatmapProps {
  activityData: ActivityData[];
}

const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activityData }) => {
  try {
    // Transform the activity data for the chart
    const transformedData = transformDataForChart(activityData);
    const monthPositions = getMonthLabelPositions();
    
    // Create chart plugins for month and day labels
    const monthLabelsPlugin = createMonthLabelsPlugin(monthPositions);
    const dayLabelsPlugin = createDayLabelsPlugin();
    
    // Create chart data and options
    const data = createChartData(transformedData);
    const options = createChartOptions();
    
    return (
      <Chart
        type="scatter"
        data={data}
        options={options}
        plugins={[monthLabelsPlugin, dayLabelsPlugin]}
      />
    );
  } catch (error) {
    console.error("Error rendering activity heatmap:", error);
    return (
      <div className="flex items-center justify-center h-full text-white/70">
        Unable to load activity heatmap
      </div>
    );
  }
};

export default ActivityHeatmap;
