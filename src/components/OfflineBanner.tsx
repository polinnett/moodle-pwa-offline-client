import { useOfflineStatus } from '../hooks/useOfflineStatus'

export const OfflineBanner = () => {
  const isOnline = useOfflineStatus()

  if (isOnline) return null

  return (
    <div className="bg-yellow-400 dark:bg-yellow-600 text-yellow-900 dark:text-yellow-100
      text-sm text-center py-1.5 px-4 font-medium"
    >
      ⚠️ Нет подключения к интернету — доступны только скачанные курсы
    </div>
  )
}