import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useState, useEffect, useRef } from 'react'
import { getCourseContents } from '../api/moodle'
import { saveLessonOffline, getOfflineLesson, deleteOfflineLesson, getOfflineCourse } from '../db'
import { useOfflineStatus } from '../hooks/useOfflineStatus'
import { Layout } from '../components/Layout'
import type { CourseModule } from '../types'
import { jsPDF } from 'jspdf'
import { transcribeVideo, extractAudio } from '../api/moodle'


const proxyUrl = (url: string) =>
  url.replace('http://localhost:8000', '/moodle-api')

const fileUrl = (url: string) => {
  const token = localStorage.getItem('moodle_token')
  return `${proxyUrl(url)}&token=${token}`
}

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
    viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    className="text-green-500 shrink-0"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const PageContent = ({ module, courseId }: { module: CourseModule; courseId: number }) => {
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const isOnline = useOfflineStatus()
  const token = localStorage.getItem('moodle_token')

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
        <div className="text-4xl mb-3">📭</div>
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
            <span>✓</span>
            <span>Сохранена офлайн — удалить</span>
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
            <span>{saving ? 'Сохраняем...' : 'Сохранить офлайн'}</span>
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
          overflow-hidden break-words"
        dangerouslySetInnerHTML={{ __html: html }}
      />

    </div>
  )
}

const TranscribeButton = ({ videoUrl, videoName }: { videoUrl: string; videoName: string }) => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [text, setText] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleTranscribe = async () => {
    setStatus('loading')
    setElapsed(0)
  
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1)
    }, 1000)
  
    abortRef.current = new AbortController()
  
    try {
      const result = await transcribeVideo(videoUrl, abortRef.current.signal)
      setText(result)
      setStatus('done')
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setStatus('idle')
      } else {
        setStatus('error')
      }
    } finally {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }
  
  const handleCancel = () => {
    abortRef.current?.abort()
    if (timerRef.current) clearInterval(timerRef.current)
    setStatus('idle')
    setElapsed(0)
  }

  const handleSavePDF = () => {
    const doc = new jsPDF()
  
    doc.setFont('helvetica')
    doc.setFontSize(16)
  
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
  
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${videoName} — расшифровка</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 0 20px;
              line-height: 1.6;
              color: #111;
            }
            h1 {
              font-size: 20px;
              margin-bottom: 8px;
              color: #15803d;
            }
            .meta {
              font-size: 12px;
              color: #888;
              margin-bottom: 24px;
            }
            p {
              font-size: 14px;
              text-align: justify;
            }
          </style>
        </head>
        <body>
          <h1>${videoName}</h1>
          <div class="meta">Расшифровка видеолекции • Moodle PWA</div>
          <p>${text.replace(/\n/g, '<br>')}</p>
        </body>
      </html>
    `)
  
    printWindow.document.close()
  
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  if (status === 'idle') {
    return (
      <button
        onClick={handleTranscribe}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
          transition-colors cursor-pointer
          bg-green-50 hover:bg-green-100 dark:bg-gray-700 dark:hover:bg-gray-600"
      >
        <span className="text-xl">📄</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-gray-800 dark:text-white">
            Расшифровка текстом
          </p>
          <p className="text-xs text-gray-400">Whisper AI • только онлайн</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
          viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className="text-green-500 shrink-0">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="10 8 16 12 10 16 10 8" fill="currentColor"/>
        </svg>
      </button>
    )
  }

  if (status === 'loading') {
    const minutes = Math.floor(elapsed / 60)
    const seconds = elapsed % 60
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`
  
    return (
      <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-gray-700 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">⏳</span>
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                Расшифровываем... {timeStr}
              </p>
              <p className="text-xs text-gray-400">
                Обычно занимает 1-3 минуты
              </p>
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-xs px-3 py-1.5 rounded-lg cursor-pointer
              transition-colors font-medium
              bg-red-100 text-red-600 hover:bg-red-200
              dark:bg-red-900/30 dark:text-red-400"
          >
            Отменить
          </button>
        </div>
  
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 overflow-hidden">
          <div className="h-1.5 rounded-full bg-green-500
            animate-[progress_2s_ease-in-out_infinite]"
            style={{
              width: '40%',
              animation: 'pulse-bar 1.5s ease-in-out infinite alternate',
            }}
          />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <button
        onClick={handleTranscribe}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl
          cursor-pointer bg-red-50 dark:bg-red-900/20"
      >
        <span className="text-xl">❌</span>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-red-600 dark:text-red-400">
            Ошибка расшифровки
          </p>
          <p className="text-xs text-gray-400">Нажмите чтобы попробовать снова</p>
        </div>
      </button>
    )
  }

  return (
    <div className="space-y-2">
      <div className="px-4 py-3 rounded-xl bg-green-50 dark:bg-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <p className="text-sm font-medium text-gray-800 dark:text-white">
              Расшифровка готова
            </p>
          </div>
          <button
            onClick={handleSavePDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-xs font-medium cursor-pointer transition-colors
              bg-green-500 hover:bg-green-600 text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12"
              viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Скачать PDF
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-relaxed">
          {text}
        </p>
      </div>
    </div>
  )
}

