
import { Course } from './types';

// Mock API for courses
const mockCourses: Course[] = [
  { id: '1', name: 'Introduction to React' },
  { id: '2', name: 'Advanced JavaScript' },
  { id: '3', name: 'TypeScript Fundamentals' },
];

// Function to get all courses
export const getCourses = async (): Promise<Course[]> => {
  // Simulating API call with a delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockCourses);
    }, 1000);
  });
};

// Function to create a new course
export const createCourse = async (course: Omit<Course, 'id'>): Promise<Course> => {
  // Simulating API call with a delay
  return new Promise((resolve) => {
    setTimeout(() => {
      const newCourse = {
        ...course,
        id: Math.random().toString(36).substring(2, 9),
      };
      mockCourses.push(newCourse);
      resolve(newCourse);
    }, 1000);
  });
};
