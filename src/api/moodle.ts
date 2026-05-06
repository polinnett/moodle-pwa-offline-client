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

export const getPageContent = async (moduleId: number): Promise<string> => {
  const response = await ws("mod_page_get_pages_by_courses", {});
  const pages = response.data.pages as Array<{
    coursemodule: number;
    content: string;
  }>;
  const page = pages.find((p) => p.coursemodule === moduleId);
  return page?.content ?? "";
};

export const transcribeVideo = async (videoUrl: string): Promise<string> => {
  const response = await fetch(videoUrl);
  const blob = await response.blob();

  const formData = new FormData();
  formData.append("file", blob, "video.mp4");

  const result = await fetch("http://localhost:9000/transcribe", {
    method: "POST",
    body: formData,
  });

  if (!result.ok) throw new Error("Ошибка расшифровки");

  const data = await result.json();
  return data.text;
};
