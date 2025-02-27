
import { ChartData } from 'chart.js';
import { addDays, startOfYear, getYear, getMonth, setDate } from "date-fns";

export interface ActivityData {
  date: Date;
  score: number;
}

// Transform raw activity data into the format needed by Chart.js
export const transformDataForChart = (data: ActivityData[]) => {
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

// Calculate x-axis positions for month labels (15th of each month)
export const getMonthLabelPositions = () => {
  const startDate = startOfYear(new Date(2025, 0, 1));
  const monthPositions = [];

  // For each month, find the column index for the 15th
  for (let month = 0; month < 12; month++) {
    const fifteenthDate = new Date(getYear(startDate), month, 15);
    const daysSinceStart = Math.floor((fifteenthDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const weekIndex = Math.floor(daysSinceStart / 7);
    
    monthPositions.push({
      month,
      weekIndex
    });
  }

  return monthPositions;
};

// Create the chart dataset with activity data
export const createChartData = (transformedData: any[]): ChartData<'scatter'> => ({
  datasets: [
    {
      data: transformedData,
      backgroundColor: (context) => {
        if (!context.raw) return 'rgba(255, 255, 255, 0.05)';
        const score = (context.raw as any).score || 0;
        
        if (score === 0) return 'rgba(255, 255, 255, 0.05)';
        if (score <= 5) return 'rgba(255, 223, 0, 0.2)';  // Light yellow
        if (score <= 10) return 'rgba(255, 223, 0, 0.4)'; // Medium-light yellow
        if (score <= 15) return 'rgba(255, 223, 0, 0.6)'; // Medium yellow
        if (score <= 20) return 'rgba(255, 223, 0, 0.8)'; // Medium-dark yellow
        return 'rgba(255, 223, 0, 1)';                    // Bold/bright yellow
      },
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      pointStyle: 'rect' as const,
      pointRadius: 8,
      hoverBackgroundColor: 'rgba(255, 223, 0, 0.8)',    // Hover color also changed to yellow
    },
  ],
});

// Create chart options
export const createChartOptions = () => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: {
    duration: 0
  },
  layout: {
    padding: {
      top: 10,
      right: 10,
      bottom: 30,
      left: 10
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
        display: false,
        autoSkip: false,
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
        display: false,
      },
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
});

// Import missing 'format' from date-fns
import { format } from 'date-fns';
