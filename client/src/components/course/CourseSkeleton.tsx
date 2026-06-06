export const CourseSkeleton = () => (
  <div
    className="rounded-2xl p-4 bg-white dark:bg-gray-800
      border border-green-100 dark:border-gray-700 animate-pulse"
  >
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
    <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-1/4 mb-3" />
    <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-full mb-1" />
    <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-2/3" />
  </div>
);
