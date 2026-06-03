import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { getCourseContents } from '../api/moodle'
import { getOfflineCourse } from '../db'
import { useOfflineStatus } from '../hooks/useOfflineStatus'
import { Layout } from '../components/layout/Layout'
import type { CourseModule } from '../types'
import { UnsupportedContent } from '../components/lessons/UnsupportedContent'
import { BookContent } from '../components/lessons/BookContent'
import { PageContent } from '../components/lessons/PageContent'
import { PdfContent } from '../components/lessons/PdfContent'
import { QuizContent } from '../components/lessons/QuizContent'
import { UrlContent } from '../components/lessons/UrlContent'
import { VideoContent } from '../components/lessons/VideoContent'

const getModuleType = (module: CourseModule) => {
  if (module.modname === 'url') return 'url'
  if (module.modname === 'quiz') return 'quiz'
  if (module.modname === 'book') return 'book'

  if (module.modname === 'page') {
    const hasVideo = module.contents?.some(c => c.mimetype === 'video/mp4')
    if (hasVideo) return 'video'
    return 'page'
  }

  if (module.modname === 'resource') {
    const mimetype = module.contents?.[0]?.mimetype
    if (mimetype === 'video/mp4') return 'video'
    if (mimetype === 'application/pdf') return 'pdf'
  }

  return 'unsupported'
}

export const LessonPage = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>()
  const isOnline = useOfflineStatus()
  const id = Number(courseId)
  const modId = Number(moduleId)

  const { data: sections, isLoading } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourseContents(id),
    enabled: isOnline,
    retry: false,
  })

  const [module, setModule] = useState<CourseModule | null>(null)

  useEffect(() => {
    if (sections) {
      for (const section of sections) {
        const found = section.modules.find(m => m.id === modId)
        if (found) { setModule(found); break }
      }
    }
  }, [sections, modId])

  useEffect(() => {
    if (!isOnline) {
      getOfflineCourse(id).then(course => {
        if (!course) return
        for (const section of course.sections) {
          const found = section.modules.find(m => m.id === modId)
          if (found) { setModule(found); break }
        }
      })
    }
  }, [id, modId, isOnline])

  const renderContent = () => {
    if (!module) return null
    switch (getModuleType(module)) {
      case 'page':  return <PageContent module={module} courseId={id} />
      case 'video': return <VideoContent module={module} courseId={id} />
      case 'quiz':  return <QuizContent />
      case 'url':   return <UrlContent module={module} />
      case 'pdf': return <PdfContent module={module} courseId={id} />
      case 'book': return <BookContent module={module} courseId={id} />
      default:      return <UnsupportedContent module={module} />
    }
  }

  return (
    <Layout title={module?.name ?? 'Лекция'} showBack>
      <div className="space-y-4">
        {isLoading && (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded"/>
            ))}
          </div>
        )}
        {renderContent()}
      </div>
    </Layout>
  )
}