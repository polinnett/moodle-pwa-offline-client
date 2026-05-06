import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getMyCourses } from '../api/moodle'
import { getOfflineCourses } from '../db'
import { useOfflineStatus } from '../hooks/useOfflineStatus'
import { Layout } from '../components/Layout'
import type { Course, OfflineCourse } from '../types'

const CourseCard = ({
    course,
    isDownloaded,
    onClick,
  }: {
    course: Course
    isDownloaded: boolean
    onClick: () => void
  }) => {
    const token = localStorage.getItem('moodle_token')
    const imageUrl = course.overviewfiles?.[0]?.fileurl
      ? `${course.overviewfiles[0].fileurl}?token=${token}`
      : null
  
    return (
      <button
        onClick={onClick}
        className="w-full text-left rounded-2xl overflow-hidden transition-all cursor-pointer
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700
          hover:border-green-300 dark:hover:border-green-700
          hover:shadow-md shadow-sm"
      >
        {imageUrl && (
          <div className="w-full h-32 overflow-hidden">
            <img
              src={imageUrl}
              alt={course.fullname}
              className="w-full h-full object-cover"
            />
          </div>
        )}
  
        <div className="p-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 dark:text-white leading-snug truncate">
              {course.fullname}
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {course.shortname}
            </p>
            {course.summary && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2
                line-clamp-2 leading-relaxed"
                dangerouslySetInnerHTML={{
                  __html: course.summary.replace(/<[^>]*>/g, '')
                }}
              />
            )}
          </div>
  
          {isDownloaded && (
            <span className="shrink-0 text-xs font-medium px-2 py-1 rounded-full
              bg-green-100 text-green-700
              dark:bg-green-900 dark:text-green-300"
            >
              ✓ Офлайн
            </span>
          )}
        </div>
      </button>
    )
}

const CourseSkeleton = () => (
  <div className="rounded-2xl p-4 bg-white dark:bg-gray-800
    border border-green-100 dark:border-gray-700 animate-pulse"
  >
    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"/>
    <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-1/4 mb-3"/>
    <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-full mb-1"/>
    <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-2/3"/>
  </div>
)

export const CoursesPage = () => {
  const navigate = useNavigate()
  const isOnline = useOfflineStatus()
  const [offlineCourses, setOfflineCourses] = useState<OfflineCourse[]>([])

  useEffect(() => {
    getOfflineCourses().then(setOfflineCourses)
  }, [])

  const { data: courses, isLoading, error } = useQuery({
    queryKey: ['courses'],
    queryFn: getMyCourses,
    enabled: isOnline,
    retry: false,
  })

  const displayCourses: Course[] = isOnline
    ? (courses ?? [])
    : offlineCourses.map(c => ({
        id: c.id,
        fullname: c.fullname,
        shortname: c.shortname,
        summary: '',
      }))

  const downloadedIds = new Set(offlineCourses.map(c => c.id))

  return (
    <Layout title="Мои курсы">
      <div className="space-y-3">

        {!isOnline && (
          <div className="text-sm text-center py-2 px-4 rounded-xl
            bg-yellow-50 text-yellow-700
            dark:bg-yellow-900/20 dark:text-yellow-400"
          >
            Офлайн-режим — показаны скачанные курсы
          </div>
        )}

        {isLoading && (
          <>
            <CourseSkeleton />
            <CourseSkeleton />
            <CourseSkeleton />
          </>
        )}

        {error && (
          <div className="text-sm text-center py-4 text-red-500 dark:text-red-400">
            Не удалось загрузить курсы. Проверьте подключение.
          </div>
        )}

        {displayCourses.map(course => (
          <CourseCard
            key={course.id}
            course={course}
            isDownloaded={downloadedIds.has(course.id)}
            onClick={() => navigate(`/courses/${course.id}`)}
          />
        ))}

        {!isLoading && !error && displayCourses.length === 0 && (
          <div className="text-center py-16 text-gray-400 dark:text-gray-500">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm">
              {isOnline ? 'Нет доступных курсов' : 'Нет скачанных курсов'}
            </p>
          </div>
        )}

      </div>
    </Layout>
  )
}