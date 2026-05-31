import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { getCourseContents } from '../api/moodle'
import { saveCourseOffline, getOfflineCourse, deleteOfflineCourse } from '../db'
import { useOfflineStatus } from '../hooks/useOfflineStatus'
import { Layout } from '../components/Layout'
import type { CourseSection, CourseModule, OfflineCourse } from '../types'
import { Icon } from '../components/Icon'
import { getOfflineLesson } from '../db'

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
}: {
  module: CourseModule
  onClick: () => void
}) => {
  const [isSaved, setIsSaved] = useState(false)

  useEffect(() => {
    const checkSaved = async () => {
      const lesson = await getOfflineLesson(module.id)
      if (lesson) { setIsSaved(true); return }

      const videoFile = module.contents?.find(c => c.mimetype === 'video/mp4')
      if (videoFile?.fileurl) {
        const cache = await caches.open('moodle-videos')
        const match = await cache.match(videoFile.fileurl)
        if (match) { setIsSaved(true); return }
      }
    }
    checkSaved()
  }, [module.id])

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
          {isSaved && (
            <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0
              bg-green-100 text-green-700
              dark:bg-green-900 dark:text-green-300"
            >
              Офлайн
            </span>
          )}
        </div>
        {module.description && (
          <p
            className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed"
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
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
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
}: {
  section: CourseSection
  onModuleClick: (module: CourseModule) => void
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

      {section.summary && section.summary.replace(/<[^>]*>/g, '').trim() && (
        <div
          className="px-4 py-3 text-sm text-gray-800 dark:text-white
            border-b border-green-200 dark:border-gray-700
            leading-relaxed"
          dangerouslySetInnerHTML={{ __html: section.summary }}
        />
      )}

      <div className="divide-green-200 dark:divide-gray-700 p-1">
        {visibleModules.map(module => (
          <ModuleItem
            key={module.id}
            module={module}
            onClick={() => onModuleClick(module)}
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
}: {
  courseId: number
  courseName: string
  sections: CourseSection[]
}) => {
  const [isDownloaded, setIsDownloaded] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    getOfflineCourse(courseId).then(c => setIsDownloaded(!!c))
  }, [courseId])

  const handleDownload = async () => {
    setLoading(true)
    try {
      const course: OfflineCourse = {
        id: courseId,
        fullname: courseName,
        shortname: '',
        downloadedAt: Date.now(),
        sections,
      }
      await saveCourseOffline(course)
      setIsDownloaded(true)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteOfflineCourse(courseId)
      setIsDownloaded(false)
    } finally {
      setLoading(false)
    }
  }

  if (isDownloaded) {
    return (
      <button
        onClick={handleDelete}
        disabled={loading}
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

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
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

  const { data: sections, isLoading, error } = useQuery({
    queryKey: ['course', id],
    queryFn: () => getCourseContents(id),
    enabled: isOnline,
    retry: false,
  })

  const [offlineSections, setOfflineSections] = useState<CourseSection[]>([])
  const [courseName, setCourseName] = useState('')

  useEffect(() => {
    if (!isOnline) {
      getOfflineCourse(id).then(c => {
        if (c) {
          setOfflineSections(c.sections)
          setCourseName(c.fullname)
        }
      })
    }
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

        {isOnline && sections && (
          <div className="flex justify-end">
            <DownloadButton
              courseId={id}
              courseName={title}
              sections={sections}
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
            key={section.id}
            section={section}
            onModuleClick={handleModuleClick}
          />
        ))}

      </div>
    </Layout>
  )
}