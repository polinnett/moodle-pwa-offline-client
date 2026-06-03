import { useState, useEffect } from 'react'
import { Layout } from '../components/layout/Layout'
import { Icon } from '../components/ui/Icon'
import { getSiteInfo, getSystemUsers } from '../api/moodle'
import { useOfflineStatus } from '../hooks/useOfflineStatus'

interface UserInfo {
  fullname: string
  firstname: string
  lastname: string
  username: string
  userpictureurl: string
  userissiteadmin: boolean
  sitename: string
}

interface MoodleUser {
  id: number
  fullname: string
  email: string
  profileimageurl: string
  lastaccess: number
}

export const ProfilePage = () => {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [users, setUsers] = useState<MoodleUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [storageInfo, setStorageInfo] = useState<{ used: number; quota: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastActive, setLastActive] = useState<string | null>(null)
  const isOnline = useOfflineStatus()

  const init = async () => {
    setLoading(true)
    try {
      const lastActiveStr = localStorage.getItem('last_active')
      setLastActive(lastActiveStr)
      localStorage.setItem('last_active', new Date().toISOString())
  
      if (!navigator.onLine) {
        const cached = localStorage.getItem('profile_cache')
        if (cached) setUserInfo(JSON.parse(cached))
        const storageCached = localStorage.getItem('storage_cache')
        if (storageCached) setStorageInfo(JSON.parse(storageCached))
        return
      }
  
      const info = await getSiteInfo()
      setUserInfo(info)
      localStorage.setItem('profile_cache', JSON.stringify(info))
  
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate()
        const storageData = { used: estimate.usage ?? 0, quota: estimate.quota ?? 0 }
        setStorageInfo(storageData)
        localStorage.setItem('storage_cache', JSON.stringify(storageData))
      }
  
      if (info.userissiteadmin) {
        const allUsers = await getSystemUsers()
        setUsers(allUsers ?? [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    init()
  }, [isOnline])

  const refreshUsers = async () => {
    setLoadingUsers(true)
    try {
      const allUsers = await getSystemUsers()
      setUsers(allUsers ?? [])
    } finally {
      setLoadingUsers(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} ГБ`
  }

  const handleClearCache = async () => {
    const keys = await caches.keys()
    await Promise.all(keys.map(key => caches.delete(key)))
    const { db } = await import('../db')
    await db.courses.clear()
    await db.lessons.clear()
    const estimate = await navigator.storage.estimate()
    setStorageInfo({
      used: estimate.usage ?? 0,
      quota: estimate.quota ?? 0,
    })
  }

  if (loading) {
    return (
      <Layout title="Профиль">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-2xl bg-gray-200 dark:bg-gray-700"/>
          ))}
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Профиль">
      <div className="space-y-4">

        <div className="rounded-2xl p-6
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-4 mb-4">
            {userInfo?.userpictureurl ? (
              <img
                src={userInfo.userpictureurl}
                alt={`Аватар ${userInfo.fullname}`}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900
                flex items-center justify-center"
              >
                <Icon name="profile" size={32} />
              </div>
            )}
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {userInfo?.fullname}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                @{userInfo?.username}
              </p>
              {userInfo?.userissiteadmin && (
                <span className="text-xs px-2 py-0.5 rounded-full
                  bg-yellow-100 text-yellow-700
                  dark:bg-yellow-900/30 dark:text-yellow-400"
                >
                  Администратор
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">Платформа</span>
              <span className="text-gray-800 dark:text-white">{userInfo?.sitename}</span>
            </div>
          </div>
        </div>

        {storageInfo && (
          <div className="rounded-2xl p-6
            bg-white dark:bg-gray-800
            border border-green-100 dark:border-gray-700"
          >
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">
              Офлайн-хранилище
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Занято</span>
                <span className="text-gray-800 dark:text-white">{formatBytes(storageInfo.used)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Доступно</span>
                <span className="text-gray-800 dark:text-white">{formatBytes(storageInfo.quota - storageInfo.used)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((storageInfo.used / storageInfo.quota) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {((storageInfo.used / storageInfo.quota) * 100).toFixed(1)}% использовано
              </p>
            </div>
            <p className="text-sm text-gray-800 font-bold dark:text-white mt-4 mx-auto text-center max-w-prose">
              После очистки все скачанные курсы и материалы будут удалены и станут недоступны офлайн!
            </p>
            <button
              onClick={handleClearCache}
              disabled={!isOnline}
              className="w-full py-2.5 rounded-xl text-sm font-medium
                cursor-pointer transition-colors
                text-white bg-red-500 hover:bg-red-600 mt-2
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Очистить весь кеш
            </button>
          </div>
        )}

        {userInfo?.userissiteadmin && users.length > 0 && (
          <div className="rounded-2xl overflow-hidden
            bg-white dark:bg-gray-800
            border border-green-100 dark:border-gray-700"
          >
            <div className="px-4 py-3 border-b border-green-200 dark:border-gray-700
              flex items-center justify-between"
            >
              <h3 className="font-bold text-gray-900 dark:text-white">
                Пользователи системы
              </h3>
              <button
                onClick={refreshUsers}
                disabled={loadingUsers}
                aria-disabled={loadingUsers}
                aria-live="polite"
                className="text-sm px-3 py-1.5 rounded-xl cursor-pointer transition-colors
                  bg-green-600 hover:bg-green-500 text-white disabled:opacity-50"
              >
                {loadingUsers ? 'Обновляем...' : 'Обновить'}
              </button>
            </div>
            {users.map(user => (
              <div key={user.id}
                className="flex items-center gap-3 px-4 py-3
                  border-b border-gray-100 dark:border-gray-700 last:border-b-0"
              >
                {user.profileimageurl ? (
                  <img
                    src={user.profileimageurl}
                    alt={`Аватар ${user.fullname}`}
                    className="w-8 h-8 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900
                    flex items-center justify-center shrink-0"
                  >
                    <span className="text-xs font-bold text-green-700 dark:text-green-300">
                      {user.fullname[0]}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                    {user.fullname}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {user.email}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {user.lastaccess
                      ? `Активен: ${new Date(user.lastaccess * 1000).toLocaleString('ru-RU', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}`
                      : 'Никогда не входил'
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  )
}
