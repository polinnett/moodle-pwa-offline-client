import { useState, useEffect } from 'react'
import { useOfflineStatus } from '../../hooks/useOfflineStatus'
import { Icon } from '../ui/Icon'

interface Note {
  id?: number
  course_id: number
  lesson_id: number
  title?: string
  text: string
  created_at?: string
  updated_at?: string
  is_deleted?: boolean
}

const BACKEND_URL = 'http://localhost:8001'

export const NotesPanel = ({
  courseId,
  lessonId,
}: {
  courseId: number
  lessonId: number
}) => {
  const isOnline = useOfflineStatus()
  const [notes, setNotes] = useState<Note[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')

  const offlineKey = `offline_notes_${courseId}_${lessonId}`

  const loadNotes = async () => {
    if (isOnline) {
      try {
        const res = await fetch(`${BACKEND_URL}/notes/?lesson_id=${lessonId}`)
        const data = await res.json()
        setNotes(data)
      } catch {
        loadOfflineNotes()
      }
    } else {
      loadOfflineNotes()
    }
  }

  const loadOfflineNotes = () => {
    const stored = localStorage.getItem(offlineKey)
    if (stored) setNotes(JSON.parse(stored))
  }

  const saveOfflineNote = (note: Note) => {
    const stored = localStorage.getItem(offlineKey)
    const existing: Note[] = stored ? JSON.parse(stored) : []
    const updated = [...existing, { ...note, id: Date.now() }]
    localStorage.setItem(offlineKey, JSON.stringify(updated))
    setNotes(updated)
  }

  const syncOfflineNotes = async () => {
    const stored = localStorage.getItem(offlineKey)
    if (!stored) return
    const offlineNotes: Note[] = JSON.parse(stored)
    if (offlineNotes.length === 0) return

    try {
      await fetch(`${BACKEND_URL}/notes/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(offlineNotes),
      })
      localStorage.removeItem(offlineKey)
      await loadNotes()
    } catch {}
  }

  useEffect(() => {
    loadNotes()
  }, [lessonId, isOnline])

  useEffect(() => {
    if (isOnline) syncOfflineNotes()
  }, [isOnline])

  const handleAdd = async () => {
    if (!text.trim()) return
    setLoading(true)

    const note: Note = {
      course_id: courseId,
      lesson_id: lessonId,
      title: title.trim() || undefined,
      text: text.trim(),
    }

    if (isOnline) {
      try {
        const res = await fetch(`${BACKEND_URL}/notes/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(note),
        })
        const created = await res.json()
        setNotes(prev => [...prev, created])
      } catch {
        saveOfflineNote(note)
      }
    } else {
      saveOfflineNote(note)
    }

    setText('')
    setTitle('')
    setLoading(false)
  }

  const handleDelete = async (noteId: number) => {
    if (isOnline) {
      try {
        await fetch(`${BACKEND_URL}/notes/${noteId}`, { method: 'DELETE' })
        setNotes(prev => prev.filter(n => n.id !== noteId))
      } catch {}
    } else {
      const stored = localStorage.getItem(offlineKey)
      if (!stored) return
      const updated = (JSON.parse(stored) as Note[]).filter(n => n.id !== noteId)
      localStorage.setItem(offlineKey, JSON.stringify(updated))
      setNotes(updated)
    }
  }

  return (
    <div className="w-64 shrink-0 rounded-2xl border border-green-200
      dark:border-gray-700 bg-white dark:bg-gray-800 p-4
      flex flex-col gap-3 self-start sticky top-4"
    >
      <div className="flex items-center gap-2">
        <Icon name="note" size={18} />
        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">
            Мои заметки
        </h3>
        <div className="ml-auto flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        </div>
      </div>

      <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
        {notes.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Заметок пока нет
          </p>
        )}
        {notes.map(note => (
          <div
            key={note.id}
            className="flex items-start gap-2 p-2 rounded-xl
              bg-green-50 dark:bg-gray-700"
          >
            <div className="flex-1 min-w-0">
              {note.title && (
                <p className="text-xs font-semibold text-gray-800 dark:text-white mb-1">
                  {note.title}
                </p>
              )}
              <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {note.text}
              </p>
            </div>
            <button
              onClick={() => note.id && handleDelete(note.id)}
              className="text-gray-300 hover:text-red-400 transition-colors shrink-0 cursor-pointer"
            >
              <Icon name="trash" size={14} className="mt-0.5" />
            </button>
          </div>
        ))}
      </div>

      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Заголовок..."
        className="w-full text-xs font-medium rounded-xl border border-green-200
          dark:border-gray-600 bg-gray-50 dark:bg-gray-700
          text-gray-700 dark:text-gray-300
          placeholder-gray-400 dark:placeholder-gray-500
          p-2 focus:outline-none focus:ring-1 focus:ring-green-400"
      />

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Написать заметку..."
        rows={3}
        className="w-full text-xs rounded-xl border border-green-200
          dark:border-gray-600 bg-gray-50 dark:bg-gray-700
          text-gray-700 dark:text-gray-300
          placeholder-gray-400 dark:placeholder-gray-500
          p-2 resize-none focus:outline-none
          focus:ring-1 focus:ring-green-400"
      />

      <button
        onClick={handleAdd}
        disabled={loading || !text.trim()}
        aria-live="polite"
        className="w-full py-2 rounded-xl text-xs font-medium
          bg-green-500 text-white hover:bg-green-600
          dark:bg-green-600 dark:hover:bg-green-500
          disabled:opacity-50 transition-colors"
      >
        {loading ? 'Сохраняем...' : 'Сохранить'}
      </button>
    </div>
  )
}