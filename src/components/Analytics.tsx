import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { format, subDays, subMonths, subYears, startOfDay, eachDayOfInterval } from "date-fns";
import { cn } from "@/lib/utils";
import { Flame, Trophy, BookOpen } from "lucide-react";

const Analytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('week');
  const [viewType, setViewType] = useState<'daily' | 'cumulative'>('daily');

  const getDateRange = () => {
    const now = new Date();
    switch (timeRange) {
      case 'week':
        return subDays(now, 7);
      case 'month':
        return subMonths(now, 1);
      case 'year':
        return subYears(now, 1);
      case 'all':
        return subYears(now, 10); // Effectively "all" data
      default:
        return subDays(now, 7);
    }
  };

  const { data: userProgress, isLoading } = useQuery({
    queryKey: ['user-progress', user?.id, timeRange],
    queryFn: async () => {
      const startDate = getDateRange();
      const { data, error } = await supabase
        .from('user_progress')
        .select('completed_at, lecture_id')
        .eq('user_id', user?.id)
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const calculateStreak = () => {
    if (!userProgress?.length) return 0;
    
    const today = startOfDay(new Date());
    const dates = userProgress.map(p => startOfDay(new Date(p.completed_at)));
    const uniqueDates = new Set(dates.map(d => d.toISOString()));
    
    let streak = 0;
    let currentDate = today;
    
    while (uniqueDates.has(currentDate.toISOString())) {
      streak++;
      currentDate = subDays(currentDate, 1);
    }
    
    return streak;
  };

  const prepareChartData = () => {
    if (!userProgress?.length) return [];

    const startDate = getDateRange();
    const dateRange = eachDayOfInterval({ start: startDate, end: new Date() });
    
    let cumulativeCount = 0;
    const lecturesByDate = dateRange.map(date => {
      const dateStr = startOfDay(date).toISOString();
      const lecturesCompleted = new Set(
        userProgress
          .filter(p => startOfDay(new Date(p.completed_at)).toISOString() === dateStr)
          .map(p => p.lecture_id)
      ).size;

      cumulativeCount += lecturesCompleted;

      return {
        date: format(date, 'MMM dd'),
        lectures: lecturesCompleted,
        cumulative: cumulativeCount
      };
    });

    return lecturesByDate;
  };

  const totalLectures = new Set(userProgress?.map(p => p.lecture_id)).size || 0;
  const currentStreak = calculateStreak();
  const chartData = prepareChartData();

  if (isLoading) {
    return <div className="space-y-4">
      <Skeleton className="h-[400px] w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-[100px]" />
        <Skeleton className="h-[100px]" />
      </div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-xl p-6 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-full">
                  <Flame className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Current Streak</p>
                  <p className="text-2xl font-bold text-gray-900">{currentStreak} days</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full">
                  <Trophy className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Lectures</p>
                  <p className="text-2xl font-bold text-gray-900">{totalLectures}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <BookOpen className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Daily Average</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {chartData.length ? (totalLectures / chartData.length).toFixed(1) : '0'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-gray-800">Learning Activity</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewType('daily')}
                  className={cn(
                    "border-2",
                    viewType === 'daily'
                      ? "border-purple-500 text-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-purple-500 hover:text-purple-500"
                  )}
                >
                  Daily
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setViewType('cumulative')}
                  className={cn(
                    "border-2",
                    viewType === 'cumulative'
                      ? "border-purple-500 text-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-purple-500 hover:text-purple-500"
                  )}
                >
                  Cumulative
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              {(['week', 'month', 'year', 'all'] as const).map((range) => (
                <Button
                  key={range}
                  variant="outline"
                  size="sm"
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "border-2",
                    timeRange === range
                      ? "border-purple-500 text-purple-500 bg-purple-50"
                      : "border-gray-200 hover:border-purple-500 hover:text-purple-500"
                  )}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </Button>
              ))}
            </div>
          </div>

          <div className="h-[400px] bg-white rounded-lg p-4 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={prepareChartData()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "none",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  labelStyle={{ color: "#374151" }}
                />
                <Line
                  type="monotone"
                  dataKey={viewType === 'daily' ? 'lectures' : 'cumulative'}
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 6,
                    style: { fill: "#8B5CF6", strokeWidth: 0 }
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
