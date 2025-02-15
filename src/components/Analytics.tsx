import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { BookOpen, Star, Flame } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";

const Analytics = () => {
  const { user } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState("7");
  const [totalLectures, setTotalLectures] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ["analytics", user?.id, selectedTimeRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics")
        .select("*")
        .eq("user_id", user?.id)
        .order("date", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const fetchTotalLectures = async () => {
      const { count, error } = await supabase
        .from("lectures")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user?.id);

      if (!error && count !== null) {
        setTotalLectures(count);
      }
    };

    const fetchTotalXP = async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("xp")
        .eq("id", user?.id)
        .single();

      if (!error && data) {
        setTotalXP(data.xp);
      }
    };

    const fetchCurrentStreak = async () => {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("current_streak")
        .eq("id", user?.id)
        .single();

      if (!error && data) {
        setCurrentStreak(data.current_streak);
      }
    };

    if (user?.id) {
      fetchTotalLectures();
      fetchTotalXP();
      fetchCurrentStreak();
    }
  }, [user?.id]);

  const chartData = analyticsData?.map(item => ({
    date: format(new Date(item.date), "MMM d"),
    lectures: item.lectures_completed,
    xp: item.xp_earned
  })) || [];

  if (isLoading) {
    return <div className="space-y-4">
      <Skeleton className="h-[200px] w-full" />
      <Skeleton className="h-[400px] w-full" />
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
              <CardContent className="pt-6 rounded-lg bg-gradient-to-br from-orange-500/80 to-amber-400/80 hover:from-orange-500/90 hover:to-amber-400/90 transition-colors">
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
              <CardContent className="pt-6 rounded-lg bg-gradient-to-br from-violet-500/80 to-purple-400/80 hover:from-violet-500/90 hover:to-purple-400/90 transition-colors">
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

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Activity Overview</h2>
              <Select
                value={selectedTimeRange}
                onValueChange={setSelectedTimeRange}
              >
                <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="14">Last 14 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card className="bg-white/10 backdrop-blur-md border-white/20">
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorLectures" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorXP" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EC4899" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#EC4899" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="date" stroke="#ffffff80" />
                    <YAxis stroke="#ffffff80" />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: "rgba(255, 255, 255, 0.1)",
                        backdropFilter: "blur(10px)",
                        borderColor: "rgba(255, 255, 255, 0.2)",
                        borderRadius: "0.5rem"
                      }}
                      labelStyle={{ color: "white" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="lectures"
                      stroke="#8B5CF6"
                      fillOpacity={1}
                      fill="url(#colorLectures)"
                    />
                    <Area
                      type="monotone"
                      dataKey="xp"
                      stroke="#EC4899"
                      fillOpacity={1}
                      fill="url(#colorXP)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>;
};

export default Analytics;
