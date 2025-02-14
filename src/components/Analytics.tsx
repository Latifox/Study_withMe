import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { format, subDays, subMonths, subYears, startOfDay, eachDayOfInterval, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Flame, Trophy, BookOpen, Star } from "lucide-react";
import {
  Tooltip as TooltipUI,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Analytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('week');

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
      
      const { data: quizProgress, error: quizError } = await supabase
        .from('quiz_progress')
        .select('completed_at, lecture_id, quiz_number, quiz_score')
        .eq('user_id', user?.id)
        .gte('completed_at', startDate.toISOString())
        .order('completed_at', { ascending: true });
      
      if (quizError) throw quizError;
      
      // Get user progress records for streak calculation
      const { data: progressData, error: progressError } = await supabase
        .from('user_progress')
        .select('completed_at')
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
        startOfDay(new Date(p.completed_at)).toISOString()
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
    if (!userProgress?.quizProgress.length) return new Map();
    
    const dateScores = new Map();
    userProgress.quizProgress.forEach(progress => {
      const dateKey = startOfDay(new Date(progress.completed_at)).toISOString();
      dateScores.set(dateKey, (dateScores.get(dateKey) || 0) + (progress.quiz_score || 0));
    });
    
    return dateScores;
  };

  const getHeatmapColor = (score: number) => {
    if (score === 0) return 'bg-white/10';
    if (score < 10) return 'bg-blue-500/20';
    if (score < 20) return 'bg-blue-500/40';
    if (score < 30) return 'bg-blue-500/60';
    if (score < 40) return 'bg-blue-500/80';
    return 'bg-blue-500';
  };

  // Count unique lectures and total XP with proper null checks
  const totalLectures = userProgress?.quizProgress ? 
    new Set(userProgress.quizProgress.map(p => p.lecture_id)).size : 0;

  const totalXP = userProgress?.quizProgress ? 
    userProgress.quizProgress.reduce((sum, p) => sum + (p.quiz_score || 0), 0) : 0;

  const currentStreak = calculateStreak();
  const chartData = prepareChartData();
  const heatmapData = prepareHeatmapData();

  // Generate last 7 days for heatmap
  const heatmapDays = Array.from({ length: 7 }, (_, i) => 
    subDays(new Date(), 6 - i)
  ).map(date => ({
    date,
    dateStr: startOfDay(date).toISOString(),
    score: heatmapData.get(startOfDay(date).toISOString()) || 0
  }));

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
                    <p className="text-3xl font-bold text-white">{totalXP}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
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

            <div className="h-[400px] rounded-lg p-4 bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="date" stroke="#fff" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#fff" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.1)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      borderRadius: "8px",
                      color: "white"
                    }} 
                    labelStyle={{ color: "white" }}
                    itemStyle={{ color: "white" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cumulative" 
                    stroke="#ffffff" 
                    strokeWidth={4}
                    dot={false}
                    activeDot={{
                      r: 8,
                      style: { fill: "#ffffff", stroke: "white", strokeWidth: 2 }
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-white">Daily Activity</h3>
              <div className="flex items-center gap-1 p-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
                <TooltipProvider>
                  {heatmapDays.map((day) => (
                    <TooltipUI key={day.dateStr}>
                      <TooltipTrigger>
                        <div 
                          className={cn(
                            "w-8 h-8 rounded-sm transition-colors",
                            getHeatmapColor(day.score)
                          )}
                        />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-medium">
                          {format(day.date, 'MMM dd, yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {day.score} XP earned
                        </p>
                      </TooltipContent>
                    </TooltipUI>
                  ))}
                </TooltipProvider>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
};

export default Analytics;
