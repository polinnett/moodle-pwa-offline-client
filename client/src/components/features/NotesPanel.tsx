import { useState, useEffect, useRef } from 'react'
import { useOfflineStatus } from '../../hooks/useOfflineStatus'
import { Icon } from '../ui/Icon'

interface Note {
  id?: number
  localId?: string
  course_id: number
  lesson_id: number
  title?: string
  text: string
  created_at?: string
  updated_at?: string
  is_deleted?: boolean
  synced?: boolean
}

interface PendingDelete {
  id: number
}

interface PendingUpdate {
  id: number
  title?: string
  text: string
}

const BACKEND_URL = 'http://localhost:8001'

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': localStorage.getItem('moodle_token') ?? '',
})

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
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editText, setEditText] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)

  const offlineKey = `offline_notes_${courseId}_${lessonId}`
  const pendingDeletesKey = `pending_deletes_${courseId}_${lessonId}`
  const pendingUpdatesKey = `pending_updates_${courseId}_${lessonId}`

  const loadOfflineNotes = () => {
    const stored = localStorage.getItem(offlineKey)
    return stored ? (JSON.parse(stored) as Note[]).filter(n => !n.is_deleted) : []
  }

  const loadNotes = async () => {
    if (isOnline) {
      try {
        const res = await fetch(`${BACKEND_URL}/notes/?lesson_id=${lessonId}`, {
          headers: getAuthHeaders(),
        })        
        const serverNotes: Note[] = await res.json()
        const localUnsync = loadOfflineNotes().filter(n => !n.synced)
        const allNotes = [...serverNotes.map(n => ({ ...n, synced: true })), ...localUnsync]
        localStorage.setItem(offlineKey, JSON.stringify(allNotes))
        setNotes(allNotes)
      } catch {
        setNotes(loadOfflineNotes())
      }
    } else {
      setNotes(loadOfflineNotes())
    }
  }

  const syncPendingDeletes = async () => {
    const stored = localStorage.getItem(pendingDeletesKey)
    if (!stored) return
    const deletes: PendingDelete[] = JSON.parse(stored)
    for (const item of deletes) {
      try {
        await fetch(`${BACKEND_URL}/notes/${item.id}`, {
          method: 'DELETE',
          headers: getAuthHeaders(),
        })
      } catch {}
    }
    localStorage.removeItem(pendingDeletesKey)
  }

  const syncPendingUpdates = async () => {
    const stored = localStorage.getItem(pendingUpdatesKey)
    if (!stored) return
    const updates: PendingUpdate[] = JSON.parse(stored)
    for (const item of updates) {
      try {
        await fetch(`${BACKEND_URL}/notes/${item.id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ title: item.title, text: item.text }),
        })
      } catch {}
    }
    localStorage.removeItem(pendingUpdatesKey)
  }

  const syncOfflineNotes = async () => {
    const localNotes = loadOfflineNotes().filter(n => !n.synced)
    if (localNotes.length > 0) {
      try {
        await fetch(`${BACKEND_URL}/notes/batch`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(localNotes),
        })
        const stored = localStorage.getItem(offlineKey)
        if (stored) {
          const all: Note[] = JSON.parse(stored)
          const updated = all.filter(n => n.synced)
          localStorage.setItem(offlineKey, JSON.stringify(updated))
        }
      } catch {}
    }
  }

  const runSync = async () => {
    await syncPendingDeletes()
    await syncPendingUpdates()
    await syncOfflineNotes()
    await loadNotes()
  }

  useEffect(() => {
    loadNotes()
  }, [lessonId, isOnline])

  useEffect(() => {
    if (isOnline) runSync()
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
          headers: getAuthHeaders(),
          body: JSON.stringify(note),
        })
        const created: Note = await res.json()
        const stored = localStorage.getItem(offlineKey)
        const existing: Note[] = stored ? JSON.parse(stored) : []
        localStorage.setItem(offlineKey, JSON.stringify([...existing, { ...created, synced: true }]))
        setNotes(prev => [...prev, { ...created, synced: true }])
      } catch {
        saveNoteLocally(note)
      }
    } else {
      saveNoteLocally(note)
    }

    setText('')
    setTitle('')
    setLoading(false)
  }

  const saveNoteLocally = (note: Note) => {
    const localNote = { ...note, localId: String(Date.now()), synced: false }
    const stored = localStorage.getItem(offlineKey)
    const existing: Note[] = stored ? JSON.parse(stored) : []
    const updated = [...existing, localNote]
    localStorage.setItem(offlineKey, JSON.stringify(updated))
    setNotes(prev => [...prev, localNote])
  }

  const handleDelete = async (note: Note) => {
    const noteId = note.id
    const localId = note.localId

    if (localId && !noteId) {
      const stored = localStorage.getItem(offlineKey)
      if (!stored) return
      const updated = (JSON.parse(stored) as Note[]).filter(n => n.localId !== localId)
      localStorage.setItem(offlineKey, JSON.stringify(updated))
      setNotes(prev => prev.filter(n => n.localId !== localId))
      return
    }

    if (noteId) {
      if (isOnline) {
        try {
          await fetch(`${BACKEND_URL}/notes/${noteId}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          })
          const stored = localStorage.getItem(offlineKey)
          if (stored) {
            const updated = (JSON.parse(stored) as Note[]).filter(n => n.id !== noteId)
            localStorage.setItem(offlineKey, JSON.stringify(updated))
          }
          setNotes(prev => prev.filter(n => n.id !== noteId))
        } catch {}
      } else {
        const stored = localStorage.getItem(pendingDeletesKey)
        const deletes: PendingDelete[] = stored ? JSON.parse(stored) : []
        deletes.push({ id: noteId })
        localStorage.setItem(pendingDeletesKey, JSON.stringify(deletes))
        setNotes(prev => prev.filter(n => n.id !== noteId))
      }
    }
  }

  const handleEdit = async (note: Note) => {
    const noteId = note.id
    const localId = note.localId
    const newTitle = editTitle.trim() || undefined
    const newText = editText.trim()

    if (localId && !noteId) {
      const stored = localStorage.getItem(offlineKey)
      if (!stored) return
      const updated = (JSON.parse(stored) as Note[]).map(n =>
        n.localId === localId ? { ...n, title: newTitle, text: newText } : n
      )
      localStorage.setItem(offlineKey, JSON.stringify(updated))
      setNotes(prev => prev.map(n =>
        n.localId === localId ? { ...n, title: newTitle, text: newText } : n
      ))
      setEditingId(null)
      return
    }

    if (noteId) {
      if (isOnline) {
        try {
          await fetch(`${BACKEND_URL}/notes/${noteId}`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ title: newTitle, text: newText }),
          })
        } catch {}
      } else {
        const stored = localStorage.getItem(pendingUpdatesKey)
        const updates: PendingUpdate[] = stored ? JSON.parse(stored) : []
        const existing = updates.findIndex(u => u.id === noteId)
        if (existing >= 0) {
          updates[existing] = { id: noteId, title: newTitle, text: newText }
        } else {
          updates.push({ id: noteId, title: newTitle, text: newText })
        }
        localStorage.setItem(pendingUpdatesKey, JSON.stringify(updates))
      }
      setNotes(prev => prev.map(n =>
        n.id === noteId ? { ...n, title: newTitle, text: newText } : n
      ))
      setEditingId(null)
    }
  }

  return (
    <>
      <div className="hidden md:flex w-64 shrink-0 rounded-2xl border border-green-200
        dark:border-gray-700 bg-white dark:bg-gray-800 p-4
        flex-col gap-3 self-start sticky top-4"
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
          {notes.map((note, idx) => {
            const key = note.id ?? note.localId ?? idx
            const isEditing = editingId === (note.id ?? note.localId)
            return (
              <div key={key} className="flex items-start gap-2 p-2 rounded-xl bg-green-50 dark:bg-gray-700">
                {isEditing ? (
                  <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Заголовок..."
                      className="w-full text-xs font-medium rounded-lg border border-green-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 focus:outline-none focus:ring-1 focus:ring-green-400"/>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3}
                      className="w-full text-xs rounded-lg border border-green-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-green-400"/>
                    <div className="flex gap-1.5">
                      <button onClick={() => handleEdit(note)} className="flex-1 py-1 rounded-lg text-xs font-medium bg-green-500 text-white hover:bg-green-600 cursor-pointer transition-colors">Сохранить</button>
                      <button onClick={() => setEditingId(null)} className="flex-1 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 cursor-pointer transition-colors">Отмена</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setEditingId(note.id ?? note.localId ?? null); setEditTitle(note.title ?? ''); setEditText(note.text) }}>
                    {note.title && <p className="text-xs font-semibold text-gray-800 dark:text-white mb-1">{note.title}</p>}
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                    {!note.synced && note.localId && <span className="text-xs text-yellow-500 mt-1 block">не синхронизировано</span>}
                  </div>
                )}
                {!isEditing && (
                  <button onClick={() => handleDelete(note)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 cursor-pointer">
                    <Icon name="trash" size={14} className="mt-0.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
  
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Заголовок..."
          className="w-full text-xs font-medium rounded-xl border border-green-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 p-2 focus:outline-none focus:ring-1 focus:ring-green-400"/>
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Написать заметку..." rows={3}
          className="w-full text-xs rounded-xl border border-green-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 p-2 resize-none focus:outline-none focus:ring-1 focus:ring-green-400"/>
        <button onClick={handleAdd} disabled={loading || !text.trim()}
          className="w-full py-2 rounded-xl text-xs font-medium bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 disabled:opacity-50 transition-colors cursor-pointer">
          {loading ? 'Сохраняем...' : 'Сохранить'}
        </button>
      </div>
  
      <div className="md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg
            bg-white dark:bg-gray-800 border border-green-200 dark:border-gray-700
            flex items-center justify-center
            cursor-pointer transition-transform active:scale-95"
        >
          <Icon name="note" size={24} />
        </button>
  
        {mobileOpen && (
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setMobileOpen(false)} />
        )}
  
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl
            border-t border-green-200 dark:border-gray-700
            bg-white dark:bg-gray-800
            transition-transform duration-300
            ${mobileOpen ? 'translate-y-0' : 'translate-y-full'}`}
          style={{ maxHeight: '70vh', overflowY: 'auto' }}
        >
          <div className="flex items-center justify-between p-4 border-b border-green-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <Icon name="note" size={18} />
              <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Мои заметки</h3>
              <div className="ml-2 flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
              </div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer text-xl leading-none">×</button>
          </div>
  
          <div className="p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
              {notes.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500">Заметок пока нет</p>
              )}
              {notes.map((note, idx) => {
                const key = note.id ?? note.localId ?? idx
                const isEditing = editingId === (note.id ?? note.localId)
                return (
                  <div key={key} className="flex items-start gap-2 p-2 rounded-xl bg-green-50 dark:bg-gray-700">
                    {isEditing ? (
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Заголовок..."
                          className="w-full text-xs font-medium rounded-lg border border-green-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 focus:outline-none focus:ring-1 focus:ring-green-400"/>
                        <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3}
                          className="w-full text-xs rounded-lg border border-green-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 p-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-green-400"/>
                        <div className="flex gap-1.5">
                          <button onClick={() => handleEdit(note)} className="flex-1 py-1 rounded-lg text-xs font-medium bg-green-500 text-white hover:bg-green-600 cursor-pointer transition-colors">Сохранить</button>
                          <button onClick={() => setEditingId(null)} className="flex-1 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 cursor-pointer transition-colors">Отмена</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setEditingId(note.id ?? note.localId ?? null); setEditTitle(note.title ?? ''); setEditText(note.text) }}>
                        {note.title && <p className="text-xs font-semibold text-gray-800 dark:text-white mb-1">{note.title}</p>}
                        <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                        {!note.synced && note.localId && <span className="text-xs text-yellow-500 mt-1 block">не синхронизировано</span>}
                      </div>
                    )}
                    {!isEditing && (
                      <button onClick={() => handleDelete(note)} className="text-gray-300 hover:text-red-400 transition-colors shrink-0 cursor-pointer">
                        <Icon name="trash" size={14} className="mt-0.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
  
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Заголовок..."
              className="w-full text-xs font-medium rounded-xl border border-green-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 p-2 focus:outline-none focus:ring-1 focus:ring-green-400"/>
            <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Написать заметку..." rows={3}
              className="w-full text-xs rounded-xl border border-green-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 p-2 resize-none focus:outline-none focus:ring-1 focus:ring-green-400"/>
            <button onClick={handleAdd} disabled={loading || !text.trim()}
              className="w-full py-2 rounded-xl text-xs font-medium bg-green-500 text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-500 disabled:opacity-50 transition-colors cursor-pointer">
              {loading ? 'Сохраняем...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}