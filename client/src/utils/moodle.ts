import { getOfflineCourse, saveCourseOffline } from "../db";

export const proxyUrl = (url: string) =>
  url.replace("http://localhost:8000", "/moodle-api");

export const fileUrl = (url: string) => {
  const token = localStorage.getItem("moodle_token");
  return `${proxyUrl(url)}&token=${token}`;
};

export const ensureCourseStructure = async (
  courseId: number
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
    console.error("Failed to ensure course structure:", error);
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
