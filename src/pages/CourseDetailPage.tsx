import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { getCourseContents } from '../api/moodle'
import { saveCourseOffline, getOfflineCourse, deleteOfflineCourse, getOfflineLesson } from '../db'
import { useOfflineStatus } from '../hooks/useOfflineStatus'
import { Layout } from '../components/layout/Layout'
import type { CourseSection, CourseModule, OfflineCourse } from '../types'
import { Icon } from '../components/ui/Icon'
import { OfflineBadge } from '../components/badges/OfflineBadge'
import { OnlineOnlyBadge } from '../components/badges/OnlineOnlyBadge'
import { fixImageUrls } from '../utils/moodle'

const ModuleIcon = ({ modname }: { modname: string }) => {
  const icons: Record<string, string> = {
    resource: 'resource',
    page:     'page',
    url:      'url',
    folder:   'folder',
    assign:   'assign',
    quiz:     'quiz',
    forum:    'forum',
    label:    'label',
    book:     'book',
  }
  const iconName = icons[modname] ?? 'default'
  return <Icon name={iconName} size={20} />
}

const ModuleItem = ({
  module,
  onClick,
  refreshKey,
}: {
  module: CourseModule
  onClick: () => void
  refreshKey: number
}) => {
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    const checkSaved = async () => {
      setIsSaved(false)
      const lesson = await getOfflineLesson(module.id)
      if (lesson) { setIsSaved(true); return }

      const videoFile = module.contents?.find(c => c.mimetype === 'video/mp4')
      if (videoFile?.fileurl) {
        const token = localStorage.getItem('moodle_token')
        const proxiedUrl = `${videoFile.fileurl.replace('http://localhost:8000', '/moodle-api')}&token=${token}`
        const cache = await caches.open('moodle-videos')
        const match = await cache.match(proxiedUrl)
        if (match) { setIsSaved(true); return }
      }

      const pdfFile = module.contents?.find(c => c.mimetype === 'application/pdf')
      if (pdfFile?.fileurl) {
        const cache = await caches.open('moodle-files')
        const match = await cache.match(pdfFile.fileurl)
        if (match) { setIsSaved(true); return }
      }
    }
    checkSaved()
  }, [module.id, refreshKey])

  if (module.modname === 'label') {
    return (
      <div
        className="px-4 py-3 text-sm text-gray-800 dark:text-white
          leading-relaxed border-b border-green-200 dark:border-gray-700
          last:border-b-0"
        dangerouslySetInnerHTML={{ __html: module.description ?? module.name }}
      />
    )
  }

  const supportedModules = ['page', 'resource', 'url', 'quiz', 'forum', 'book']
  const isSupported = supportedModules.includes(module.modname)

  return (
    <button
      onClick={isSupported ? onClick : undefined}
      disabled={!isSupported}
      className={`w-full text-left flex items-start gap-3 px-3 py-2.5
        rounded-xl transition-colors
        ${isSupported
          ? 'hover:bg-green-50 dark:hover:bg-gray-700 cursor-pointer'
          : 'opacity-40 cursor-not-allowed'
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
          {(isSaved || module.modname === 'url') && <OfflineBadge />}
          {module.modname === 'quiz' && <OnlineOnlyBadge />}
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
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-gray-300 dark:text-gray-600 shrink-0 mt-0.5"
        >
          <path d="M9 18l6-6-6-6"/>
        </svg>
      )}
    </button>
  )
}

const SectionBlock = ({
  section,
  onModuleClick,
  refreshKey,
}: {
  section: CourseSection
  onModuleClick: (module: CourseModule) => void
  refreshKey: number
}) => {
  const visibleModules = section.modules.filter(m => m.visible !== 0)
  if (visibleModules.length === 0) return null

  return (
    <div className="rounded-2xl overflow-hidden
      bg-white dark:bg-gray-800
      border border-green-200 dark:border-gray-700 shadow-sm"
    >
      {section.name && section.name !== 'General' && (
        <div className="px-4 py-3 border-b border-green-200 dark:border-gray-700
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
        {visibleModules.map(module => (
          <ModuleItem
            key={module.id}
            module={module}
            onClick={() => onModuleClick(module)}
            refreshKey={refreshKey}
          />
        ))}
      </div>
    </div>
  )
}

const DownloadButton = ({
  courseId,
  courseName,
  sections,
  onRefresh,
}: {
  courseId: number
  courseName: string
  sections: CourseSection[]
  onRefresh: () => void
}) => {
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [fullyDownloaded, setFullyDownloaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const token = localStorage.getItem('moodle_token')
  const isOnline = useOfflineStatus()

  useEffect(() => {
    getOfflineCourse(courseId).then(c => {
      setIsDownloaded(!!c)
      setFullyDownloaded(!!c?.fullyDownloaded)
    })
  }, [courseId])

  const proxyUrl = (url: string) => url.replace('http://localhost:8000', '/moodle-api')

  const cacheModule = async (module: CourseModule) => {
    const { getOfflineLesson } = await import('../db')
    if (module.modname === 'page') {
      const hasVideo = module.contents?.some(c => c.mimetype === 'video/mp4')
      
      if (hasVideo) {
        const videoFile = module.contents?.find(c => c.mimetype === 'video/mp4')
        if (!videoFile?.fileurl) return
        const proxied = proxyUrl(videoFile.fileurl)
        const url = `${proxied}&token=${token}`
        const existing = await caches.open('moodle-videos').then(c => c.match(url))
        if (existing) return
        const res = await fetch(url)
        const blob = await res.blob()
        const cache = await caches.open('moodle-videos')
        await cache.put(url, new Response(blob, { headers: { 'Content-Type': 'video/mp4' } }))
        return
      }
    
      const existing = await getOfflineLesson(module.id)
      if (existing) return
      const htmlFile = module.contents?.find(c => c.filename === 'index.html')
      if (!htmlFile?.fileurl) return
      const url = `${proxyUrl(htmlFile.fileurl)}&token=${token}`
      const res = await fetch(url)
      const html = await res.text()
      const { saveLessonOffline } = await import('../db')
      await saveLessonOffline({ id: module.id, courseId, name: module.name, html, savedAt: Date.now() })
      return
    }

    if (module.modname === 'resource') {
      const file = module.contents?.[0]
      if (!file?.fileurl) return
      const proxied = proxyUrl(file.fileurl)
      const url = `${proxied}&token=${token}`
      const res = await fetch(url)
      const blob = await res.blob()
      const mimeType = file.mimetype === 'video/mp4' ? 'video/mp4' : 'application/pdf'
      const cacheName = file.mimetype === 'video/mp4' ? 'moodle-videos' : 'moodle-files'
      const cache = await caches.open(cacheName)
      
      if (file.mimetype === 'video/mp4') {
        await cache.put(url, new Response(blob, { headers: { 'Content-Type': mimeType } }))
      } else {
        await cache.put(file.fileurl, new Response(blob, { headers: { 'Content-Type': mimeType } }))
      }
      return
    }

    if (module.modname === 'book') {
      const existing = await getOfflineLesson(module.id)
      if (existing) return
      const chapters = module.contents?.filter(c => c.filename === 'index.html') ?? []
      const { saveLessonOffline } = await import('../db')
      
      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i]
        if (!ch.fileurl) continue
        const cleanUrl = ch.fileurl
          .replace('http://localhost:8000', '/moodle-api')
          .replace('?forcedownload=1', '')
        const url = `${cleanUrl}?token=${token}`
        const res = await fetch(url)
        const html = await res.text()
        await saveLessonOffline({
          id: module.id * 1000 + i, courseId,
          name: `${module.name}_chapter_${i}`,
          html, savedAt: Date.now(),
        })
      }
      await saveLessonOffline({
        id: module.id, courseId, name: module.name,
        html: String(chapters.length), savedAt: Date.now(),
      })
      return
    }

    if (module.modname === 'url' || module.modname === 'forum') {
      const existing = await getOfflineLesson(module.id)
      if (existing) return
      const { saveLessonOffline } = await import('../db')
      await saveLessonOffline({ id: module.id, courseId, name: module.name, html: '', savedAt: Date.now() })
    }

    if (module.modname === 'forum') {
      const existing = await getOfflineLesson(module.id)
      if (existing) return
      const { saveLessonOffline } = await import('../db')
      try {
        const { getForumsByCourse, getForumDiscussions } = await import('../api/moodle')
        const forums = await getForumsByCourse(courseId)
        const found = forums.find((f: { cmid: number }) => f.cmid === module.id)
        if (found) {
          const discussions = await getForumDiscussions(found.id)
          await saveLessonOffline({
            id: module.id, courseId, name: module.name,
            html: JSON.stringify({ intro: found.intro ?? '', discussions }),
            savedAt: Date.now(),
          })
          return
        }
      } catch {}
      await saveLessonOffline({ id: module.id, courseId, name: module.name, html: '', savedAt: Date.now() })
      return
    }
  }

  const handleDownload = async () => {
    setLoading(true)
    try {
      const course: OfflineCourse = {
        id: courseId,
        fullname: courseName,
        shortname: '',
        downloadedAt: Date.now(),
        sections,
        fullyDownloaded: true,
      }
      await saveCourseOffline(course)

      const allModules = sections.flatMap(s => s.modules).filter(m => m.visible !== 0)
      for (const module of allModules) {
        try { await cacheModule(module) } catch {}
      }

      setIsDownloaded(true)
      setFullyDownloaded(true)
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteOfflineCourse(courseId)

      const { deleteOfflineLesson } = await import('../db')
      const allModules = sections.flatMap(s => s.modules)

      for (const module of allModules) {
        try { await deleteOfflineLesson(module.id) } catch {}

        const videoFile = module.contents?.find(c => c.mimetype === 'video/mp4')
        if (videoFile?.fileurl) {
          const cache = await caches.open('moodle-videos')
          await cache.delete(videoFile.fileurl)
        }
        const pdfFile = module.contents?.find(c => c.mimetype === 'application/pdf')
        if (pdfFile?.fileurl) {
          const cache = await caches.open('moodle-files')
          await cache.delete(pdfFile.fileurl)
        }
      }

      setIsDownloaded(false)
      onRefresh()
    } finally {
      setLoading(false)
    }
  }

  if (isDownloaded && fullyDownloaded) {
    return (
      <button
        onClick={handleDelete}
        disabled={loading}
        aria-live="polite"
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm
          font-medium cursor-pointer transition-colors
          bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-600
          dark:bg-green-900 dark:text-green-300
          dark:hover:bg-red-900/30 dark:hover:text-red-400
          disabled:opacity-50"
      >
        <span>{loading ? 'Удаляем...' : 'Удалить'}</span>
      </button>
    )
  }

  if (!isOnline) return null
  return (
    <button
      onClick={handleDownload}
      disabled={loading}
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
      <span>{loading ? 'Скачиваем...' : 'Скачать'}</span>
    </button>
  )
}

export const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const isOnline = useOfflineStatus()
  const id = Number(courseId)
  const [refreshKey, setRefreshKey] = useState(0)

  const { data: sections, isLoading, error } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourseContents(id),
    enabled: isOnline,
    retry: false,
  })

  const [offlineSections, setOfflineSections] = useState<CourseSection[]>([])
  const [courseName, setCourseName] = useState('')

  const loadOfflineCourse = () => {
    getOfflineCourse(id).then(c => {
      if (c) {
        setOfflineSections(c.sections)
        setCourseName(c.fullname)
      } else {
        setOfflineSections([])
        setCourseName('')
      }
    })
  }

  useEffect(() => {
    if (!isOnline) loadOfflineCourse()
  }, [id, isOnline])

  const { data: courses } = useQuery({
    queryKey: ['courses'],
    queryFn: () => import('../api/moodle').then(m => m.getMyCourses()),
    enabled: isOnline,
  })

  const currentCourse = courses?.find(c => c.id === id)
  const title = isOnline ? (currentCourse?.fullname ?? 'Курс') : courseName

  const displaySections = isOnline ? (sections ?? []) : offlineSections

  const handleModuleClick = (module: CourseModule) => {
    if (module.modname === 'quiz') {
      navigate(`/courses/${id}/quiz/${module.id}`)
    } else if (module.modname === 'forum') {
      navigate(`/courses/${id}/forum/${module.id}`)
    } else {
      navigate(`/courses/${id}/lessons/${module.id}`)
    }
  }

  return (
    <Layout title={title} showBack>
      <div className="space-y-3">

        {sections && (
          <div className="flex justify-end">
            <DownloadButton
              courseId={id}
              courseName={title}
              sections={sections}
              onRefresh={() => {
                setRefreshKey(k => k + 1)
                if (!isOnline) loadOfflineCourse()
              }}
            />
          </div>
        )}

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl p-4 bg-white dark:bg-gray-800
                border border-green-200 dark:border-gray-700 animate-pulse"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3"/>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-full"/>
                  <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-3/4"/>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-sm text-center py-4 text-red-500 dark:text-red-400">
            Не удалось загрузить курс. Проверьте подключение.
          </div>
        )}

        {!isOnline && offlineSections.length === 0 && (
          <div className="text-center py-16">
            <div className="flex justify-center mb-3">
              <Icon name="default" size={48} />
            </div>
            <p className="text-sm text-gray-800 dark:text-white">
              Этот курс не скачан для офлайна
            </p>
          </div>
        )}

        {displaySections.map(section => (
          <SectionBlock
            key={`${section.id}-${refreshKey}`}
            section={section}
            onModuleClick={handleModuleClick}
            refreshKey={refreshKey}
          />
        ))}

      </div>
    </Layout>
  )
}
