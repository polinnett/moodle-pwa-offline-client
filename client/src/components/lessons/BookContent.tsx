import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { getOfflineLesson } from '../../db'
import type { CourseModule } from '../../types'
import { ModuleDescription } from './ModuleDescription'
import { Icon } from '../ui/Icon'

export const BookContent = ({ module, courseId }: { module: CourseModule; courseId: number }) => {
    const token = localStorage.getItem('moodle_token')
    const [chapters, setChapters] = useState<{ title: string; fileurl: string }[]>([])
    const [currentChapter, setCurrentChapter] = useState(0)
    const [html, setHtml] = useState('')
    const [loading, setLoading] = useState(true)
    const [isSaved, setIsSaved] = useState(false)
    const [notSaved, setNotSaved] = useState(false)
    const isOnline = useOfflineStatus()
    const [saving, setSaving] = useState(false)
    const navigate = useNavigate()
  
    useEffect(() => {
      getOfflineLesson(module.id).then(l => setIsSaved(!!l))
    }, [module.id])
  
    useEffect(() => {
      const structureContent = module.contents?.find(c => c.filename === 'structure')
      if (!structureContent?.content) return
  
      const structure = JSON.parse(structureContent.content) as { title: string; href: string }[]
      const chapterFiles = module.contents?.filter(c => c.filename === 'index.html') ?? []
      const parsed = structure.map((s, i) => ({
        title: s.title,
        fileurl: chapterFiles[i]?.fileurl ?? '',
      }))
      setChapters(parsed)
    }, [module])
  
    useEffect(() => {
      if (chapters.length === 0) return
      const chapter = chapters[currentChapter]
      if (!chapter?.fileurl) return
    
      setLoading(true)
      setNotSaved(false)
    
      getOfflineLesson(module.id).then(async saved => {
        if (saved?.html) {
          const chapterCount = parseInt(saved.html)
          if (!isNaN(chapterCount)) {
            const { getOfflineLesson: getLesson } = await import('../../db')
            const chapterData = await getLesson(module.id * 1000 + currentChapter)
            if (chapterData?.html) {
              setHtml(chapterData.html)
              setLoading(false)
              return
            }
          }
        }

        if (!isOnline) {
          setLoading(false)
          setNotSaved(true)
          return
        }
      
        const cleanUrl = chapter.fileurl
          .replace('http://localhost:8000', '/moodle-api')
          .replace('?forcedownload=1', '')
        const url = `${cleanUrl}?token=${token}`
        fetch(url)
          .then(r => r.text())
          .then(text => { setHtml(text); setLoading(false) })
          .catch(() => setLoading(false))
      })
    }, [chapters, currentChapter, token, module.id, isOnline])
  
    const handleSave = async () => {
      setSaving(true)
      try {
        const { saveLessonOffline } = await import('../../db')
        const { ensureCourseStructure } = await import('../../utils/moodle')
        await ensureCourseStructure(courseId)
        const chapterFiles = module.contents?.filter(c => c.filename === 'index.html') ?? []
        
        for (let i = 0; i < chapterFiles.length; i++) {
          const ch = chapterFiles[i]
          if (!ch.fileurl) continue
          const cleanUrl = ch.fileurl
            .replace('http://localhost:8000', '/moodle-api')
            .replace('?forcedownload=1', '')
          const url = `${cleanUrl}?token=${token}`
          const res = await fetch(url)
          const html = await res.text()
          await saveLessonOffline({
            id: module.id * 1000 + i,
            courseId,
            name: `${module.name}_chapter_${i}`,
            html,
            savedAt: Date.now(),
          })
        }
        await saveLessonOffline({
          id: module.id,
          courseId,
          name: module.name,
          html: String(chapterFiles.length),
          savedAt: Date.now(),
        })
        setIsSaved(true)
        setNotSaved(false)
      } finally {
        setSaving(false)
      }
    }
  
    const handleDelete = async () => {
      const { deleteOfflineLesson, getOfflineLesson: getLesson, getOfflineCourse, saveCourseOffline, deleteOfflineCourse } = await import('../../db')
      const saved = await getLesson(module.id)
      if (saved?.html) {
        const chapterCount = parseInt(saved.html)
        if (!isNaN(chapterCount)) {
          for (let i = 0; i < chapterCount; i++) {
            await deleteOfflineLesson(module.id * 1000 + i)
          }
        }
      }
      await deleteOfflineLesson(module.id)
      setIsSaved(false)
    
      const course = await getOfflineCourse(courseId)
      if (course) {
        const hasUrlModules = course.sections
          .flatMap(s => s.modules)
          .some(m => m.modname === 'url')
    
        const hasAnyLesson = await Promise.all(
          course.sections.flatMap(s => s.modules)
            .filter(m => m.modname !== 'url')
            .map(m => getLesson(m.id))
        ).then(results => results.some(r => !!r))
    
        if (!hasAnyLesson && !hasUrlModules) {
          await deleteOfflineCourse(courseId)
        } else {
          await saveCourseOffline({ ...course, fullyDownloaded: false })
        }
      }
    
      if (!isOnline) navigate(`/courses/${courseId}`)
    }

    if (notSaved) {
      return (
        <div className="rounded-2xl p-6 text-center
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700"
        >
          <div className="flex justify-center mb-3">
            <Icon name="default" size={48} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Книга не сохранена для офлайна
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
          ) : isOnline ? (
            <button 
              onClick={handleSave}
              disabled={saving}
              aria-live="polite"
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
              {saving ? 'Скачиваем...' : 'Сохранить'}
            </button>
          ) : null}
        </div>
  
        {chapters.length > 1 && (
          <div className="rounded-2xl overflow-hidden
            bg-white dark:bg-gray-800
            border border-green-200 dark:border-gray-700"
          >
            <div className="px-4 py-3 border-b border-green-200 dark:border-gray-700">
              <h2 className="font-bold text-sm text-gray-900 dark:text-white">Содержание</h2>
            </div>
            {chapters.map((ch, i) => (
              <button
                key={i}
                onClick={() => setCurrentChapter(i)}
                aria-current={currentChapter === i ? "step" : undefined}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors cursor-pointer
                  border-b border-gray-100 dark:border-gray-700 last:border-b-0
                  ${currentChapter === i
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-gray-700'
                  }`}
              >
                {ch.title}
              </button>
            ))}
          </div>
        )}
  
        <ModuleDescription description={module.description} />
  
        <div className="rounded-2xl p-5
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700"
        >
          {loading ? (
            <div className="animate-pulse space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"/>
              ))}
            </div>
          ) : (
            <div
              className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed
                [&_table]:w-full [&_table]:border-collapse
                [&_td]:border [&_td]:border-gray-300 dark:[&_td]:border-gray-600
                [&_td]:px-3 [&_td]:py-2
                [&_th]:border [&_th]:border-gray-300 dark:[&_th]:border-gray-600
                [&_th]:px-3 [&_th]:py-2
                [&_table]:block [&_table]:overflow-x-auto
                [&_h3]:text-lg [&_h3]:font-bold [&_h3]:mb-3 [&_h3]:mt-4 [&_h3]:text-gray-900 [&_h3]:dark:text-white"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
  
        {chapters.length > 1 && (
          <div className="flex gap-3">
            <button
              onClick={() => setCurrentChapter(p => Math.max(0, p - 1))}
              disabled={currentChapter === 0}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium
                border border-green-500 text-green-600 dark:text-green-400
                hover:bg-green-50 dark:hover:bg-green-900/20
                disabled:opacity-30 disabled:cursor-not-allowed
                cursor-pointer transition-colors"
            >
              Назад
            </button>
            <button
              onClick={() => setCurrentChapter(p => Math.min(chapters.length - 1, p + 1))}
              disabled={currentChapter === chapters.length - 1}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium
                bg-green-500 hover:bg-green-600 text-white
                disabled:opacity-30 disabled:cursor-not-allowed
                cursor-pointer transition-colors"
            >
              Далее
            </button>
          </div>
        )}
      </div>
    )
}