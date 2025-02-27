
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatsCard from './analytics/StatsCard';
import ActivityChart from './analytics/ActivityChart';
import ActivityHeatmap from './analytics/heatmap/ActivityHeatmap';
import { format } from 'date-fns';

const Analytics = () => {
  // Sample data for analytics
  const statsData = [
    { title: "Total Hours", value: "42.5", change: "+12%" },
    { title: "Courses", value: "8", change: "+2" },
    { title: "Lectures", value: "36", change: "+8" },
    { title: "Completed Quizzes", value: "24", change: "+6" }
  ];

  // Generate activity data once (not on every render)
  const activityData = React.useMemo(() => {
    const data = [];
    const today = new Date();
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 1);

    // Generate fewer data points for better performance
    for (let i = 0; i < 100; i++) {
      const date = new Date(startDate.getTime());
      date.setDate(date.getDate() + Math.floor(Math.random() * 365));
      
      data.push({
        date,
        score: Math.floor(Math.random() * 20) + 1  // Activity score between 1-20
      });
    }
    
    return data;
  }, []);

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
            <div className="w-full h-[220px]">
              <ActivityHeatmap activityData={activityData} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
