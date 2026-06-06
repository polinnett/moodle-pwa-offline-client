import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useOfflineStatus } from "../../hooks/useOfflineStatus";
import type { CourseModule } from "../../types";
import { ensureCourseStructure, proxyUrl } from "../../utils/moodle";
import { Icon } from "../ui/Icon";
import { UnsupportedContent } from "./UnsupportedContent";
import { ModuleDescription } from "./ModuleDescription";

export const PdfContent = ({
  module,
  courseId,
}: {
  module: CourseModule;
  courseId: number;
}) => {
  const token = localStorage.getItem("moodle_token");
  const isOnline = useOfflineStatus();
  const file = module.contents?.[0];
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);
  const [caching, setCaching] = useState(false);
  const [cacheProgress, setCacheProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const checkCache = async () => {
      if (!file?.fileurl) return;
      const cache = await caches.open("moodle-files");
      const match = await cache.match(file.fileurl);
      if (match) {
        const blob = await match.blob();
        setCachedUrl(URL.createObjectURL(blob));
      }
    };
    checkCache();
  }, [file?.fileurl]);

  if (!file) return <UnsupportedContent module={module} />;

  const url = `${proxyUrl(file.fileurl)}&token=${token}`;
  const openUrl = cachedUrl ?? url;
  const fileSizeMb = (file.filesize / 1024 / 1024).toFixed(2);

  if (!isOnline && !cachedUrl) {
    return (
      <div
        className="rounded-2xl p-6 text-center
        bg-white dark:bg-gray-800
        border border-green-100 dark:border-gray-700"
      >
        <div className="flex justify-center mb-3">
          <Icon name="default" size={48} />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Файл не сохранен для офлайна
        </p>
      </div>
    );
  }

  const handleSaveOffline = async () => {
    await ensureCourseStructure(courseId);
    if (!file.fileurl) return;
    setCaching(true);
    setCacheProgress(0);
    try {
      const response = await fetch(url);
      const reader = response.body?.getReader();
      const contentLength = Number(
        response.headers.get("Content-Length") ?? file.filesize,
      );
      const chunks: ArrayBuffer[] = [];
      let received = 0;
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(
            value.buffer.slice(
              value.byteOffset,
              value.byteOffset + value.byteLength,
            ),
          );
          received += value.length;
          setCacheProgress(Math.round((received / contentLength) * 100));
        }
      }
      const blob = new Blob(chunks, { type: "application/pdf" });
      const cache = await caches.open("moodle-files");
      await cache.put(
        file.fileurl,
        new Response(blob, { headers: { "Content-Type": "application/pdf" } }),
      );
      setCachedUrl(URL.createObjectURL(blob));
    } catch (e) {
      if (e instanceof DOMException && e.name === "QuotaExceededError") {
        alert(
          "Недостаточно места в хранилище браузера. Удалите ненужные файлы.",
        );
      }
      throw e;
    } finally {
      setCaching(false);
    }
  };

  const handleDeleteCache = async () => {
    if (!file.fileurl) return;
    const cache = await caches.open("moodle-files");
    await cache.delete(file.fileurl);
    setCachedUrl(null);

    const {
      getOfflineCourse,
      saveCourseOffline,
      deleteOfflineCourse,
      getOfflineLesson,
    } = await import("../../db");
    const course = await getOfflineCourse(courseId);
    if (course) {
      const hasUrlModules = course.sections
        .flatMap((s) => s.modules)
        .some((m) => m.modname === "url");

      const hasAnyLesson = await Promise.all(
        course.sections
          .flatMap((s) => s.modules)
          .filter((m) => m.modname !== "url")
          .map((m) => getOfflineLesson(m.id)),
      ).then((results) => results.some((r) => !!r));

      const pdfCache = await caches.open("moodle-files");
      const hasPdfs = await Promise.all(
        course.sections
          .flatMap((s) => s.modules)
          .filter((m) =>
            m.contents?.some((c) => c.mimetype === "application/pdf"),
          )
          .map(async (m) => {
            const pf = m.contents?.find(
              (c) => c.mimetype === "application/pdf",
            );
            if (!pf?.fileurl) return false;
            return !!(await pdfCache.match(pf.fileurl));
          }),
      ).then((results) => results.some((r) => r));

      if (!hasAnyLesson && !hasPdfs && !hasUrlModules) {
        await deleteOfflineCourse(courseId);
      } else {
        await saveCourseOffline({ ...course, fullyDownloaded: false });
      }
    }

    if (!isOnline) navigate(`/courses/${courseId}`);
  };

  return (
    <div className="space-y-4">
      <ModuleDescription description={module.description} />
      <div
        className="rounded-2xl p-6
        bg-white dark:bg-gray-800
        border border-green-100 dark:border-gray-700 space-y-4"
      >
        <div className="flex items-center gap-3">
          <Icon name="resource" size={24} />
          <p className="text-sm font-medium text-gray-800 dark:text-white flex-1 min-w-0 truncate">
            {file.filename}
          </p>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Размер: {fileSizeMb} МБ
        </p>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-2.5 rounded-xl text-sm font-medium text-center
            bg-green-500 hover:bg-green-600 text-white
            cursor-pointer transition-colors"
        >
          Открыть PDF
        </a>

        {isOnline && (
          <a
            href={url}
            download={file.filename}
            className="block w-full py-2.5 rounded-xl text-sm font-medium text-center
              border border-green-500 text-green-600 dark:text-green-400
              hover:bg-green-50 dark:hover:bg-green-900/20
              cursor-pointer transition-colors"
          >
            Скачать на устройство
          </a>
        )}

        {cachedUrl ? (
          <button
            onClick={handleDeleteCache}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
              bg-green-50 hover:bg-red-50 dark:bg-gray-700 dark:hover:bg-red-900/20
              transition-colors cursor-pointer"
          >
            <Icon name="offline" size={20} />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                Сохранено офлайн
              </p>
              <p className="text-xs text-gray-400">
                Нажмите чтобы удалить из кэша
              </p>
            </div>
          </button>
        ) : isOnline ? (
          <button
            onClick={handleSaveOffline}
            disabled={caching}
            aria-live="polite"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
              bg-green-50 hover:bg-green-100 dark:bg-gray-700 dark:hover:bg-gray-600
              transition-colors cursor-pointer disabled:opacity-70"
          >
            <Icon name="offline" size={20} />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                {caching
                  ? `Сохраняем... ${cacheProgress}%`
                  : "Сохранить для офлайна"}
              </p>
              <p className="text-xs text-gray-400">{fileSizeMb} МБ</p>
            </div>
            {!caching && <Icon name="download" size={16} />}
          </button>
        ) : null}

        {caching && (
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
            <div
              className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${cacheProgress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
