
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from './analytics/StatsCard';
import ActivityChart from './analytics/ActivityChart';
import ActivityHeatmap from './analytics/heatmap/ActivityHeatmap';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';

const Analytics = () => {
  // Sample data for analytics
  const statsData = [
    { title: "Total Hours", value: "42.5", change: "+12%" },
    { title: "Courses", value: "8", change: "+2" },
    { title: "Lectures", value: "36", change: "+8" },
    { title: "Completed Quizzes", value: "24", change: "+6" }
  ];

  // Sample activity data for heatmap with fallback
  const generateRandomActivityData = () => {
    try {
      const data = [];
      const today = new Date();
      // Start from exactly one year ago for better visualization
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 365);

      // Generate fewer data points to improve performance
      for (let i = 0; i < 30; i++) {
        const randomDays = Math.floor(Math.random() * 365);
        const date = new Date(startDate);
        date.setDate(date.getDate() + randomDays);
        
        // Ensure the date is valid
        if (!isNaN(date.getTime())) {
          data.push({
            date,
            score: Math.floor(Math.random() * 20) + 1 // Scores between 1-20
          });
        }
      }
      
      // Always include at least one valid data point to ensure the chart renders
      data.push({
        date: new Date(),
        score: 10
      });
      
      return data;
    } catch (error) {
      console.error("Error generating random activity data:", error);
      // Return a minimal set of data if there's an error
      return [{ date: new Date(), score: 5 }];
    }
  };

  // Generate activity data once (not on every render)
  const activityData = React.useMemo(() => generateRandomActivityData(), []);

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold text-white mb-6">Your Learning Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {statsData.map((stat, index) => (
          <StatsCard 
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
          />
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Activity Chart</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart />
          </CardContent>
        </Card>
        
        <Card className="bg-white/10 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="text-white">Activity Heatmap</CardTitle>
            <p className="text-white/60 text-sm">
              {format(new Date(), 'MMMM yyyy')}
            </p>
          </CardHeader>
          <CardContent>
            <ErrorBoundary fallback={<div className="w-full h-[220px] flex items-center justify-center text-white/70">Unable to load heatmap</div>}>
              <ActivityHeatmap activityData={activityData} />
            </ErrorBoundary>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Simple ErrorBoundary component to catch and handle runtime errors
class ErrorBoundary extends React.Component<{children: React.ReactNode, fallback: React.ReactNode}> {
  state = { hasError: false };
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error) {
    console.error("Error caught by ErrorBoundary:", error);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    
    return this.props.children;
  }
}

export default Analytics;
