import { useState, useEffect } from 'react'
import { saveCourseOffline, getOfflineCourse, deleteOfflineCourse } from '../../db'
import { useOfflineStatus } from '../../hooks/useOfflineStatus'
import { proxyUrl } from '../../utils/moodle'
import type { CourseSection, CourseModule, OfflineCourse } from '../../types'

export const DownloadButton = ({
  courseId,
  courseName,
  courseSummary,
  sections,
  onRefresh,
}: {
  courseId: number
  courseName: string
  courseSummary?: string
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

  const cacheModule = async (module: CourseModule) => {
    const { getOfflineLesson } = await import('../../db')
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
      const { saveLessonOffline } = await import('../../db')
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
      const { saveLessonOffline } = await import('../../db')
      
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

    if (module.modname === 'url') {
      const existing = await getOfflineLesson(module.id)
      if (existing) return
      const { saveLessonOffline } = await import('../../db')
      await saveLessonOffline({ id: module.id, courseId, name: module.name, html: '', savedAt: Date.now() })
      return
    }

    if (module.modname === 'forum') {
      const existing = await getOfflineLesson(module.id)
      if (existing) return
      const { saveLessonOffline } = await import('../../db')
      try {
        const { getForumsByCourse, getForumDiscussions } = await import('../../api/moodle')
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
        summary: courseSummary,
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
      const allModules = sections.flatMap(s => s.modules)
      const hasUrlModules = allModules.some(m => m.modname === 'url')
  
      if (hasUrlModules) {
        const course = await getOfflineCourse(courseId)
        if (course) {
          await saveCourseOffline({ ...course, fullyDownloaded: false })
        }
      } else {
        await deleteOfflineCourse(courseId)
      }
  
      const { deleteOfflineLesson } = await import('../../db')
  
      for (const module of allModules) {
        if (module.modname === 'url') continue
  
        try { await deleteOfflineLesson(module.id) } catch {}
  
        const videoFile = module.contents?.find(c => c.mimetype === 'video/mp4')
        if (videoFile?.fileurl) {
          const token = localStorage.getItem('moodle_token')
          const proxiedUrl = `${videoFile.fileurl.replace('http://localhost:8000', '/moodle-api')}&token=${token}`
          const cache = await caches.open('moodle-videos')
          await cache.delete(proxiedUrl)
        }
        const pdfFile = module.contents?.find(c => c.mimetype === 'application/pdf')
        if (pdfFile?.fileurl) {
          const cache = await caches.open('moodle-files')
          await cache.delete(pdfFile.fileurl)
        }
      }
  
      setIsDownloaded(false)
      setFullyDownloaded(false)
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