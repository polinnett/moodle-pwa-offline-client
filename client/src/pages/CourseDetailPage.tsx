import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { getCourseContents } from "../api/moodle";
import { getOfflineCourse } from "../db";
import { useOfflineStatus } from "../hooks/useOfflineStatus";
import { Layout } from "../components/layout/Layout";
import type { CourseSection, CourseModule } from "../types";
import { Icon } from "../components/ui/Icon";
import { CourseUpdates } from "../components/features/CourseUpdates";
import { SectionBlock } from "../components/course/SectionBlock";
import { DownloadButton } from "../components/course/DownloadButton";

export const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const isOnline = useOfflineStatus();
  const id = Number(courseId);
  const [refreshKey, setRefreshKey] = useState(0);

  const {
    data: sections,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["course", id],
    queryFn: () => getCourseContents(id),
    enabled: isOnline,
    retry: false,
  });

  const [offlineSections, setOfflineSections] = useState<CourseSection[]>([]);
  const [courseName, setCourseName] = useState("");

  const loadOfflineCourse = () => {
    getOfflineCourse(id).then((c) => {
      if (c) {
        setOfflineSections(c.sections);
        setCourseName(c.fullname);
      } else {
        setOfflineSections([]);
        setCourseName("");
      }
    });
  };

  const { data: courses } = useQuery({
    queryKey: ["courses"],
    queryFn: () => import("../api/moodle").then((m) => m.getMyCourses()),
    enabled: isOnline,
  });

  useEffect(() => {
    if (!isOnline) loadOfflineCourse();
  }, [id, isOnline]);

  const currentCourse = courses?.find((c) => c.id === id);
  const title = isOnline ? (currentCourse?.fullname ?? "Курс") : courseName;

  const displaySections = isOnline ? (sections ?? []) : offlineSections;

  const handleModuleClick = (module: CourseModule) => {
    if (module.modname === "quiz") {
      navigate(`/courses/${id}/quiz/${module.id}`);
    } else if (module.modname === "forum") {
      navigate(`/courses/${id}/forum/${module.id}`);
    } else {
      navigate(`/courses/${id}/lessons/${module.id}`);
    }
  };

  return (
    <Layout title={title} showBack>
      <div className="space-y-3">
        {sections && (
          <div className="flex justify-end">
            <DownloadButton
              courseId={id}
              courseName={title}
              courseSummary={currentCourse?.summary}
              sections={sections}
              onRefresh={() => {
                setRefreshKey((k) => k + 1);
                if (!isOnline) loadOfflineCourse();
              }}
            />
          </div>
        )}

        {sections && sections.length > 0 && (
          <CourseUpdates
            courseId={id}
            courseName={title}
            modules={sections
              .flatMap((s) => s.modules)
              .filter((m) => m.visible !== 0)
              .map((m) => ({
                id: m.id,
                name: m.name,
                timemodified: m.contents?.[0]?.timemodified ?? 0,
              }))}
          />
        )}

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="rounded-2xl p-4 bg-white dark:bg-gray-800
                border border-green-200 dark:border-gray-700 animate-pulse"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-full" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-sm text-center py-4 text-red-500 dark:text-red-400">
            Не удалось загрузить курс. Проверьте подключение.
          </div>
        )}

        {!isOnline && offlineSections.length === 0 && (
          <div className="text-center py-16">
            <div className="flex justify-center mb-3">
              <Icon name="default" size={48} />
            </div>
            <p className="text-sm text-gray-800 dark:text-white">
              Этот курс не скачан для офлайна
            </p>
          </div>
        )}

        {displaySections.map((section) => (
          <SectionBlock
            key={`${section.id}-${refreshKey}`}
            section={section}
            onModuleClick={handleModuleClick}
            refreshKey={refreshKey}
          />
        ))}
      </div>
    </Layout>
  );
};
