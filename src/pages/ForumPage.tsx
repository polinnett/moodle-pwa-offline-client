import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { getForumsByCourse, getForumDiscussions } from '../api/moodle'
import { useOfflineStatus } from '../hooks/useOfflineStatus'
import { getOfflineLesson } from '../db'
import { Icon } from '../components/ui/Icon'

interface Discussion {
  id: number
  name: string
  message: string
  userfullname: string
  created: number
  numreplies: number
}

interface Forum {
  id: number
  name: string
  intro: string
  numdiscussions: number
  cmid: number
}

export const ForumPage = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const [forum, setForum] = useState<Forum | null>(null)
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const [selected, setSelected] = useState<Discussion | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [isSaved, setIsSaved] = useState(false)
  const isOnline = useOfflineStatus()

  useEffect(() => {
    getOfflineLesson(Number(moduleId)).then(l => setIsSaved(!!l))
  }, [moduleId])

  useEffect(() => {
    const init = async () => {
      try {
        const forums = await getForumsByCourse(Number(courseId))
        const found = forums.find((f: Forum) => f.cmid === Number(moduleId))
        if (!found) throw new Error('Форум не найден')
        setForum(found)
        const disc = await getForumDiscussions(found.id)
        setDiscussions(disc)
        setStatus('ok')
      } catch {
          try {
            const saved = await getOfflineLesson(Number(moduleId))
            if (saved) {
              try {
                const parsed = JSON.parse(saved.html)
                if (parsed.discussions && Array.isArray(parsed.discussions)) {
                  setDiscussions(parsed.discussions)
                  setForum({ id: 0, name: saved.name, intro: parsed.intro ?? '', numdiscussions: 0, cmid: Number(moduleId) })
                } else if (Array.isArray(parsed)) {
                  setDiscussions(parsed)
                  setForum({ id: 0, name: saved.name, intro: '', numdiscussions: 0, cmid: Number(moduleId) })
                }
              } catch {}
              setStatus('ok')
            } else {
              setStatus('error')
            }
          } catch {
            setStatus('error')
          }
        }
    }
    init()
  }, [courseId, moduleId])

  const handleSave = async () => {
    const { saveLessonOffline } = await import('../db')
    const { ensureCourseStructure } = await import('../utils/moodle')
    await ensureCourseStructure(Number(courseId))
    
    await saveLessonOffline({
      id: Number(moduleId),
      courseId: Number(courseId),
      name: forum?.name ?? '',
      html: JSON.stringify({ intro: forum?.intro ?? '', discussions }),
      savedAt: Date.now(),
    })    
    setIsSaved(true)
  }

  const navigate = useNavigate()

  const handleDelete = async () => {
    const { deleteOfflineLesson } = await import('../db')
    await deleteOfflineLesson(Number(moduleId))
    setIsSaved(false)
    const { getOfflineCourse, saveCourseOffline } = await import('../db')
    const course = await getOfflineCourse(Number(courseId))
    if (course) {
      await saveCourseOffline({ ...course, fullyDownloaded: false })
    }
    if (!isOnline) navigate(`/courses/${courseId}`)
  }

  if (status === 'loading') {
    return (
      <Layout title="Форум" showBack>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-gray-200 dark:bg-gray-700"/>
          ))}
        </div>
      </Layout>
    )
  }

  if (status === 'error') {
    return (
      <Layout title="Форум" showBack>
        <div className="rounded-2xl p-6 text-center
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700"
        >
          <div className="flex justify-center mb-3">
            <Icon name="default" size={48} />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {!navigator.onLine ? 'Форум не сохранен для офлайна' : 'Не удалось загрузить форум'}
          </p>
        </div>
      </Layout>
    )
  }

  if (selected) {
    return (
      <Layout title={selected.name} showBack>
        <div className="rounded-2xl p-6
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700 space-y-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900
              flex items-center justify-center shrink-0"
            >
              <span className="text-sm font-bold text-green-700 dark:text-green-300">
                {selected.userfullname[0]}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                {selected.userfullname}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {new Date(selected.created * 1000).toLocaleString('ru-RU')}
              </p>
            </div>
          </div>

          <div
            className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: selected.message }}
          />

          <button
            onClick={() => setSelected(null)}
            className="text-sm text-green-600 dark:text-green-400 hover:underline cursor-pointer"
          >
            ← Назад к обсуждениям
          </button>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={forum?.name ?? 'Форум'} showBack>
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
                  Сохранить
                </button>
              ) : null}
        </div>    

        {forum?.intro && forum.intro.replace(/<[^>]*>/g, '').trim() && (
          <div
            className="rounded-2xl p-5
              bg-white dark:bg-gray-800
              border border-green-100 dark:border-gray-700
              text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: forum.intro }}
          />
        )}

        <div className="rounded-2xl overflow-hidden
          bg-white dark:bg-gray-800
          border border-green-200 dark:border-gray-700"
        >
          <div className="px-4 py-3 border-b border-green-200 dark:border-gray-700
            flex items-center justify-between"
          >
            <h2 className="font-bold text-gray-900 dark:text-white">
              Обсуждения
            </h2>
          </div>

          {discussions.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              {!navigator.onLine ? 'Обсуждения недоступны офлайн' : 'Нет обсуждений'}
            </div>
          ) : (
            discussions.map(disc => (
              <button
                key={disc.id}
                onClick={() => setSelected(disc)}
                className="w-full text-left px-4 py-3
                  border-b border-gray-100 dark:border-gray-700 last:border-b-0
                  hover:bg-green-50 dark:hover:bg-gray-700
                  transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                      {disc.name}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {disc.userfullname} · {new Date(disc.created * 1000).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                  {disc.numreplies > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full shrink-0
                      bg-green-100 text-green-700
                      dark:bg-green-900 dark:text-green-300"
                    >
                      {disc.numreplies} отв.
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </Layout>
  )
}
