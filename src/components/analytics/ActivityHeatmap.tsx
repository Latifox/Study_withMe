
import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  ChartData,
} from 'chart.js';
import { Scatter } from 'react-chartjs-2';
import { format, getMonth, getDate } from "date-fns";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
);

interface ActivityHeatmapProps {
  data: Array<{
    date: Date;
    score: number;
  }>;
  weekDays: string[];
  months: string[];
  getHeatmapColor: (score: number) => string;
}

const ActivityHeatmap = ({ data, weekDays }: ActivityHeatmapProps) => {
  const transformDataForChart = () => {
    return data.map((item) => ({
      x: parseInt(format(item.date, 'w')), // Week number
      y: new Date(item.date).getDay(), // Day of week (0-6)
      r: 0, // Set radius to 0 to create squares
      score: item.score,
      month: getMonth(new Date(item.date)),
      date: getDate(item.date), // Get the day of the month (1-31)
    }));
  };

  const allScores = data.map(d => d.score);
  const minScore = Math.min(...allScores);
  const maxScore = Math.max(...allScores);

  const normalizeScore = (score: number) => {
    if (maxScore === minScore) return 0;
    return (score - minScore) / (maxScore - minScore);
  };

  const chartData: ChartData<'scatter'> = {
    datasets: [
      {
        data: transformDataForChart(),
        backgroundColor: (context) => {
          if (!context.raw) return 'rgba(255, 255, 255, 0.05)';
          const score = (context.raw as any).score || 0;
          return score === 0 
            ? 'rgba(255, 255, 255, 0.05)' 
            : `rgba(168, 85, 247, ${0.2 + normalizeScore(score) * 0.8})`;
        },
        borderColor: 'transparent',
        pointRadius: 15,
        pointStyle: 'rect' as const,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'linear' as const,
        position: 'top' as const,
        min: 0,
        max: 53,
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: {
          stepSize: 1,
          color: 'rgba(255, 255, 255, 0.4)',
          font: {
            size: 12,
          },
          callback: function(value: number) {
            // Only show month name at the first week of each month
            const dataPoint = (chartData.datasets[0].data as any[]).find(
              (d) => d.x === value && d.month !== undefined
            );
            if (dataPoint) {
              const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              return monthNames[dataPoint.month];
            }
            return '';
          },
        },
      },
      y: {
        type: 'linear' as const,
        min: -0.5,
        max: 6.5,
        reverse: true,
        grid: {
          display: true,
          color: 'rgba(255, 255, 255, 0.1)',
          drawBorder: false,
          lineWidth: 1,
        },
        ticks: {
          stepSize: 1,
          padding: 10,
          callback: (value: number) => {
            const days = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue']; // Reordered to match your sketch
            return days[value];
          },
          color: 'rgba(255, 255, 255, 0.4)',
          font: {
            size: 12,
          },
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const date = context.raw.date;
            const suffix = getDateSuffix(date);
            return `${date}${suffix} - Score: ${context.raw.score}`;
          },
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        titleFont: {
          size: 14,
        },
        bodyFont: {
          size: 14,
        },
      },
      legend: {
        display: false,
      },
    },
  };

  // Helper function to get the date suffix (st, nd, rd, th)
  const getDateSuffix = (date: number) => {
    if (date > 3 && date < 21) return 'th';
    switch (date % 10) {
      case 1:  return "st";
      case 2:  return "nd";
      case 3:  return "rd";
      default: return "th";
    }
  };

  return (
    <div className="w-full h-[400px] p-4">
      <Scatter data={chartData} options={options} />
    </div>
  );
};

export default ActivityHeatmap;
