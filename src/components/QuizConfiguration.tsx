import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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

const formSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]),
  questionTypes: z.enum(["multiple_choice", "true_false", "mixed"]),
  timeLimit: z.number().min(1).max(120),
  numberOfQuestions: z.number().min(1).max(50),
  hintsEnabled: z.boolean(),
});

type QuizConfigFormValues = z.infer<typeof formSchema>;

interface QuizConfigurationProps {
  lectureId: number;
}

const QuizConfiguration = ({ lectureId }: QuizConfigurationProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const form = useForm<QuizConfigFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      difficulty: "medium",
      questionTypes: "mixed",
      timeLimit: 30,
      numberOfQuestions: 10,
      hintsEnabled: true,
    },
  });

  const onSubmit = async (data: QuizConfigFormValues) => {
    try {
      // Here we'll later implement the quiz generation logic
      toast({
        title: "Generating Quiz",
        description: "Please wait while we generate your quiz...",
      });
      // For now, we'll just navigate back
      navigate(`/lecture/${lectureId}`);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate quiz. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    navigate(`/lecture/${lectureId}`);
  };

  return (
    <div className="container mx-auto p-4">
      <Button
        variant="ghost"
        onClick={handleBack}
        className="mb-4"
      >
        <ArrowLeft className="mr-2" />
        Back to Lecture
      </Button>
      
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <h2 className="text-2xl font-bold mb-6">Quiz Configuration</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty Level</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="easy" id="easy" />
                          <label htmlFor="easy">Easy</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="medium" id="medium" />
                          <label htmlFor="medium">Medium</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="hard" id="hard" />
                          <label htmlFor="hard">Hard</label>
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
                    <FormLabel>Question Types</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="flex space-x-4"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="multiple_choice" id="multiple_choice" />
                          <label htmlFor="multiple_choice">Multiple Choice</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true_false" id="true_false" />
                          <label htmlFor="true_false">True/False</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="mixed" id="mixed" />
                          <label htmlFor="mixed">Mixed</label>
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
                    <FormLabel>Time Limit (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        min={1}
                        max={120}
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
                    <FormLabel>Number of Questions</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        min={1}
                        max={50}
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
                      <FormLabel>Enable Hints</FormLabel>
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

              <Button type="submit" className="w-full">
                Generate Quiz
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizConfiguration;