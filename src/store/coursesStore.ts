import { create } from "zustand";
import type { Course } from "../types/course";

interface CoursesState {
  courses: Course[];
  setCourses: (courses: Course[]) => void;
}

export const useCoursesStore = create<CoursesState>((set) => ({
  courses: [],
  setCourses: (courses) => set({ courses }),
}));
