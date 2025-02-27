
import React, { useEffect, useState } from 'react';
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
  const [transformedData, setTransformedData] = useState<any[]>([]);
  const [monthPositions, setMonthPositions] = useState<Array<{month: number, weekIndex: number}>>([]);

  useEffect(() => {
    // Ensure we have valid data before transforming
    if (Array.isArray(activityData) && activityData.length > 0) {
      setTransformedData(transformDataForChart(activityData));
      setMonthPositions(getMonthLabelPositions());
    }
  }, [activityData]);

  // Only render chart when we have data
  if (!transformedData.length) {
    return <div className="w-full h-[220px] flex items-center justify-center">Loading heatmap...</div>;
  }

  try {
    // Create chart plugins
    const monthLabelsPlugin = createMonthLabelsPlugin(monthPositions);
    const dayLabelsPlugin = createDayLabelsPlugin();

    // Create chart data and options
    const data = createChartData(transformedData);
    const options = createChartOptions();

    return (
      <div className="w-full h-[220px]">
        <Chart
          type="scatter"
          data={data}
          options={options}
          plugins={[monthLabelsPlugin, dayLabelsPlugin]}
        />
      </div>
    );
  } catch (error) {
    console.error("Error rendering ActivityHeatmap:", error);
    return (
      <div className="w-full h-[220px] flex items-center justify-center text-white/70">
        Unable to load heatmap
      </div>
    );
  }
};

export default ActivityHeatmap;
