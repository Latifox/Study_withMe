
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
  const [chartError, setChartError] = useState<boolean>(false);

  useEffect(() => {
    try {
      // Ensure we have valid data before transforming
      if (Array.isArray(activityData) && activityData.length > 0) {
        setTransformedData(transformDataForChart(activityData));
        setMonthPositions(getMonthLabelPositions());
        setChartError(false);
      }
    } catch (error) {
      console.error("Error processing activity data:", error);
      setChartError(true);
    }
  }, [activityData]);

  // Handle loading state
  if (!transformedData.length) {
    return <div className="w-full h-[220px] flex items-center justify-center">Loading heatmap...</div>;
  }

  // Handle error state
  if (chartError) {
    return (
      <div className="w-full h-[220px] flex items-center justify-center text-white/70">
        Unable to load heatmap
      </div>
    );
  }

  // Use a safer rendering approach with error boundary pattern
  const renderChart = () => {
    try {
      // Create chart plugins
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
      console.error("Error rendering chart:", error);
      return (
        <div className="flex items-center justify-center h-full text-white/70">
          Error loading chart
        </div>
      );
    }
  };

  return (
    <div className="w-full h-[220px]">
      {renderChart()}
    </div>
  );
};

export default ActivityHeatmap;
