import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { format, subDays, subMonths, subYears, startOfDay, eachDayOfInterval, startOfYear, endOfYear } from "date-fns";
import { cn } from "@/lib/utils";
import { Flame, Trophy, BookOpen, Star } from "lucide-react";
import StatsCard from "./analytics/StatsCard";
import ActivityChart from "./analytics/ActivityChart";
import ActivityHeatmap from "./analytics/ActivityHeatmap";

type QuizProgress = Database['public']['Tables']['quiz_progress']['Row'];
type UserProgressRow = Database['public']['Tables']['user_progress']['Row'];

type UserProgress = {
  quizProgress: QuizProgress[];
  progressData: UserProgressRow[];
};

const Analytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('week');

  const currentYear = new Date().getFullYear();
  const startDate = startOfYear(new Date(currentYear, 0, 1));
  const endDate = endOfYear(new Date(currentYear, 11, 31));
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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
        return subYears(now, 10);
      default:
        return subDays(now, 7);
    }
  };

  const {
    data: userProgress,
    isLoading
  } = useQuery<UserProgress>({
    queryKey: ['user-progress', user?.id, timeRange],
    queryFn: async (): Promise<UserProgress> => {
      const startDate = getDateRange();
      
      const { data: quizProgress, error: quizError } = await supabase
        .from('quiz_progress')
        .select('*')
        .eq('user_id', user?.id)
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', { ascending: true });
      
      if (quizError) throw quizError;
      
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', user?.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });
      
      if (progressError) throw progressError;

      return {
        quizProgress: quizProgress || [],
        progressData: progressData || []
      };
    },
    enabled: !!user
  });

  const calculateStreak = () => {
    if (!userProgress?.progressData.length) return 0;
    
    const today = startOfDay(new Date());
    const uniqueDates = new Set(
      userProgress.progressData.map(p => 
        startOfDay(new Date(p.completed_at!)).toISOString()
      )
    );

    let streak = 0;
    let currentDate = today;

    while (uniqueDates.has(currentDate.toISOString())) {
      streak++;
      currentDate = subDays(currentDate, 1);
    }

    return streak;
  };

  const prepareChartData = () => {
    if (!userProgress?.quizProgress.length) return [];
    const startDate = getDateRange();
    const dateRange = eachDayOfInterval({
      start: startDate,
      end: new Date()
    });

    const dateScores = new Map();
    userProgress.quizProgress.forEach(progress => {
      const dateKey = startOfDay(new Date(progress.completed_at)).toISOString();
      dateScores.set(dateKey, (dateScores.get(dateKey) || 0) + (progress.quiz_score || 0));
    });

    let cumulative = 0;
    return dateRange.map(date => {
      const dateStr = format(date, 'MMM dd');
      const dateKey = startOfDay(date).toISOString();
      const dailyScore = dateScores.get(dateKey) || 0;
      cumulative += dailyScore;
      return {
        date: dateStr,
        cumulative
      };
    });
  };

  const prepareHeatmapData = () => {
    if (!userProgress?.progressData.length) return [];
    
    const allDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    const activityMap = new Map();
    userProgress.progressData.forEach(progress => {
      if (progress.completed_at) {
        const date = startOfDay(new Date(progress.completed_at));
        const key = format(date, 'yyyy-MM-dd');
        activityMap.set(key, (activityMap.get(key) || 0) + (progress.score || 0));
      }
    });

    return allDays.map(date => ({
      date,
      score: activityMap.get(format(date, 'yyyy-MM-dd')) || 0
    }));
  };

  const getHeatmapColor = (score: number) => {
    if (score === 0) return 'bg-white/5';
    if (score <= 5) return 'bg-purple-500/20';
    if (score <= 10) return 'bg-purple-500/40';
    if (score <= 15) return 'bg-purple-500/60';
    if (score <= 20) return 'bg-purple-500/80';
    return 'bg-purple-500';
  };

  const totalLectures = userProgress?.quizProgress ? 
    new Set(userProgress.quizProgress.map(p => p.lecture_id)).size : 0;

  const totalXP = userProgress?.quizProgress ? 
    userProgress.quizProgress.reduce((sum, p) => sum + (p.quiz_score || 0), 0) : 0;

  const currentStreak = calculateStreak();
  const chartData = prepareChartData();
  const heatmapData = prepareHeatmapData();

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
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/30 via-purple-500/30 to-indigo-600/30"></div>
        <div className="absolute inset-0">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Total Lectures"
              value={totalLectures}
              icon={BookOpen}
              gradientFrom="teal-500"
              gradientTo="teal-600"
            />
            <StatsCard
              title="Current Streak"
              value={`${currentStreak} days`}
              icon={Flame}
              gradientFrom="red-500"
              gradientTo="red-600"
            />
            <StatsCard
              title="Total XP"
              value={totalXP}
              icon={Star}
              gradientFrom="amber-500"
              gradientTo="amber-600"
            />
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Learning Activity</h2>
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

            <ActivityChart data={chartData} />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Activity History</h3>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-white/60">Less</div>
                  <div className="flex gap-1">
                    {[0, 5, 10, 15, 20].map((score) => (
                      <div
                        key={score}
                        className={cn(
                          "w-3 h-3 rounded-sm border border-white/10",
                          score === 0 
                            ? "bg-white/5"
                            : score <= 5
                            ? "bg-purple-500/20"
                            : score <= 10
                            ? "bg-purple-500/40"
                            : score <= 15
                            ? "bg-purple-500/60"
                            : score <= 20
                            ? "bg-purple-500/80"
                            : "bg-purple-500"
                        )}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-white/60">More</div>
                </div>
              </div>
              
              <ActivityHeatmap data={heatmapData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
