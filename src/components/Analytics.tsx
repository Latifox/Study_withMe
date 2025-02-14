
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Analytics = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<Date | undefined>(new Date());

  const { data: quizProgress, isLoading: loadingQuiz } = useQuery({
    queryKey: ['quiz-progress', user?.id, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quiz_progress')
        .select('quiz_score, completed_at, lecture_id')
        .eq('user_id', user?.id)
        .gte('completed_at', format(dateRange || new Date(), 'yyyy-MM-dd'));

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: userProgress, isLoading: loadingProgress } = useQuery({
    queryKey: ['user-progress', user?.id, dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_progress')
        .select('score, completed_at, lecture_id')
        .eq('user_id', user?.id)
        .gte('completed_at', format(dateRange || new Date(), 'yyyy-MM-dd'));

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Process data for charts
  const quizScoreData = quizProgress?.map(q => ({
    date: format(new Date(q.completed_at), 'MM/dd'),
    score: q.quiz_score
  })) || [];

  const progressByLecture = userProgress?.reduce((acc: any, curr) => {
    acc[curr.lecture_id] = (acc[curr.lecture_id] || 0) + curr.score;
    return acc;
  }, {});

  const lectureProgressData = Object.entries(progressByLecture || {}).map(([id, score]) => ({
    lecture: `Lecture ${id}`,
    score
  }));

  const averageScore = quizProgress?.reduce((sum, q) => sum + q.quiz_score, 0) / (quizProgress?.length || 1);
  const completedQuizzes = quizProgress?.length || 0;
  const completedLectures = new Set(userProgress?.map(p => p.lecture_id)).size || 0;

  if (loadingQuiz || loadingProgress) {
    return <div className="space-y-4">
      <Skeleton className="h-[400px] w-full" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-[100px]" />
        <Skeleton className="h-[100px]" />
        <Skeleton className="h-[100px]" />
      </div>
    </div>;
  }

  return (
    <div className="space-y-6 mt-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Learning Analytics</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {dateRange ? format(dateRange, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={dateRange}
              onSelect={setDateRange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Quiz Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore.toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed Quizzes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedQuizzes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Lectures in Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedLectures}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Learning Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="scores" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="scores">Quiz Scores</TabsTrigger>
              <TabsTrigger value="progress">Lecture Progress</TabsTrigger>
            </TabsList>
            
            <TabsContent value="scores" className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={quizScoreData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                    dot={{ fill: '#8884d8' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </TabsContent>

            <TabsContent value="progress" className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lectureProgressData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="lecture" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="score" fill="#8884d8">
                    {lectureProgressData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
