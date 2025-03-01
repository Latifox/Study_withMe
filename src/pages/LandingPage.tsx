import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/AuthProvider';
import BackgroundGradient from '@/components/ui/BackgroundGradient';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { useToast } from "@/components/ui/use-toast"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useMutation } from "@tanstack/react-query";
import { createCourse } from "@/lib/api";
import { Course } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { getCourses } from "@/lib/api";
import { Link } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton"
import { ModeToggle } from "@/components/ModeToggle"
import { GithubLogoIcon } from '@radix-ui/react-icons';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [courseName, setCourseName] = useState('');
  const { toast } = useToast()

  useEffect(() => {
    if (!loading && user) {
      // Redirect to dashboard if user is already logged in
      // navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const { mutate: createNewCourse, isPending: isCreating } = useMutation({
    mutationFn: async (newCourse: Omit<Course, 'id'>) => {
      return createCourse(newCourse);
    },
    onSuccess: () => {
      toast({
        title: "Course created successfully!",
        description: "You can now add lectures to your course.",
      })
      refetch();
      setCourseName('');
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Uh oh! Something went wrong.",
        description: "There was a problem with your request.",
      })
      console.error(error);
    },
  })

  const { data: courses, isLoading, refetch } = useQuery({
    queryKey: ['courses'],
    queryFn: getCourses,
  })

  const handleCreateCourse = () => {
    if (courseName.trim() !== '') {
      createNewCourse({ name: courseName });
    } else {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Course name cannot be empty.",
      })
    }
  };

  return (
    <BackgroundGradient>
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Welcome to Lecture Chat Synthesizer</h1>
          <div className="flex items-center gap-2">
            <ModeToggle />
            <a href="https://github.com/rohansx/lecture-chat-synthesizer" target="_blank" rel="noopener noreferrer">
              <GithubLogoIcon className="h-6 w-6" />
            </a>
          </div>
        </div>

        <Card className="w-full max-w-md mx-auto mb-8">
          <CardHeader>
            <CardTitle>Create a New Course</CardTitle>
            <CardDescription>Enter the name of your course to get started.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name">Course Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Introduction to React"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline">Cancel</Button>
            <Button onClick={handleCreateCourse} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Course"}
            </Button>
          </CardFooter>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <>
              <Skeleton className="w-full h-32" />
              <Skeleton className="w-full h-32" />
              <Skeleton className="w-full h-32" />
            </>
          ) : courses && courses.length > 0 ? (
            courses.map((course) => (
              <Link key={course.id} to={`/course/${course.id}`} className="block">
                <Card className="bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow duration-300">
                  <CardHeader>
                    <CardTitle className="text-lg font-semibold">{course.name}</CardTitle>
                    <CardDescription>Click to manage this course</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Course ID: {course.id}</p>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="text-center w-full">
              <p className="text-lg text-gray-500">No courses created yet. Start by creating one above!</p>
            </div>
          )}
        </div>
      </div>
    </BackgroundGradient>
  );
};

export default LandingPage;
