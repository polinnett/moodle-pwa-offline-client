import type { CourseSection, CourseModule } from "../../types";
import { fixImageUrls } from "../../utils/moodle";
import { ModuleItem } from "./ModuleItem";

export const SectionBlock = ({
  section,
  onModuleClick,
  refreshKey,
}: {
  section: CourseSection;
  onModuleClick: (module: CourseModule) => void;
  refreshKey: number;
}) => {
  const visibleModules = section.modules.filter((m) => m.visible !== 0);
  if (visibleModules.length === 0) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden
      bg-white dark:bg-gray-800
      border border-green-200 dark:border-gray-700 shadow-sm"
    >
      {section.name && section.name !== "General" && (
        <div
          className="px-4 py-3 border-b border-green-200 dark:border-gray-700
          bg-white dark:bg-gray-800"
        >
          <h2 className="font-bold text-xl text-gray-700 dark:text-gray-300">
            {section.name}
          </h2>
        </div>
      )}

      {section.summary && section.summary.trim() && (
        <div
          className="px-4 py-3 text-sm text-gray-800 dark:text-white
            border-b border-green-200 dark:border-gray-700
            leading-relaxed
            [&_img]:max-h-30 [&_img]:max-w-full [&_img]:object-cover [&_img]:rounded-lg [&_img]:mt-1 [&_img]:opacity-70"
          dangerouslySetInnerHTML={{ __html: fixImageUrls(section.summary) }}
        />
      )}

      <div className="divide-green-200 dark:divide-gray-700 p-1">
        {visibleModules.map((module) => (
          <ModuleItem
            key={module.id}
            module={module}
            onClick={() => onModuleClick(module)}
            refreshKey={refreshKey}
          />
        ))}
      </div>
    </div>
  );
};
