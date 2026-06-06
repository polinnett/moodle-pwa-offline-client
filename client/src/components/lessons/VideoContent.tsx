import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { CourseModule } from '../../types'
import { ensureCourseStructure, fileUrl } from '../../utils/moodle';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import { Icon } from '../ui/Icon'
import { ModuleDescription } from './ModuleDescription';
import { extractAudio } from '../../api/moodle';
import { TranscribeButton } from './TranscribeButton';

export const VideoContent = ({ module, courseId }: { module: CourseModule; courseId: number }) => {
    const videoFile = module.contents?.find(c => c.mimetype === 'video/mp4')
    if (!videoFile) return null
  
    const videoSrc = fileUrl(videoFile.fileurl)
    const fileSizeMb = (videoFile.filesize / 1024 / 1024).toFixed(1)
  
    const [cachedUrl, setCachedUrl] = useState<string | null>(null)
    const [caching, setCaching] = useState(false)
    const [cacheProgress, setCacheProgress] = useState(0)
    const [extractingAudio, setExtractingAudio] = useState(false)
    const isOnline = useOfflineStatus()
    const navigate = useNavigate()
    const { courseId: routeCourseId } = useParams()
  
    useEffect(() => {
      const checkCache = async () => {
        const cache = await caches.open('moodle-videos')
        const match = await cache.match(videoSrc)
        if (match) {
          const blob = await match.blob()
          setCachedUrl(URL.createObjectURL(blob))
        }
      }
      checkCache()
    }, [videoSrc])

    if (!isOnline && !cachedUrl) {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl p-6 text-center
            bg-white dark:bg-gray-800
            border border-green-100 dark:border-gray-700"
          >
            <div className="flex justify-center mb-3">
              <Icon name="default" size={48} />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Видео не сохранено для офлайна
            </p>
          </div>
        </div>
      )
    }
  
    const handleSaveOffline = async () => {
      await ensureCourseStructure(courseId)
      setCaching(true)
      setCacheProgress(0)
      try {
        const token = localStorage.getItem('moodle_token')
        const response = await fetch(videoSrc, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const reader = response.body?.getReader()
        const contentLength = Number(response.headers.get('Content-Length') ?? videoFile.filesize)
        const chunks: ArrayBuffer[] = []
        let received = 0
  
        if (reader) {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength))
            received += value.length
            setCacheProgress(Math.round((received / contentLength) * 100))
          }
        }
  
        const blob = new Blob(chunks, { type: 'video/mp4' })
        const cache = await caches.open('moodle-videos')
        await cache.put(videoSrc, new Response(blob, {
          headers: { 'Content-Type': 'video/mp4' }
        }))
        setCachedUrl(URL.createObjectURL(blob))
      } catch (e) {
        if (e instanceof DOMException && e.name === 'QuotaExceededError') {
          alert('Недостаточно места в хранилище браузера. Удалите ненужные файлы.')
        }
        throw e
      }
        finally {
        setCaching(false)
      }
    }
  
    const handleDeleteCache = async () => {
      const cache = await caches.open('moodle-videos')
      await cache.delete(videoSrc)
      setCachedUrl(null)
    
      const { getOfflineCourse, saveCourseOffline, deleteOfflineCourse, getOfflineLesson } = await import('../../db')
      const course = await getOfflineCourse(courseId)
      if (course) {
        const hasUrlModules = course.sections
          .flatMap(s => s.modules)
          .some(m => m.modname === 'url')
    
        const hasAnyLesson = await Promise.all(
          course.sections.flatMap(s => s.modules)
            .filter(m => m.modname !== 'url')
            .map(m => getOfflineLesson(m.id))
        ).then(results => results.some(r => !!r))
    
        const videoCache = await caches.open('moodle-videos')
        const hasVideos = await Promise.all(
          course.sections.flatMap(s => s.modules)
            .filter(m => m.contents?.some(c => c.mimetype === 'video/mp4'))
            .map(async m => {
              const vf = m.contents?.find(c => c.mimetype === 'video/mp4')
              if (!vf?.fileurl) return false
              const token = localStorage.getItem('moodle_token')
              const url = `${vf.fileurl.replace('http://localhost:8000', '/moodle-api')}&token=${token}`
              return !!(await videoCache.match(url))
            })
        ).then(results => results.some(r => r))
    
        if (!hasAnyLesson && !hasVideos && !hasUrlModules) {
          await deleteOfflineCourse(courseId)
        } else {
          await saveCourseOffline({ ...course, fullyDownloaded: false })
        }
      }
    
      if (!isOnline) navigate(`/courses/${routeCourseId}`)
    }
  
    const handleExtractAudio = async () => {
      setExtractingAudio(true)
      try {
        await extractAudio(videoSrc)
      } finally {
        setExtractingAudio(false)
      }
    }
  
    return (
      <div className="space-y-4">
        <ModuleDescription description={module.description} />
        <div className="rounded-2xl overflow-hidden bg-black">
          <video controls className="w-full max-h-72" src={cachedUrl ?? videoSrc}>
            Ваш браузер не поддерживает видео
          </video>
        </div>
  
        <div className="rounded-2xl p-4 space-y-2 bg-white dark:bg-gray-800 border border-green-100 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Офлайн-доступ
          </p>
  
          {cachedUrl ? (
            <button
              onClick={handleDeleteCache}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer bg-green-50 hover:bg-red-50 dark:bg-gray-700 dark:hover:bg-red-900/20"
            >
              <Icon name="ok" size={20} />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-white">Сохранено офлайн</p>
                <p className="text-xs text-gray-400">Нажмите чтобы удалить из кэша</p>
              </div>
            </button>
          ) : (
            <button
              onClick={handleSaveOffline}
              disabled={caching}
              aria-live="polite"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer bg-green-50 hover:bg-green-100 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-70"
            >
              <Icon name="offline" size={20} />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {caching ? `Сохраняем... ${cacheProgress}%` : 'Сохранить для офлайна'}
                </p>
                <p className="text-xs text-gray-400">{fileSizeMb} МБ • видео останется в браузере</p>
              </div>
              {!caching && <Icon name="download" size={16} />}
            </button>
          )}
  
          {caching && (
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${cacheProgress}%` }}
              />
            </div>
          )}

          {isOnline && (
            <a
              href={videoSrc}
              download={videoFile.filename}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer bg-green-50 hover:bg-green-100 dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <Icon name="video" size={20} />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-white">Скачать на устройство</p>
                <p className="text-xs text-gray-400">{fileSizeMb} МБ • MP4</p>
              </div>
              <Icon name="download" size={16} />
            </a>
          )}
  
          {isOnline && (
            <button
              onClick={handleExtractAudio}
              disabled={extractingAudio}
              aria-live="polite"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer bg-green-50 hover:bg-green-100 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              <Icon name="audio" size={20} />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {extractingAudio ? 'Извлекаем аудио...' : 'Скачать аудио'}
                </p>
                <p className="text-xs text-gray-400">Только звук • MP3</p>
              </div>
              {!extractingAudio && <Icon name="download" size={16} />}
            </button>
          )}
          <TranscribeButton videoUrl={videoSrc} videoName={module.name} />
        </div>
      </div>
    )
}
