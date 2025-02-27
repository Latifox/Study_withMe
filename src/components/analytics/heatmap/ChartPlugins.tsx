
import { Plugin } from 'chart.js';
import { format } from "date-fns";

// Plugin to draw month labels below the chart
export const createMonthLabelsPlugin = (monthPositions: Array<{month: number, weekIndex: number}>): Plugin<'scatter'> => ({
  id: 'monthLabels',
  afterDraw: (chart) => {
    const ctx = chart.ctx;
    const { left, right, bottom } = chart.chartArea;
    const width = right - left;
    
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif';
    
    monthPositions.forEach(pos => {
      const monthName = format(new Date(2025, pos.month, 1), 'MMM');
      const xPixel = left + ((pos.weekIndex + 0.5) / 52) * width;
      // Positioned month labels 9.5 pixels below the bottom of the chart area
      ctx.fillText(monthName, xPixel, bottom + 9.5);
    });
    
    ctx.restore();
  }
});

// Plugin to properly handle day label positioning
export const createDayLabelsPlugin = (): Plugin<'scatter'> => ({
  id: 'dayLabels',
  beforeInit: (chart) => {
    // Configure the y-axis to not draw the labels by default
    // We'll draw them manually in the afterDraw hook
    if (chart.options.scales && chart.options.scales.y) {
      chart.options.scales.y.ticks = {
        ...chart.options.scales.y.ticks,
        display: false
      };
    }
  },
  afterDraw: (chart) => {
    const yScale = chart.scales.y;
    if (!yScale) return;
    
    // Get ticks directly from the scale instance
    const ticks = yScale.ticks;
    if (!ticks || ticks.length === 0) return;
    
    const ctx = chart.ctx;
    
    // Set text styling for the labels
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '11px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue, sans-serif';
    
    // Draw the ticks manually with the desired positioning
    ticks.forEach((tick) => {
      if (typeof tick.label === 'string') {
        // Position labels to the left of the chart area with a 8px right padding
        // and vertically centered with the tick
        ctx.fillText(
          tick.label, 
          yScale.left - 8, 
          yScale.getPixelForTick(tick.value)
        );
      }
    });
    
    ctx.restore();
  }
});
