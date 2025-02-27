
import { ChartData } from 'chart.js';
import { addDays, startOfYear, getYear, getMonth, format } from "date-fns";

export interface ActivityData {
  date: Date;
  score: number;
}

// Transform raw activity data into the format needed by Chart.js
export const transformDataForChart = (data: ActivityData[]) => {
  try {
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
    if (Array.isArray(data)) {
      data.forEach((item) => {
        if (!item || !item.date) return;
        
        try {
          const itemDate = new Date(item.date);
          if (isNaN(itemDate.getTime())) return; // Skip invalid dates
          
          const daysSinceStart = Math.floor((itemDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          if (daysSinceStart < 0) return; // Skip dates before start date
          
          const week = Math.floor(daysSinceStart / 7);
          const day = daysSinceStart % 7;
          
          const index = week * 7 + day;
          if (index >= 0 && index < yearData.length) {
            yearData[index].score = typeof item.score === 'number' ? item.score : 0;
          }
        } catch (err) {
          console.warn("Error processing activity data item:", err);
          // Continue with the next item
        }
      });
    }

    return yearData;
  } catch (error) {
    console.error("Error in transformDataForChart:", error);
    // Return an empty array if there's an error
    return [];
  }
};

// Calculate x-axis positions for month labels (15th of each month)
export const getMonthLabelPositions = () => {
  try {
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
  } catch (error) {
    console.error("Error in getMonthLabelPositions:", error);
    // Return an empty array if there's an error
    return [];
  }
};

// Create the chart dataset with activity data
export const createChartData = (transformedData: any[]): ChartData<'scatter'> => {
  try {
    return {
      datasets: [
        {
          data: transformedData || [],
          backgroundColor: (context) => {
            if (!context.raw) return 'rgba(255, 255, 255, 0.05)';
            const score = (context.raw as any)?.score || 0;
            
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
  } catch (error) {
    console.error("Error in createChartData:", error);
    // Return a minimal valid dataset if there's an error
    return {
      datasets: [{
        data: [],
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        pointStyle: 'rect' as const,
        pointRadius: 8,
      }]
    };
  }
};

// Create chart options
export const createChartOptions = () => {
  try {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 100 // Reduced duration to minimize performance issues
      },
      layout: {
        padding: {
          top: 10,
          right: 10,
          bottom: 30,
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
            stepSize: 1,
            padding: 10,
            color: 'rgba(255, 255, 255, 0.7)',
            callback: (value: number) => {
              // 2025 starts on Wednesday (Jan 1, 2025)
              // With reverse: true, 0 = Wednesday (top) to 6 = Tuesday (bottom)
              const days = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
              return days[Math.floor(value)] || '';
            },
            font: {
              size: 11,
            },
            align: 'center' as const,
            crossAlign: 'center' as const,
          },
        },
      },
      plugins: {
        tooltip: {
          callbacks: {
            label: (context: any) => {
              if (!context?.raw?.date) return 'No data';
              try {
                return `${format(context.raw.date, 'MMM d, yyyy')} - Score: ${context.raw.score || 0}`;
              } catch (e) {
                return 'Invalid date';
              }
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
  } catch (error) {
    console.error("Error in createChartOptions:", error);
    // Return minimal valid options if there's an error
    return {
      responsive: true,
      maintainAspectRatio: false,
      scales: { x: { display: false }, y: { display: false } },
      plugins: { legend: { display: false } }
    };
  }
};
