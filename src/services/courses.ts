import { apiRequest } from "./api";
import type { Course } from "../types/course";

export async function getCourses(userid: number): Promise<Course[]> {
  return apiRequest<Course[]>("core_enrol_get_users_courses", {
    userid,
  });
}
