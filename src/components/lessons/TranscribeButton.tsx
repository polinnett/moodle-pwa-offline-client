import { useState, useRef, useEffect } from 'react';
import { transcribeVideo } from '../../api/moodle';
import jsPDF from 'jspdf';
import { Icon } from '../ui/Icon';
import { saveTranscription, getTranscription } from '../../db'

export const TranscribeButton = ({ videoUrl, videoName }: { videoUrl: string; videoName: string }) => {
    const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
    const [text, setText] = useState('')
    const [elapsed, setElapsed] = useState(0)
    const abortRef = useRef<AbortController | null>(null)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
      getTranscription(videoUrl).then(saved => {
        if (saved?.text) {
          setText(saved.text)
          setStatus('done')
        }
      })
    }, [videoUrl])
  
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
        await saveTranscription(videoUrl, result)
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
          <Icon name="transcribe" size={20} />
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
              <Icon name="clock" size={20} />
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
          <Icon name="default" size={20} />
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
              <Icon name="ok" size={20} />
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