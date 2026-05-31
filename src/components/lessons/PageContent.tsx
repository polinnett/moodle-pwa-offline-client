import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom'
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { getOfflineLesson, saveLessonOffline, deleteOfflineLesson } from '../../db'
import type { CourseModule } from '../../types'
import { proxyUrl, ensureCourseStructure } from '../../utils/moodle';
import { Icon } from '../ui/Icon'

export const PageContent = ({ module, courseId }: { module: CourseModule; courseId: number }) => {
    const [html, setHtml] = useState('')
    const [loading, setLoading] = useState(true)
    const [isSaved, setIsSaved] = useState(false)
    const [saving, setSaving] = useState(false)
    const isOnline = useOfflineStatus()
    const token = localStorage.getItem('moodle_token')
    const navigate = useNavigate()
  
    useEffect(() => {
      const load = async () => {
        const offline = await getOfflineLesson(module.id)
        if (offline) {
          setHtml(offline.html)
          setIsSaved(true)
          setLoading(false)
          return
        }
  
        if (!isOnline) { setLoading(false); return }
  
        const htmlFile = module.contents?.find(c => c.filename === 'index.html')
        if (!htmlFile) { setLoading(false); return }
  
        const url = `${proxyUrl(htmlFile.fileurl)}&token=${token}`
        fetch(url)
          .then(r => r.text())
          .then(text => { setHtml(text); setLoading(false) })
          .catch(() => setLoading(false))
      }
      load()
    }, [module, token, isOnline])
  
    const handleSave = async () => {
      setSaving(true)
      try {
        await ensureCourseStructure(courseId)
        await saveLessonOffline({
          id: module.id,
          courseId,
          name: module.name,
          html,
          savedAt: Date.now(),
        })
        setIsSaved(true)
      } finally {
        setSaving(false)
      }
    }
  
    const handleDelete = async () => {
      await deleteOfflineLesson(module.id)
      setIsSaved(false)
      const { getOfflineCourse, saveCourseOffline } = await import('../../db')
      const course = await getOfflineCourse(courseId)
      if (course) {
        await saveCourseOffline({ ...course, fullyDownloaded: false })
      }
      if (!isOnline) navigate(`/courses/${courseId}`)
    }
  
    if (loading) {
      return (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"/>
          ))}
        </div>
      )
    }
  
    if (!html) {
      return (
        <div className="rounded-2xl p-6 text-center
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700"
        >
          <div className="flex justify-center mb-3">
            <Icon name="default" size={48} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {isOnline ? 'Не удалось загрузить лекцию' : 'Лекция не сохранена офлайн'}
          </p>
        </div>
      )
    }
  
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          {isSaved ? (
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
              disabled={saving || !html}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
                font-medium cursor-pointer transition-colors
                bg-green-500 text-white hover:bg-green-600
                dark:bg-green-600 dark:hover:bg-green-500
                disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>{saving ? 'Сохраняем...' : 'Сохранить'}</span>
            </button>
          )}
        </div>
  
        <div
          className="rounded-2xl p-5
            bg-white dark:bg-gray-800
            border border-green-100 dark:border-gray-700
            prose prose-green dark:prose-invert max-w-none
            text-gray-800 dark:text-gray-200
            [&_table]:w-full [&_table]:block [&_table]:overflow-x-auto
            [&_td]:whitespace-nowrap [&_th]:whitespace-nowrap
            [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2
            [&_pre]:overflow-x-auto [&_pre]:whitespace-pre
            [&_code]:break-all
            [&_table]:border-collapse
            [&_td]:border [&_td]:border-gray-300 dark:[&_td]:border-gray-600
            [&_th]:border [&_th]:border-gray-300 dark:[&_th]:border-gray-600
            overflow-hidden break-words"
          dangerouslySetInnerHTML={{ __html: html }}
        />
  
      </div>
    )
  }