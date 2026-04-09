import { dbPromise } from "../db";
import { getCourses } from "./courses";
import type { Course } from "../types/course";

export async function loadCourses(userid: number): Promise<Course[]> {
  const db = await dbPromise;

  if (navigator.onLine) {
    const courses = await getCourses(userid);

    const tx = db.transaction("courses", "readwrite");
    for (const course of courses) {
      await tx.store.put(course);
    }
    await tx.done;

    return courses;
  }

  return db.getAll("courses");
}
