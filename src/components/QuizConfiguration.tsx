
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import BackgroundGradient from "@/components/ui/BackgroundGradient";

const formSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]),
  questionTypes: z.enum(["multiple_choice", "true_false", "mixed"]),
  timeLimit: z.number().min(1).max(30),
  numberOfQuestions: z.number().min(1).max(15),
  hintsEnabled: z.boolean(),
});

type QuizConfigFormValues = z.infer<typeof formSchema>;

const QuizConfiguration = () => {
  const navigate = useNavigate();
  const { courseId, lectureId } = useParams();
  const { toast } = useToast();
  
  const { data: lecture, isError, error } = useQuery({
    queryKey: ["lecture", lectureId],
    queryFn: async () => {
      if (!lectureId) throw new Error("Lecture ID is required");
      
      const { data, error } = await supabase
        .from("lectures")
        .select("*, courses(*)")
        .eq("id", parseInt(lectureId))
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Lecture not found");
      return data;
    },
  });

  const form = useForm<QuizConfigFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      difficulty: "medium",
      questionTypes: "mixed",
      timeLimit: 15,
      numberOfQuestions: 10,
      hintsEnabled: true,
    },
  });

  const onSubmit = async (data: QuizConfigFormValues) => {
    try {
      toast({
        title: "Generating Quiz",
        description: "Please wait while we generate your quiz...",
      });
      
      // Store config in localStorage
      localStorage.setItem(`quiz_config_${lectureId}`, JSON.stringify({
        config: data,
        lectureId: lectureId
      }));
      
      navigate(`/course/${courseId}/lecture/${lectureId}/take-quiz`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate quiz. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    if (courseId) {
      navigate(`/course/${courseId}`);
    }
  };

  if (isError) {
    return (
      <BackgroundGradient>
        <div className="container mx-auto p-4">
          <Card className="w-full max-w-2xl mx-auto bg-white/90 backdrop-blur-sm border border-white/30 shadow-md">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
              <p className="text-gray-600 mb-4">
                {error instanceof Error ? error.message : "Failed to load lecture"}
              </p>
              <Button onClick={handleBack} variant="outline">
                <ArrowLeft className="mr-2" />
                Back to Lectures
              </Button>
            </CardContent>
          </Card>
        </div>
      </BackgroundGradient>
    );
  }

  if (!lecture) {
    return (
      <BackgroundGradient>
        <div className="container mx-auto p-4">
          <Card className="w-full max-w-2xl mx-auto bg-white/90 backdrop-blur-sm border border-white/30 shadow-md">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4">Loading...</h2>
            </CardContent>
          </Card>
        </div>
      </BackgroundGradient>
    );
  }

  return (
    <BackgroundGradient>
      <div className="container mx-auto p-4">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="mb-4 gap-2 bg-white/10 backdrop-blur-sm hover:bg-white/20 border border-black text-black"
        >
          <ArrowLeft className="mr-2" />
          Back to Lectures
        </Button>
        
        <Card className="w-full max-w-2xl mx-auto bg-white/20 backdrop-blur-md border border-white/30 shadow-lg rounded-xl">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
              <span className="bg-gradient-to-r from-purple-500 to-indigo-600 bg-clip-text text-transparent">
                <BookOpen className="w-5 h-5 inline mr-1" />
                Quiz Configuration
              </span>
            </h2>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Difficulty Level</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="easy" id="easy" />
                            <label htmlFor="easy" className="text-gray-700">Easy</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="medium" id="medium" />
                            <label htmlFor="medium" className="text-gray-700">Medium</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="hard" id="hard" />
                            <label htmlFor="hard" className="text-gray-700">Hard</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="questionTypes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Question Types</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-4"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="multiple_choice" id="multiple_choice" />
                            <label htmlFor="multiple_choice" className="text-gray-700">Multiple Choice</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true_false" id="true_false" />
                            <label htmlFor="true_false" className="text-gray-700">True/False</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="mixed" id="mixed" />
                            <label htmlFor="mixed" className="text-gray-700">Mixed</label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timeLimit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Time Limit (minutes)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          min={1}
                          max={30}
                          className="bg-white/50 border-white/40"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numberOfQuestions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-700 font-medium">Number of Questions</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          min={1}
                          max={15}
                          className="bg-white/50 border-white/40"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hintsEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel className="text-gray-700 font-medium">Enable Hints</FormLabel>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg mt-4"
                >
                  Generate Quiz
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </BackgroundGradient>
  );
};

export default QuizConfiguration;
