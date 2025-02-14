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
import { Flame, Trophy, BookOpen, Star } from "lucide-react";

const Analytics = () => {
  const {
    user
  } = useAuth();
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

  const {
    data: userProgress,
    isLoading
  } = useQuery({
    queryKey: ['user-progress', user?.id, timeRange],
    queryFn: async () => {
      const startDate = getDateRange();
      
      // First, get all quiz progress records
      const { data: quizData, error } = await supabase
        .from('quiz_progress')
        .select('completed_at, lecture_id, quiz_number, quiz_score')
        .eq('user_id', user?.id)
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', { ascending: true });
      
      if (error) throw error;
      
      // Process the data to determine completed lectures
      const lectureProgress = new Map();
      quizData?.forEach(progress => {
        if (!lectureProgress.has(progress.lecture_id)) {
          lectureProgress.set(progress.lecture_id, new Set());
        }
        if (progress.quiz_number === 2) { // Only track quiz_number 2 completions
          lectureProgress.get(progress.lecture_id).add(progress.completed_at);
        }
      });

      // Transform the data for the component
      return quizData?.map(progress => ({
        ...progress,
        isLectureCompleted: lectureProgress.get(progress.lecture_id)?.size === 5 // A lecture is completed when it has 5 quiz_number=2 entries
      }));
    },
    enabled: !!user
  });

  const calculateStreak = () => {
    if (!userProgress?.length) return 0;
    const today = startOfDay(new Date());
    const completedLectureDates = userProgress
      .filter(p => p.isLectureCompleted)
      .map(p => startOfDay(new Date(p.completed_at)));
    const uniqueDates = new Set(completedLectureDates.map(d => d.toISOString()));
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
    const dateRange = eachDayOfInterval({
      start: startDate,
      end: new Date()
    });

    let cumulativeCount = 0;
    const lecturesByDate = dateRange.map(date => {
      const dateStr = startOfDay(date).toISOString();
      const completedLectures = new Set(
        userProgress
          .filter(p => p.isLectureCompleted && startOfDay(new Date(p.completed_at)).toISOString() === dateStr)
          .map(p => p.lecture_id)
      ).size;
      cumulativeCount += completedLectures;
      return {
        date: format(date, 'MMM dd'),
        lectures: completedLectures,
        cumulative: cumulativeCount
      };
    });
    return lecturesByDate;
  };

  // Count unique completed lectures
  const totalLectures = userProgress?.reduce((completedLectures, progress) => {
    if (progress.isLectureCompleted) {
      completedLectures.add(progress.lecture_id);
    }
    return completedLectures;
  }, new Set<number>()).size || 0;

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

  return <div className="space-y-6">
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-purple-500/30 to-indigo-600/30"></div>
        <div className="absolute inset-0">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 rounded-lg bg-gradient-to-br from-red-500/80 to-orange-400/80 hover:from-red-500/90 hover:to-orange-400/90 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                    <Flame className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg text-white/90">Current Streak</p>
                    <p className="text-3xl font-bold text-white">{currentStreak} days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 rounded-lg bg-gradient-to-br from-emerald-500/80 to-teal-400/80 hover:from-emerald-500/90 hover:to-teal-400/90 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                    <BookOpen className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white/90">Total Lectures</p>
                    <p className="text-3xl font-bold text-white">{totalLectures}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6 rounded-lg bg-gradient-to-br from-blue-500/80 to-cyan-400/80 hover:from-blue-500/90 hover:to-cyan-400/90 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white/90">Total XP</p>
                    <p className="text-3xl font-bold text-white">
                      {userProgress?.reduce((sum, progress) => sum + (progress.score || 0), 0) || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-white">Learning Activity</h2>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setViewType('daily')} 
                    className={cn(
                      "border-2 text-white transition-all duration-300",
                      viewType === 'daily' 
                        ? "border-purple-400 bg-purple-500/50 hover:bg-purple-500/60" 
                        : "border-white/20 bg-white/10 hover:bg-white/20 hover:border-purple-400"
                    )}
                  >
                    Daily
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setViewType('cumulative')} 
                    className={cn(
                      "border-2 text-white transition-all duration-300",
                      viewType === 'cumulative' 
                        ? "border-purple-400 bg-purple-500/50 hover:bg-purple-500/60" 
                        : "border-white/20 bg-white/10 hover:bg-white/20 hover:border-purple-400"
                    )}
                  >
                    Cumulative
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                {(['week', 'month', 'year', 'all'] as const).map(range => (
                  <Button 
                    key={range} 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setTimeRange(range)} 
                    className={cn(
                      "border-2 text-white transition-all duration-300",
                      timeRange === range 
                        ? "border-purple-400 bg-purple-500/50 hover:bg-purple-500/60" 
                        : "border-white/20 bg-white/10 hover:bg-white/20 hover:border-purple-400"
                    )}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </Button>
                ))}
              </div>
            </div>

            <div className="h-[400px] rounded-lg p-4 bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prepareChartData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#fff" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#fff" fontSize={12} tickLine={false} axisLine={false} tickFormatter={value => `${value}`} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.1)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      color: "white"
                    }} 
                    labelStyle={{
                      color: "white"
                    }}
                    itemStyle={{
                      color: "white"
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey={viewType === 'daily' ? 'lectures' : 'cumulative'} 
                    stroke="#ffffff" 
                    strokeWidth={4}
                    dot={false}
                    activeDot={{
                      r: 8,
                      style: {
                        fill: "#ffffff",
                        stroke: "white",
                        strokeWidth: 2
                      }
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>;
};

export default Analytics;
