import { useState, useEffect } from 'react';
import { useOfflineStatus } from '../../hooks/useOfflineStatus';
import type { CourseModule } from '../../types'
import { ensureCourseStructure } from '../../utils/moodle';
import { Icon } from '../Icon'
import { UnsupportedContent } from './UnsupportedContent';
import { ModuleDescription } from '../ModuleDescription';
import { DownloadIcon } from '../DownloadIcon';

export const PdfContent = ({ module, courseId }: { module: CourseModule; courseId: number }) => {
    const token = localStorage.getItem('moodle_token')
    const isOnline = useOfflineStatus()
    const file = module.contents?.[0]
    const [cachedUrl, setCachedUrl] = useState<string | null>(null)
    const [caching, setCaching] = useState(false)
    const [cacheProgress, setCacheProgress] = useState(0)
  
    useEffect(() => {
      const checkCache = async () => {
        if (!file?.fileurl) return
        const cache = await caches.open('moodle-files')
        const match = await cache.match(file.fileurl)
        if (match) {
          const blob = await match.blob()
          setCachedUrl(URL.createObjectURL(blob))
        }
      }
      checkCache()
    }, [file?.fileurl])
  
    if (!file) return <UnsupportedContent module={module} />
  
    const proxyUrl = file.fileurl?.replace('http://localhost:8000', '/moodle-api')
    const url = `${proxyUrl}&token=${token}`
    const openUrl = cachedUrl ?? url
    const fileSizeMb = (file.filesize / 1024 / 1024).toFixed(2)
  
    const handleSaveOffline = async () => {
      await ensureCourseStructure(courseId)
      if (!file.fileurl) return
      setCaching(true)
      setCacheProgress(0)
      try {
        const response = await fetch(url)
        const reader = response.body?.getReader()
        const contentLength = Number(response.headers.get('Content-Length') ?? file.filesize)
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
        const blob = new Blob(chunks, { type: 'application/pdf' })
        const cache = await caches.open('moodle-files')
        await cache.put(file.fileurl, new Response(blob, { headers: { 'Content-Type': 'application/pdf' } }))
        setCachedUrl(URL.createObjectURL(blob))
      } finally {
        setCaching(false)
      }
    }
  
    const handleDeleteCache = async () => {
      if (!file.fileurl) return
      const cache = await caches.open('moodle-files')
      await cache.delete(file.fileurl)
      setCachedUrl(null)
    }
  
    return (
      <div className="space-y-4">
        <ModuleDescription description={module.description} />
        <div className="rounded-2xl p-6
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700 space-y-4"
        >
          <div className="flex items-center gap-3">
            <Icon name="resource" size={24} />
            <p className="text-sm font-medium text-gray-800 dark:text-white flex-1 min-w-0 truncate">
              {file.filename}
            </p>
          </div>
  
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Размер: {fileSizeMb} МБ
          </p>
  
          {(isOnline || cachedUrl) && (
            <a  
              href={openUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-2.5 rounded-xl text-sm font-medium text-center
                bg-green-500 hover:bg-green-600 text-white
                cursor-pointer transition-colors"
            >
              Открыть PDF
            </a>
          )}
  
          {(isOnline || cachedUrl) && (
          <a 
            href={openUrl}
            download={file.filename}
            className="block w-full py-2.5 rounded-xl text-sm font-medium text-center
              border border-green-500 text-green-600 dark:text-green-400
              hover:bg-green-50 dark:hover:bg-green-900/20
              cursor-pointer transition-colors"
          >
            Скачать на устройство
          </a>
          )}
  
          {cachedUrl ? (
            <button
              onClick={handleDeleteCache}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                bg-green-50 hover:bg-red-50 dark:bg-gray-700 dark:hover:bg-red-900/20
                transition-colors cursor-pointer"
            >
              <Icon name="offline" size={20} />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-white">Сохранено офлайн</p>
                <p className="text-xs text-gray-400">Нажмите чтобы удалить из кэша</p>
              </div>
            </button>
          ) : isOnline ? (
            <button
              onClick={handleSaveOffline}
              disabled={caching}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
                bg-green-50 hover:bg-green-100 dark:bg-gray-700 dark:hover:bg-gray-600
                transition-colors cursor-pointer disabled:opacity-70"
            >
              <Icon name="offline" size={20} />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                  {caching ? `Сохраняем... ${cacheProgress}%` : 'Сохранить для офлайна'}
                </p>
                <p className="text-xs text-gray-400">{fileSizeMb} МБ</p>
              </div>
              {!caching && <DownloadIcon />}
            </button>
          ) : (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center">
              Недоступно без интернета
            </p>
          )}
  
          {caching && (
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${cacheProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    )
}