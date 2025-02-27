
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
    setTransformedData(transformDataForChart(activityData));
    setMonthPositions(getMonthLabelPositions());
  }, [activityData]);

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
};

export default ActivityHeatmap;
