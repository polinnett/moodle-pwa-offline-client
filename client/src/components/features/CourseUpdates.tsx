import { useState, useEffect, useRef } from "react";
import { useOfflineStatus } from "../../hooks/useOfflineStatus";

interface SnapshotItem {
  id: number;
  name: string;
  timemodified?: number;
}

interface CourseUpdate {
  id: number;
  course_name: string;
  description: string;
  detected_at: string;
  is_read: boolean;
}

const BACKEND_URL = "http://localhost:8001";

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: localStorage.getItem("moodle_token") ?? "",
});

export const CourseUpdates = ({
  courseId,
  courseName,
  modules,
}: {
  courseId: number;
  courseName: string;
  modules: SnapshotItem[];
}) => {
  const isOnline = useOfflineStatus();
  const [updates, setUpdates] = useState<CourseUpdate[]>([]);
  const [visible, setVisible] = useState(false);

  const isChecking = useRef(false);

  const checkUpdates = async () => {
    if (!isOnline || modules.length === 0) return;
    if (isChecking.current) return;
    isChecking.current = true;
    try {
      const res = await fetch(`${BACKEND_URL}/updates/check`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          course_id: courseId,
          course_name: courseName,
          modules,
        }),
      });
      const data = await res.json();
      if (data.has_updates) {
        await loadUpdates();
        setVisible(true);
      }
    } catch {
      // не удалось проверить обновления, сервер недоступен или нет соединения
    } finally {
      isChecking.current = false;
    }
  };

  const loadUpdates = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/updates/?course_id=${courseId}`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      setUpdates(data);
      if (data.length > 0) setVisible(true);
    } catch {
      // не удалось загрузить уведомления – сервер недоступен
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(`${BACKEND_URL}/updates/read-all`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      setUpdates([]);
      setVisible(false);
    } catch {
      // не удалось отметить уведомления прочитанными
    }
  };

  const markRead = async (id: number) => {
    try {
      await fetch(`${BACKEND_URL}/updates/${id}/read`, {
        method: "PATCH",
        headers: getAuthHeaders(),
      });
      setUpdates((prev) => prev.filter((u) => u.id !== id));
      if (updates.length <= 1) setVisible(false);
    } catch {
      // не удалось отметить уведомление прочитанным
    }
  };

  useEffect(() => {
    if (isOnline && modules.length > 0) {
      isChecking.current = false;
      checkUpdates();
      loadUpdates();
    }
  }, [
    courseId,
    isOnline,
    modules.length,
    modules.map((m) => m.name).join(","),
    modules.map((m) => m.timemodified).join(","),
  ]);

  if (!visible || updates.length === 0) return null;

  return (
    <div
      className="rounded-2xl overflow-hidden
      bg-white dark:bg-gray-800
      border border-green-200 dark:border-gray-700 shadow-sm"
    >
      <div
        className="px-4 py-3 border-b border-green-200 dark:border-gray-700
        flex items-center justify-between gap-2 flex-wrap"
      >
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
            Уведомления об изменениях в курсе
          </h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full
            bg-green-100 text-green-700
            dark:bg-green-900 dark:text-green-300"
          >
            {updates.length}
          </span>
        </div>
        <button
          onClick={markAllRead}
          className="text-xs text-green-500 dark:text-green-600
            hover:underline cursor-pointer"
        >
          Отметить все прочитанными
        </button>
      </div>

      <div className="divide-y divide-green-100 dark:divide-gray-700 p-1">
        {updates.map((update) => (
          <div
            key={update.id}
            className="flex items-start justify-between gap-3
              px-3 py-2.5 rounded-xl"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {update.description}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {new Date(update.detected_at).toLocaleString("ru-RU")}
              </p>
            </div>
            <button
              onClick={() => markRead(update.id)}
              className="text-gray-300 hover:text-gray-500
                dark:hover:text-gray-400 transition-colors
                shrink-0 cursor-pointer text-lg leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-green-100 dark:border-gray-700">
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Рекомендуем обновить офлайн-пакет курса
        </p>
      </div>
    </div>
  );
};
