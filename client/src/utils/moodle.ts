import { getOfflineCourse, saveCourseOffline } from "../db";
import { CourseModule } from "../types";

export const proxyUrl = (url: string) =>
  url.replace("http://localhost:8000", "/moodle-api");

export const fileUrl = (url: string) => {
  const token = localStorage.getItem("moodle_token");
  return `${proxyUrl(url)}&token=${token}`;
};

export const ensureCourseStructure = async (
  courseId: number,
): Promise<void> => {
  if (!courseId) return;
  const existing = await getOfflineCourse(courseId);
  if (existing) return;

  try {
    const { getCourseContents, getMyCourses } = await import("../api/moodle");
    const [sections, courses] = await Promise.all([
      getCourseContents(courseId),
      getMyCourses(),
    ]);
    const course = courses.find((c: { id: number }) => c.id === courseId);
    await saveCourseOffline({
      id: courseId,
      fullname: course?.fullname ?? "",
      shortname: course?.shortname ?? "",
      summary: course?.summary ?? "",
      downloadedAt: Date.now(),
      sections,
    });
  } catch (error) {
    console.error("Не удалось загрузить структуру курса:", error);
  }
};

export const fixImageUrls = (html: string): string => {
  const token = localStorage.getItem("moodle_token");
  return html.replace(/src="(http:\/\/localhost:8000[^"]+)"/g, (_, url) => {
    const proxied = url.replace("http://localhost:8000", "/moodle-api");
    const separator = proxied.includes("?") ? "&" : "?";
    return `src="${proxied}${separator}token=${token}"`;
  });
};

export const getModuleType = (module: CourseModule): string => {
  if (module.modname === "url") return "url";
  if (module.modname === "quiz") return "quiz";
  if (module.modname === "book") return "book";

  if (module.modname === "page") {
    const hasVideo = module.contents?.some((c) => c.mimetype === "video/mp4");
    if (hasVideo) return "video";
    return "page";
  }

  if (module.modname === "resource") {
    const mimetype = module.contents?.[0]?.mimetype;
    if (mimetype === "video/mp4") return "video";
    if (mimetype === "application/pdf") return "pdf";
  }

  return "unsupported";
};