const VideoContent = ({ module }: { module: CourseModule }) => {
  const videoFile = module.contents?.find(c => c.mimetype === 'video/mp4')
  if (!videoFile) return null

  const videoSrc = fileUrl(videoFile.fileurl)
  const fileSizeMb = (videoFile.filesize / 1024 / 1024).toFixed(1)

  const [cachedUrl, setCachedUrl] = useState<string | null>(null)
  const [caching, setCaching] = useState(false)
  const [cacheProgress, setCacheProgress] = useState(0)
  const [extractingAudio, setExtractingAudio] = useState(false)

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

  const handleSaveOffline = async () => {
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
    } finally {
      setCaching(false)
    }
  }

  const handleDeleteCache = async () => {
    const cache = await caches.open('moodle-videos')
    await cache.delete(videoSrc)
    setCachedUrl(null)
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
            <span className="text-xl">✅</span>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-800 dark:text-white">Сохранено офлайн</p>
              <p className="text-xs text-gray-400">Нажмите чтобы удалить из кэша</p>
            </div>
          </button>
        ) : (
          <button
            onClick={handleSaveOffline}
            disabled={caching}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer bg-green-50 hover:bg-green-100 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-70"
          >
            <span className="text-xl">💾</span>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-gray-800 dark:text-white">
                {caching ? `Сохраняем... ${cacheProgress}%` : 'Сохранить для офлайна'}
              </p>
              <p className="text-xs text-gray-400">{fileSizeMb} МБ • видео останется в браузере</p>
            </div>
            {!caching && <DownloadIcon />}
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

        <a
          href={videoSrc}
          download={videoFile.filename}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer bg-green-50 hover:bg-green-100 dark:bg-gray-700 dark:hover:bg-gray-600"
        >
          <span className="text-xl">🎬</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800 dark:text-white">Скачать на устройство</p>
            <p className="text-xs text-gray-400">{fileSizeMb} МБ • MP4</p>
          </div>
          <DownloadIcon />
        </a>

        <button
          onClick={handleExtractAudio}
          disabled={extractingAudio}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors cursor-pointer bg-green-50 hover:bg-green-100 dark:bg-gray-700 dark:hover:bg-gray-600 disabled:opacity-50"
        >
          <span className="text-xl">🎵</span>
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-gray-800 dark:text-white">
              {extractingAudio ? 'Извлекаем аудио...' : 'Скачать аудио'}
            </p>
            <p className="text-xs text-gray-400">Только звук • MP3</p>
          </div>
          {!extractingAudio && <DownloadIcon />}
        </button>

        <TranscribeButton videoUrl={videoSrc} videoName={module.name} />
      </div>
    </div>
  )
}

const QuizContent = () => (
  <div className="rounded-2xl p-6 text-center
    bg-white dark:bg-gray-800
    border border-green-100 dark:border-gray-700"
  >
    <div className="text-4xl mb-3">🔒</div>
    <p className="font-medium text-gray-700 dark:text-gray-300">
      Тесты доступны только онлайн
    </p>
    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
      Подключитесь к интернету чтобы пройти тест
    </p>
  </div>
)

const UnsupportedContent = ({ module }: { module: CourseModule }) => (
  <div className="rounded-2xl p-6 text-center
    bg-white dark:bg-gray-800
    border border-green-100 dark:border-gray-700"
  >
    <div className="text-4xl mb-3">📌</div>
    <p className="font-medium text-gray-700 dark:text-gray-300">{module.name}</p>
    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
      Этот тип контента пока не поддерживается
    </p>
  </div>
)

const getModuleType = (module: CourseModule) => {
  if (module.modname === 'quiz') return 'quiz'
  if (module.modname === 'page') {
    const hasVideo = module.contents?.some(c => c.mimetype?.startsWith('video/'))
    return hasVideo ? 'video' : 'page'
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
      case 'page': return <PageContent module={module} courseId={id} />
      case 'video': return <VideoContent module={module} />
      case 'quiz':  return <QuizContent />
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