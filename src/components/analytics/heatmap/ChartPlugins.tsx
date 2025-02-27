
import { Plugin } from 'chart.js';
import { format, startOfYear } from "date-fns";

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

// Plugin to adjust day label positions by moving up 1.5 pixels
export const createDayLabelsPlugin = (): Plugin<'scatter'> => ({
  id: 'dayLabels',
  afterDraw: (chart) => {
    const yAxis = chart.scales.y;
    
    if (!yAxis || !yAxis.ticks) return;
    
    const ctx = chart.ctx;
    
    // Backup original methods
    const originalDraw = yAxis.draw;
    
    // Override the draw method to adjust labels
    yAxis.draw = function(chartCtx) {
      const ticks = this.ticks || [];
      
      // First draw the grid lines and scale as normal
      originalDraw.apply(this, [chartCtx]);
      
      // Then redraw the tick labels with our custom positioning
      ctx.save();
      ctx.translate(0, -1.5); // Move up by 1.5 pixels
      
      // Only draw the labels part
      this.drawLabels(chartCtx);
      
      ctx.restore();
    };
    
    // Call the modified draw method
    yAxis.draw(ctx);
    
    // Restore original method
    yAxis.draw = originalDraw;
  }
});
