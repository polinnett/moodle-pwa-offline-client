import { useState, useEffect } from 'react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import type { CourseModule } from '../../types'
import { ensureCourseStructure } from '../../utils/moodle';
import { getOfflineLesson } from '../../db';
import { ModuleDescription } from '../ModuleDescription';

export const UrlContent = ({ module, courseId }: { module: CourseModule; courseId: number }) => {
    const url = module.contents?.[0]?.fileurl
    const [isSaved, setIsSaved] = useState(false)
    const isOnline = useOfflineStatus()
  
    useEffect(() => {
      getOfflineLesson(module.id).then(l => setIsSaved(!!l))
    }, [module.id])
  
    const handleSave = async () => {
      await ensureCourseStructure(courseId)
      const { saveLessonOffline } = await import('../../db')
      await saveLessonOffline({
        id: module.id,
        courseId: 0,
        name: module.name,
        html: '',
        savedAt: Date.now(),
      })
      setIsSaved(true)
    }
  
    const handleDelete = async () => {
      const { deleteOfflineLesson } = await import('../../db')
      await deleteOfflineLesson(module.id)
      setIsSaved(false)
    }
  
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          {isOnline && (
            isSaved ? (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                  font-medium cursor-pointer transition-colors
                  bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600
                  dark:bg-green-900 dark:text-green-300
                  dark:hover:bg-red-900/30 dark:hover:text-red-400"
              >
                <span>Удалить</span>
              </button>
            ) : (
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                  font-medium cursor-pointer transition-colors
                  bg-green-500 text-white hover:bg-green-600
                  dark:bg-green-600 dark:hover:bg-green-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Сохранить
              </button>
            )
          )}
        </div>
  
        <ModuleDescription description={module.description} />
  
        <div className="rounded-2xl p-6
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700"
        >
          <p className="text-sm text-gray-800 dark:text-white mb-1">
            Нажмите на ссылку, чтобы открыть ресурс:
          </p>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-green-600 dark:text-green-400
                hover:underline break-words leading-relaxed"
            >
              {module.name}
            </a>
          ) : (
            <p className="text-sm text-gray-400">Ссылка недоступна</p>
          )}
        </div>
      </div>
    )
}