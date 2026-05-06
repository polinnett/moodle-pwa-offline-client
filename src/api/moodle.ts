import { moodleClient } from "./client";
import type { AuthToken, Course, CourseSection } from "../types";

const WS = "/webservice/rest/server.php";

const ws = (wsfunction: string, params = {}) =>
  moodleClient.get(WS, {
    params: {
      wsfunction,
      moodlewsrestformat: "json",
      ...params,
    },
  });

export const login = async (
  username: string,
  password: string
): Promise<AuthToken> => {
  const response = await moodleClient.get("/login/token.php", {
    params: {
      username,
      password,
      service: "moodle_mobile_app",
    },
  });

  if (response.data.error) {
    throw new Error(response.data.error);
  }

  return response.data;
};

export const getMyCourses = async (): Promise<Course[]> => {
  const userResp = await ws("core_webservice_get_site_info");
  const userId = userResp.data.userid;

  const response = await ws("core_enrol_get_users_courses", { userid: userId });
  return response.data;
};

export const getCourseContents = async (
  courseId: number
): Promise<CourseSection[]> => {
  const response = await ws("core_course_get_contents", { courseid: courseId });
  return response.data;
};
