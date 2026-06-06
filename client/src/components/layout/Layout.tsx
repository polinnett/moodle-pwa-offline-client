import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'
import { Logo } from '../ui/Logo'
import { useOfflineStatus } from '../../hooks/useOfflineStatus'
import { Icon } from '../ui/Icon'
import { useTheme } from '../../hooks/useTheme'

interface LayoutProps {
  children: React.ReactNode
  title?: string
  showBack?: boolean
}

export const Layout = ({ children, title, showBack = false }: LayoutProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const isOnline = useOfflineStatus()
  const [menuOpen, setMenuOpen] = useState(false)
  const { toggleTheme } = useTheme()

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
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center gap-3">

          {showBack ? (
            <button
              onClick={() => navigate(-1)}
              aria-label="Вернуться назад"
              className="cursor-pointer p-1.5 rounded-lg transition-colors
                text-gray-500 hover:text-green-600
                dark:text-gray-400 dark:hover:text-green-400"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>
          ) : (
            <button aria-label="Главная страница" onClick={() => navigate('/home')} className="cursor-pointer shrink-0">
              <Logo size={36} />
            </button>
          )}

          {!showBack && (
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => navigate('/home')}
                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors
                  ${location.pathname === '/home'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400'
                  }`}
              >
                Главная
              </button>
              <button
                onClick={() => navigate('/courses')}
                className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors
                  ${location.pathname === '/courses'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                    : 'text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400'
                  }`}
              >
                Курсы
              </button>
            </nav>
          )}

          {showBack && (
            <span className="flex-1 font-semibold text-gray-800 dark:text-white truncate">
              {title}
            </span>
          )}

          <div className="flex-1"/>

          <div className="hidden md:flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
              ${isOnline
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              <div className={`w-1.5 h-1.5 rounded-lg ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}/>
              {isOnline ? 'Онлайн' : 'Офлайн'}
            </div>
            <button 
              onClick={() => navigate('/profile')}
              className={`cursor-pointer p-1.5 rounded-lg transition-colors
                ${location.pathname === '/profile'
                  ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                  : 'text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400'
                }`}
              aria-label="Профиль"
            >
              <Icon name="profile" size={30} />
            </button>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="cursor-pointer p-1.5 rounded-lg transition-colors
                text-gray-500 hover:text-red-500
                dark:text-gray-400 dark:hover:text-red-400"
              aria-label="Выйти"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>

          <div className={`md:hidden p-1.5 rounded-lg`}>
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}/>
          </div>

          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Открыть или закрыть меню"
            className="md:hidden cursor-pointer p-1.5 rounded-lg transition-colors
              text-gray-500 hover:text-green-600
              dark:text-gray-400 dark:hover:text-green-400"
          >
            {menuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>

        </div>

        {menuOpen && (
          <div className="md:hidden absolute top-16 right-0 z-50 w-64
            border border-green-100 dark:border-gray-700
            bg-white dark:bg-gray-800
            shadow-xl px-3 py-3 space-y-1"
          >
            <button
              onClick={() => { navigate('/home')}}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium
                cursor-pointer transition-colors
                ${location.pathname === '/home'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'text-gray-600 hover:bg-green-50 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
            >
              Главная
            </button>
            <button
              onClick={() => { navigate('/courses')}}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium
                cursor-pointer transition-colors
                ${location.pathname === '/courses'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'text-gray-600 hover:bg-green-50 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
            >
              Курсы
            </button>

            <button
              onClick={() => navigate('/profile')}
              className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium
                cursor-pointer transition-colors
                ${location.pathname === '/profile'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'text-gray-600 hover:bg-green-50 dark:text-gray-400 dark:hover:bg-gray-700'
                }`}
            >
              Профиль
            </button>

            <button
              onClick={toggleTheme}
              className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium
                cursor-pointer transition-colors
                text-gray-600 hover:bg-green-50
                dark:text-gray-400 dark:hover:bg-gray-700"
            >
              Сменить тему
            </button>

            <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium
                  cursor-pointer transition-colors
                  text-red-500 hover:bg-red-50
                  dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Выйти
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {children}
      </main>
    </div>
  )
}