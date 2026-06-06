import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getMyCourses } from "../api/moodle";
import { getOfflineCourses } from "../db";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import { Layout } from "../components/layout/Layout";
import type { Course, OfflineCourse } from "../types";
import { Icon } from "../components/ui/Icon";
import { CourseCard } from "../components/course/CourseCard";
import { CourseSkeleton } from "../components/course/CourseSkeleton";

export const CoursesPage = () => {
  const navigate = useNavigate();
  const isOnline = useOfflineStatus();
  const [offlineCourses, setOfflineCourses] = useState<OfflineCourse[]>([]);
  const location = useLocation();

  useEffect(() => {
    getOfflineCourses().then(setOfflineCourses);
  }, [location]);

  const {
    data: courses,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["courses"],
    queryFn: getMyCourses,
    enabled: isOnline,
    retry: false,
  });

  useEffect(() => {
    if (error) {
      localStorage.removeItem("moodle_token");
      navigate("/login");
    }
  }, [error]);

  const displayCourses: Course[] = isOnline
    ? (courses ?? [])
    : offlineCourses.map((c) => ({
        id: c.id,
        fullname: c.fullname,
        shortname: c.shortname,
        summary: c.summary ?? "",
      }));

  const downloadedIds = new Set(offlineCourses.map((c) => c.id));
  const fullyDownloadedIds = new Set(
    offlineCourses.filter((c) => c.fullyDownloaded).map((c) => c.id),
  );

  return (
    <Layout title="Мои курсы">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!isOnline && (
          <div
            className="col-span-full text-sm text-center py-2 px-4 rounded-xl
          bg-yellow-50 text-yellow-700
          dark:bg-yellow-900/20 dark:text-yellow-400"
          >
            Офлайн-режим – показаны только скачанные курсы
          </div>
        )}

        {isLoading && (
          <>
            <CourseSkeleton />
            <CourseSkeleton />
            <CourseSkeleton />
          </>
        )}

        {error && (
          <div className="text-sm text-center py-4 text-red-500 dark:text-red-400">
            Не удалось загрузить курсы. Проверьте подключение
          </div>
        )}

        {displayCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            isDownloaded={downloadedIds.has(course.id)}
            isFullyDownloaded={fullyDownloadedIds.has(course.id)}
            onClick={() => navigate(`/courses/${course.id}`)}
            isOnline={isOnline}
          />
        ))}

        {!isLoading && !error && displayCourses.length === 0 && (
          <div className="col-span-full text-center py-16">
            <div className="flex justify-center mb-3">
              <Icon name="default" size={48} />
            </div>
            <p className="text-sm text-gray-800 dark:text-white">
              {isOnline ? "Нет доступных курсов" : "Нет скачанных курсов"}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
};
