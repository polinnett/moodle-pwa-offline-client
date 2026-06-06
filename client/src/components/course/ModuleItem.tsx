import { useState, useEffect } from "react";
import { getOfflineLesson } from "../../db";
import type { CourseModule } from "../../types";
import { OfflineBadge } from "../badges/OfflineBadge";
import { OnlineOnlyBadge } from "../badges/OnlineOnlyBadge";
import { ModuleIcon } from "./ModuleIcon";

export const ModuleItem = ({
  module,
  onClick,
  refreshKey,
}: {
  module: CourseModule;
  onClick: () => void;
  refreshKey: number;
}) => {
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const checkSaved = async () => {
      setIsSaved(false);
      const lesson = await getOfflineLesson(module.id);
      if (lesson) {
        setIsSaved(true);
        return;
      }

      const videoFile = module.contents?.find(
        (c) => c.mimetype === "video/mp4",
      );
      if (videoFile?.fileurl) {
        const token = localStorage.getItem("moodle_token");
        const proxiedUrl = `${videoFile.fileurl.replace("http://localhost:8000", "/moodle-api")}&token=${token}`;
        const cache = await caches.open("moodle-videos");
        const match = await cache.match(proxiedUrl);
        if (match) {
          setIsSaved(true);
          return;
        }
      }

      const pdfFile = module.contents?.find(
        (c) => c.mimetype === "application/pdf",
      );
      if (pdfFile?.fileurl) {
        const cache = await caches.open("moodle-files");
        const match = await cache.match(pdfFile.fileurl);
        if (match) {
          setIsSaved(true);
          return;
        }
      }
    };
    checkSaved();
  }, [module.id, refreshKey]);

  if (module.modname === "label") {
    return (
      <div
        className="px-4 py-3 text-sm text-gray-800 dark:text-white
          leading-relaxed border-b border-green-200 dark:border-gray-700
          last:border-b-0"
        dangerouslySetInnerHTML={{ __html: module.description ?? module.name }}
      />
    );
  }

  const supportedModules = ["page", "resource", "url", "quiz", "forum", "book"];
  const isSupported = supportedModules.includes(module.modname);

  return (
    <button
      onClick={isSupported ? onClick : undefined}
      disabled={!isSupported}
      className={`w-full text-left flex items-start gap-3 px-3 py-2.5
        rounded-xl transition-colors
        ${
          isSupported
            ? "hover:bg-green-50 dark:hover:bg-gray-700 cursor-pointer"
            : "opacity-40 cursor-not-allowed"
        }`}
    >
      <div className="shrink-0 mt-0.5">
        <ModuleIcon modname={module.modname} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-700 dark:text-gray-300 leading-snug">
            {module.name}
          </span>
          {(isSaved || module.modname === "url") && <OfflineBadge />}
          {module.modname === "quiz" && <OnlineOnlyBadge />}
        </div>
        {module.description && (
          <div
            className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed
              [&_img]:max-h-20 [&_img]:max-w-full [&_img]:object-cover [&_img]:rounded-lg [&_img]:mt-1 [&_img]:opacity-70"
            dangerouslySetInnerHTML={{ __html: module.description }}
          />
        )}
        {!isSupported && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Этот тип контента пока недоступен в приложении
          </p>
        )}
      </div>
      {isSupported && (
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      )}
    </button>
  );
};
