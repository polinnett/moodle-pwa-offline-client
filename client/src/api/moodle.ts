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
  password: string,
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
  courseId: number,
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

export const transcribeVideo = async (
  videoUrl: string,
  signal?: AbortSignal,
  language = "ru",
): Promise<string> => {
  const response = await fetch(videoUrl, { signal });
  const blob = await response.blob();

  const formData = new FormData();
  formData.append("file", blob, "video.mp4");
  formData.append("language", language);

  const result = await fetch("http://localhost:9000/transcribe", {
    method: "POST",
    body: formData,
    signal,
  });

  if (!result.ok) throw new Error("Ошибка расшифровки");

  const data = await result.json();
  return data.text;
};

export const extractAudio = async (videoUrl: string): Promise<void> => {
  const response = await fetch(videoUrl);
  const blob = await response.blob();

  const formData = new FormData();
  formData.append("file", blob, "video.mp4");

  const result = await fetch("http://localhost:9000/extract-audio", {
    method: "POST",
    body: formData,
  });

  if (!result.ok) throw new Error("Ошибка извлечения аудио");

  const audioBlob = await result.blob();
  const url = URL.createObjectURL(audioBlob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "audio.mp3";
  a.click();
  URL.revokeObjectURL(url);
};

export const getQuizzesByCourse = async (courseId: number) => {
  const response = await ws("mod_quiz_get_quizzes_by_courses", {
    "courseids[0]": courseId,
  });
  return response.data.quizzes;
};

export const getOrStartAttempt = async (quizId: number) => {
  const token = localStorage.getItem("moodle_token");

  const savedAttemptId = localStorage.getItem(`quiz_attempt_${quizId}`);
  if (savedAttemptId) {
    const checkResp = await fetch(
      `/moodle-api/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_quiz_get_attempt_data&attemptid=${savedAttemptId}&page=0&moodlewsrestformat=json`,
    );
    const checkData = await checkResp.json();
    if (checkData.attempt && checkData.attempt.state === "inprogress") {
      return checkData.attempt;
    }
    localStorage.removeItem(`quiz_attempt_${quizId}`);
  }

  const unfinishedResp = await fetch(
    `/moodle-api/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_quiz_get_user_attempts&quizid=${quizId}&status=unfinished&moodlewsrestformat=json`,
  );
  const unfinishedData = await unfinishedResp.json();
  const inProgress = unfinishedData.attempts?.find(
    (a: { state: string }) => a.state === "inprogress",
  );
  if (inProgress) {
    localStorage.setItem(`quiz_attempt_${quizId}`, String(inProgress.id));
    return inProgress;
  }

  const allResp = await fetch(
    `/moodle-api/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_quiz_get_user_attempts&quizid=${quizId}&status=finished&moodlewsrestformat=json`,
  );
  const allData = await allResp.json();
  const finishedAttempts = allData.attempts ?? [];

  const quizzesResp = await fetch(
    `/moodle-api/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_quiz_get_quizzes_by_courses&moodlewsrestformat=json`,
  );
  const quizzesData = await quizzesResp.json();
  const quiz = quizzesData.quizzes?.find(
    (q: { id: number }) => q.id === quizId,
  );
  const maxAttempts = quiz?.attempts ?? 0;

  if (maxAttempts > 0 && finishedAttempts.length >= maxAttempts) {
    throw new Error("NO_ATTEMPTS_LEFT");
  }

  const response = await fetch("/moodle-api/webservice/rest/server.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      wstoken: token ?? "",
      wsfunction: "mod_quiz_start_attempt",
      moodlewsrestformat: "json",
      quizid: String(quizId),
    }),
  });
  const data = await response.json();

  if (data.attempt) {
    localStorage.setItem(`quiz_attempt_${quizId}`, String(data.attempt.id));
    return data.attempt;
  }

  throw new Error("Не удалось получить попытку");
};

export const getAttemptData = async (attemptId: number, page: number = 0) => {
  const response = await ws("mod_quiz_get_attempt_data", {
    attemptid: attemptId,
    page,
  });
  return response.data;
};

export const saveAttemptAnswers = async (
  attemptId: number,
  data: Record<string, string>,
) => {
  const token = localStorage.getItem("moodle_token");
  const params = new URLSearchParams({
    wstoken: token ?? "",
    wsfunction: "mod_quiz_save_attempt",
    moodlewsrestformat: "json",
    attemptid: String(attemptId),
  });

  let i = 0;
  for (const [name, value] of Object.entries(data)) {
    params.append(`data[${i}][name]`, name);
    params.append(`data[${i}][value]`, value);
    i++;
  }

  const response = await fetch("/moodle-api/webservice/rest/server.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const result = await response.json();
  return result;
};

export const finishAttempt = async (attemptId: number) => {
  const token = localStorage.getItem("moodle_token");
  const response = await fetch("/moodle-api/webservice/rest/server.php", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      wstoken: token ?? "",
      wsfunction: "mod_quiz_process_attempt",
      moodlewsrestformat: "json",
      attemptid: String(attemptId),
      finishattempt: "1",
      timeup: "0",
    }),
  });
  const result = await response.json();
  return result;
};

export const getAttemptReview = async (attemptId: number) => {
  const token = localStorage.getItem("moodle_token");
  const response = await fetch(
    `/moodle-api/webservice/rest/server.php?wstoken=${token}&wsfunction=mod_quiz_get_attempt_review&attemptid=${attemptId}&moodlewsrestformat=json`,
  );
  const result = await response.json();
  return result;
};

export const getForumsByCourse = async (courseId: number) => {
  const res = await ws("mod_forum_get_forums_by_courses", {
    "courseids[0]": courseId,
  });
  return res.data;
};

export const getForumDiscussions = async (forumId: number) => {
  const res = await ws("mod_forum_get_forum_discussions", {
    forumid: forumId,
  });
  return res.data.discussions;
};

export const getSiteInfo = async () => {
  const res = await ws("core_webservice_get_site_info", {});
  return res.data;
};

export const getSystemUsers = async () => {
  const res = await ws("core_enrol_get_enrolled_users", { courseid: 1 });
  return (
    res.data?.filter(
      (u: { username: string; email: string }) =>
        u.username !== "guest" && u.email !== "root@localhost",
    ) ?? []
  );
};
