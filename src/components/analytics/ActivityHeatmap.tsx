
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
import { format, addDays, startOfYear } from "date-fns";

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
}

const ActivityHeatmap = ({ data }: ActivityHeatmapProps) => {
  const transformDataForChart = () => {
    const yearData = [];
    const startDate = startOfYear(new Date(2025, 0, 1));
    
    // Generate data points for the entire year
    for (let week = 0; week < 52; week++) {
      for (let day = 0; day < 7; day++) {
        const currentDate = addDays(startDate, week * 7 + day);
        yearData.push({
          x: week,
          y: day,
          r: 8,
          score: 0,
          date: currentDate,
        });
      }
    }

    // Map actual data to the generated grid
    data.forEach((item) => {
      const itemDate = new Date(item.date);
      const daysSinceStart = Math.floor((itemDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const week = Math.floor(daysSinceStart / 7);
      const day = daysSinceStart % 7;
      
      const index = week * 7 + day;
      if (index >= 0 && index < yearData.length) {
        yearData[index].score = item.score;
      }
    });

    return yearData;
  };

  const chartData: ChartData<'scatter'> = {
    datasets: [
      {
        data: transformDataForChart(),
        backgroundColor: (context) => {
          if (!context.raw) return 'rgba(255, 255, 255, 0.05)';
          const score = (context.raw as any).score || 0;
          
          if (score === 0) return 'rgba(255, 255, 255, 0.05)';
          if (score <= 5) return 'rgba(168, 85, 247, 0.2)';
          if (score <= 10) return 'rgba(168, 85, 247, 0.4)';
          if (score <= 15) return 'rgba(168, 85, 247, 0.6)';
          if (score <= 20) return 'rgba(168, 85, 247, 0.8)';
          return 'rgba(168, 85, 247, 1)';
        },
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        pointStyle: 'rect' as const,
        pointRadius: 8,
        hoverBackgroundColor: 'rgba(168, 85, 247, 0.8)',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0
    },
    layout: {
      padding: {
        top: 10,
        right: 10,
        bottom: 25,
        left: 40
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        position: 'bottom' as const,
        min: -0.5,
        max: 51.5,
        grid: {
          display: false,
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          stepSize: 4,
          color: 'rgba(255, 255, 255, 0.7)',
          padding: 8,
          autoSkip: false,
          callback: function(value: number) {
            if (value % 4 === 0) {
              const date = addDays(startOfYear(new Date(2025, 0, 1)), value * 7);
              return format(date, 'MMM');
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
          padding: 10,
          color: 'rgba(255, 255, 255, 0.7)',
          callback: (value: number) => {
            // 2025 starts on Wednesday (Jan 1, 2025)
            // With reverse: true, 0 = Wednesday (top) to 6 = Tuesday (bottom)
            const days = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
            return days[Math.floor(value)];
          },
          font: {
            size: 11,
          },
          align: 'center' as const,
          crossAlign: 'center' as const,
        },
        afterFit: (scaleInstance: any) => {
          // Adjust the label position to be half a cell higher
          const originalDraw = scaleInstance.draw;
          scaleInstance.draw = function() {
            const ctx = this.ctx;
            ctx.save();
            // Moving DOWN by 6 pixels (increased from 4)
            ctx.translate(0, 6);
            originalDraw.apply(this, arguments);
            ctx.restore();
          };
        }
      },
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${format(context.raw.date, 'MMM d, yyyy')} - Score: ${context.raw.score}`;
          },
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 8,
        cornerRadius: 4,
        displayColors: false,
      },
      legend: {
        display: false,
      },
    },
  };

  return (
    <div className="w-full h-[300px] p-4 rounded-lg bg-background/5">
      <Scatter data={chartData} options={options} />
    </div>
  );
};

export default ActivityHeatmap;
