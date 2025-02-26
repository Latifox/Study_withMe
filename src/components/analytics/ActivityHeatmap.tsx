
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
import { format, getMonth, getDate, startOfYear, getDay } from "date-fns";

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
    const yearData = [];
    const daysInWeek = 7;
    const weeksPerMonth = 6;

    // Generate data points for the entire year grid
    for (let month = 0; month < 12; month++) {
      for (let week = 0; week < weeksPerMonth; week++) {
        for (let day = 0; day < daysInWeek; day++) {
          const xPosition = month; // Each month is one unit wide
          const yPosition = day; // Each day is one unit high
          
          // Add small offset for week spacing
          const xOffset = (week / weeksPerMonth) * 0.8; // Smaller offset for tighter grid
          
          yearData.push({
            x: xPosition + xOffset,
            y: yPosition,
            r: 8, // Size of squares
            score: 0,
            date: format(new Date(2025, month, (week * 7) + day + 1), 'MMM d'),
          });
        }
      }
    }

    // Map actual data onto the grid
    data.forEach((item) => {
      const date = new Date(item.date);
      const month = getMonth(date);
      const dayOfWeek = (getDay(date) + 4) % 7; // Adjust to start from Wednesday
      const weekInMonth = Math.floor((getDate(date) - 1) / 7);
      
      const index = (month * (daysInWeek * weeksPerMonth)) + (weekInMonth * daysInWeek) + dayOfWeek;
      if (index < yearData.length) {
        yearData[index].score = item.score;
      }
    });

    return yearData;
  };

  const allScores = data.map(d => d.score);
  const minScore = Math.min(...allScores, 0);
  const maxScore = Math.max(...allScores, 0);

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
        pointStyle: 'rect',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        top: 30,
        right: 20,
        bottom: 10,
        left: 60
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'top' as const,
        min: -0.2,
        max: 11.8,
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
          padding: 8,
          font: {
            size: 12,
            weight: 'normal' as const,
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
        grid: {
          display: false,
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          stepSize: 1,
          padding: 12,
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
            weight: 'normal' as const,
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
