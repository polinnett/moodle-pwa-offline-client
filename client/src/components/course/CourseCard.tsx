import type { Course } from "../../types";
import { FullOfflineBadge } from "../badges/FullOfflineBadge";
import { OfflineBadge } from "../badges/OfflineBadge";

export const CourseCard = ({
  course,
  isDownloaded,
  isFullyDownloaded,
  onClick,
  isOnline,
}: {
  course: Course;
  isDownloaded: boolean;
  isFullyDownloaded: boolean;
  onClick: () => void;
  isOnline: boolean;
}) => {
  const token = localStorage.getItem("moodle_token");
  const imageUrl =
    isOnline && course.overviewfiles?.[0]?.fileurl
      ? `${course.overviewfiles[0].fileurl}?token=${token}`
      : null;

  return (
    <button
      onClick={onClick}
      style={
        { "--hover-border": "var(--color-primary-600)" } as React.CSSProperties
      }
      className="w-full text-left rounded-2xl overflow-hidden transition-all cursor-pointer
          bg-white dark:bg-gray-800
          border-2 border-transparent
          shadow-sm
          hover:border-green-600
          hover:shadow-md
          focus:border-green-600
          focus:shadow-md
          focus:outline-none
          focus:ring-2
          focus:ring-green-500/50"
    >
      {imageUrl ? (
        <div className="w-full h-48 overflow-hidden">
          <img
            src={imageUrl}
            alt={course.fullname}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div
          className="w-full h-48 bg-gradient-to-br from-green-400 to-green-600
          dark:from-green-700 dark:to-green-900"
        />
      )}

      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 dark:text-white leading-snug truncate">
            {course.fullname}
          </h2>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {course.shortname}
          </p>
          {course.summary && (
            <p
              className="text-sm text-gray-500 dark:text-gray-400 mt-2
              line-clamp-2 leading-relaxed"
              dangerouslySetInnerHTML={{
                __html: course.summary.replace(/<[^>]*>/g, ""),
              }}
            />
          )}
        </div>

        {isFullyDownloaded ? (
          <FullOfflineBadge />
        ) : isDownloaded ? (
          <OfflineBadge />
        ) : null}
      </div>
    </button>
  );
};
