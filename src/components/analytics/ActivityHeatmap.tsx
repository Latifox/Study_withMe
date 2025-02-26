
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
import { format, getMonth, getDate, startOfYear } from "date-fns";

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

const ActivityHeatmap = ({ data }: ActivityHeatmapProps) => {
  const transformDataForChart = () => {
    // Start from January 1st, 2025 (a Wednesday)
    const startDate = startOfYear(new Date(2025, 0, 1));
    
    // Create a data point for every day of the year
    const yearData = [];
    for (let month = 0; month < 12; month++) {
      for (let week = 0; week < 6; week++) {
        for (let day = 0; day < 7; day++) {
          yearData.push({
            x: month + (week * 0.15), // Add small offset for each week
            y: day,
            r: 8,
            score: 0,
            date: format(new Date(2025, month, day + 1), 'MMM d'),
          });
        }
      }
    }

    // Overlay actual data points
    data.forEach((item) => {
      const date = new Date(item.date);
      const month = getMonth(date);
      const dayPosition = (date.getDay() + 4) % 7; // +4 because we want Wed(3) to be 0
      const week = Math.floor((getDate(date) - 1) / 7);
      
      const index = (month * 42) + (week * 7) + dayPosition;
      if (index < yearData.length) {
        yearData[index].score = item.score;
      }
    });

    return yearData;
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
        pointRadius: 8,
        pointStyle: 'rect' as const,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 20,
        right: 20,
        bottom: 10,
        left: 50
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'top' as const,
        min: -0.5,
        max: 11.5,
        offset: true,
        grid: {
          display: false,
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          stepSize: 1,
          color: 'rgba(255, 255, 255, 0.7)',
          padding: 5,
          font: {
            size: 12,
            weight: 500,
          },
          callback: function(value: number) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return monthNames[Math.floor(value)];
          },
        },
      },
      y: {
        type: 'linear' as const,
        min: -0.5,
        max: 6.5,
        reverse: true,
        offset: true,
        grid: {
          display: false,
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          stepSize: 1,
          padding: 8,
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
            weight: 500,
          },
          callback: (value: number) => {
            const days = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
            return days[value];
          },
        },
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.raw.date} - Score: ${context.raw.score}`;
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

  return (
    <div className="w-full h-[400px] p-4 bg-background rounded-lg">
      <Scatter data={chartData} options={options} />
    </div>
  );
};

export default ActivityHeatmap;

