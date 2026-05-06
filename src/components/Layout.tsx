import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { Logo } from './Logo'
import { OfflineBanner } from './OfflineBanner'

interface LayoutProps {
  children: React.ReactNode
  title?: string          
  showBack?: boolean    
}

export const Layout = ({ children, title, showBack = false }: LayoutProps) => {
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('moodle_token')
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col
      bg-green-50 dark:bg-gray-900
      transition-colors duration-300"
    >
      <header className="sticky top-0 z-10
        bg-white dark:bg-gray-800
        border-b border-green-100 dark:border-gray-700
        shadow-sm"
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">

          {showBack ? (
            <button
              onClick={() => navigate(-1)}
              className="cursor-pointer p-1.5 rounded-lg transition-colors
                text-gray-500 hover:text-green-600
                dark:text-gray-400 dark:hover:text-green-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          ) : (
            <Logo size={28} />
          )}

          <span className="flex-1 font-semibold text-gray-800 dark:text-white truncate">
            {title || 'Moodle PWA'}
          </span>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="cursor-pointer p-1.5 rounded-lg transition-colors
                text-gray-500 hover:text-red-500
                dark:text-gray-400 dark:hover:text-red-400"
              aria-label="Выйти"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>

        </div>
      </header>
      <OfflineBanner />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}