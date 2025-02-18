import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { format, subDays, subMonths, subYears, startOfDay, eachDayOfInterval, addDays, startOfWeek, eachWeekOfInterval, addWeeks, addMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Flame, Trophy, BookOpen, Star } from "lucide-react";
import {
  Tooltip as TooltipUI,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type UserProgress = {
  quizProgress: Database['public']['Tables']['quiz_progress']['Row'][];
  progressData: Database['public']['Tables']['user_progress']['Row'][];
};

const Analytics = () => {
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year' | 'all'>('week');

  const endDate = startOfDay(new Date());
  const startDate = startOfDay(new Date(endDate.getFullYear() - 1, 0, 1)); // January 1st of previous year
  
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const weeks = eachWeekOfInterval(
    { start: startDate, end: endDate },
    { weekStartsOn: 0 } // Start weeks on Sunday
  );

  const monthPositions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(startDate.getFullYear(), i, 1); // First of each month
    return {
      month: format(date, 'MMM'),
      position: Math.floor(i * (52 / 12))
    };
  });

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
  } = useQuery<UserProgress>({
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
    if (!userProgress?.progressData.length) return new Map();
    
    const dateScores = new Map();
    userProgress.progressData.forEach(progress => {
      if (progress.completed_at) {
        const dateKey = startOfDay(new Date(progress.completed_at)).toISOString();
        dateScores.set(dateKey, (dateScores.get(dateKey) || 0) + (progress.score || 0));
      }
    });
    
    return dateScores;
  };

  const getHeatmapColor = (score: number) => {
    if (score === 0) return 'bg-white/5 border border-white/10';
    if (score <= 5) return 'bg-blue-500/20 border border-blue-500/20';
    if (score <= 10) return 'bg-blue-500/40 border border-blue-500/30';
    if (score <= 15) return 'bg-blue-500/60 border border-blue-500/40';
    if (score <= 20) return 'bg-blue-500/80 border border-blue-500/50';
    return 'bg-blue-500 border border-blue-500';
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
            <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <CardContent className="pt-6 rounded-lg bg-gradient-to-br from-emerald-500/90 to-teal-400/90 hover:from-emerald-500 hover:to-teal-400 transition-colors relative group">
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                    <BookOpen 
                      className="w-6 h-6 text-white" 
                      strokeWidth={2}
                      style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.3))' }}
                    />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white/90">Total Lectures</p>
                    <p className="text-3xl font-bold text-white drop-shadow-md">{totalLectures}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <CardContent className="pt-6 rounded-lg bg-gradient-to-br from-red-500/90 to-rose-400/90 hover:from-red-500 hover:to-rose-400 transition-colors relative group">
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                    <Flame 
                      className="w-6 h-6 text-white" 
                      strokeWidth={2}
                      style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.3))' }}
                    />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white/90">Current Streak</p>
                    <p className="text-3xl font-bold text-white drop-shadow-md">{currentStreak} days</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/50 backdrop-blur-sm border-0 shadow-md hover:shadow-lg transition-shadow overflow-hidden">
              <CardContent className="pt-6 rounded-lg bg-gradient-to-br from-amber-500/90 to-yellow-400/90 hover:from-amber-500 hover:to-yellow-400 transition-colors relative group">
                <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="p-3 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 shadow-lg">
                    <Star 
                      className="w-6 h-6 text-white" 
                      strokeWidth={2}
                      style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.3))' }}
                    />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-white/90">Total XP</p>
                    <p className="text-3xl font-bold text-white drop-shadow-md">{totalXP}</p>
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
                          "w-3 h-3 rounded-sm",
                          getHeatmapColor(score)
                        )}
                      />
                    ))}
                  </div>
                  <div className="text-sm text-white/60">More</div>
                </div>
              </div>
              
              <div className="p-6 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg">
                <div className="flex gap-2">
                  {/* Day labels column */}
                  <div className="w-12 grid grid-rows-7 gap-1 text-xs text-white/40 mt-7">
                    {weekDays.map((day) => (
                      <div key={day} className="h-4 leading-4">{day}</div>
                    ))}
                  </div>
                  
                  {/* Main grid of squares */}
                  <div className="relative flex-1">
                    <div className="grid grid-cols-[repeat(52,1fr)] gap-1 pb-8">
                      {Array.from({ length: 52 }).map((_, weekIndex) => {
                        const currentWeek = addWeeks(startDate, weekIndex);
                        return (
                          <div key={weekIndex} className="grid grid-rows-7 gap-1">
                            {Array.from({ length: 7 }).map((_, dayIndex) => {
                              const date = addDays(currentWeek, dayIndex);
                              const dateStr = startOfDay(date).toISOString();
                              const score = heatmapData.get(dateStr) || 0;
                              
                              return (
                                <TooltipProvider key={`${weekIndex}-${dayIndex}`}>
                                  <TooltipUI>
                                    <TooltipTrigger>
                                      <div 
                                        className={cn(
                                          "w-4 h-4 rounded-sm transition-all duration-300 hover:transform hover:scale-150",
                                          getHeatmapColor(score)
                                        )}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="font-medium">
                                        {format(date, 'MMM dd, yyyy')}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {score} XP earned
                                      </p>
                                    </TooltipContent>
                                  </TooltipUI>
                                </TooltipProvider>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>

                    {/* Month labels */}
                    <div className="absolute left-0 right-0 bottom-0">
                      <div className="relative h-6">
                        {monthPositions.map(({ month, position }) => (
                          <div
                            key={month}
                            className="absolute text-xs text-white/40 transform -translate-x-1/2"
                            style={{
                              left: `${(position / 52) * 100}%`
                            }}
                          >
                            {month}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>;
};

export default Analytics;
