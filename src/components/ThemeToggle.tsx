import { useTheme } from '../contexts/ThemeContext'

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()

  const bgColor = theme === 'light'
    ? 'var(--color-primary-700)'
    : 'var(--color-primary-100)'
  const iconColor = theme === 'light'
    ? 'var(--color-primary-100)'
    : 'var(--color-primary-700)'

  return (
    <button
      onClick={toggleTheme}
      style={{ backgroundColor: bgColor }}
      className="p-2.5 rounded-2xl cursor-pointer transition-colors hover:opacity-90"
      aria-label="Переключить тему"
    >
      {theme === 'light' ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
          <path
            d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
            fill={iconColor}
          />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="7" fill={iconColor}/>
          <line x1="12" y1="1" x2="12" y2="3" stroke={iconColor}/>
          <line x1="12" y1="21" x2="12" y2="23" stroke={iconColor}/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke={iconColor}/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke={iconColor}/>
          <line x1="1" y1="12" x2="3" y2="12" stroke={iconColor}/>
          <line x1="21" y1="12" x2="23" y2="12" stroke={iconColor}/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke={iconColor}/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke={iconColor}/>
        </svg>
      )}
    </button>
  )
}