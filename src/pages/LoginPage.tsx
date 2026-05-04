import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api/moodle'
import { ThemeToggle } from '../components/ThemeToggle'
import { Logo } from '../components/Logo'

const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

export const LoginPage = () => {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { token } = await login(username, password)
      localStorage.setItem('moodle_token', token)
      navigate('/courses')
    } catch (err) {
      setError('Неверный логин или пароль')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col
      bg-green-50 dark:bg-gray-900
      transition-colors duration-300"
    >
      <header className="flex justify-end p-4">
        <ThemeToggle />
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">

          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Logo size={80} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Moodle PWA
            </h1>
            <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">
              Войдите, чтобы продолжить
            </p>
          </div>

          <div className="rounded-2xl shadow-lg p-6 bg-white dark:bg-gray-800">
            <form onSubmit={handleSubmit} className="space-y-4">

              <div>
                <label className="block text-sm font-medium mb-1
                  text-gray-700 dark:text-gray-300"
                >
                  Логин
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Введите логин"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border outline-none
                    transition-colors text-sm
                    border-gray-200 bg-gray-50 text-gray-900
                    focus:border-green-500 focus:ring-2 focus:ring-green-200
                    dark:border-gray-600 dark:bg-gray-700 dark:text-white
                    dark:focus:border-green-400 dark:focus:ring-green-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1
                  text-gray-700 dark:text-gray-300"
                >
                  Пароль
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Введите пароль"
                    required
                    className="w-full px-4 py-2.5 pr-11 rounded-xl border outline-none
                      transition-colors text-sm
                      border-gray-200 bg-gray-50 text-gray-900
                      focus:border-green-500 focus:ring-2 focus:ring-green-200
                      dark:border-gray-600 dark:bg-gray-700 dark:text-white
                      dark:focus:border-green-400 dark:focus:ring-green-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                      cursor-pointer transition-colors
                      text-gray-400 hover:text-green-500
                      dark:text-gray-500 dark:hover:text-green-400"
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-sm text-red-500 dark:text-red-400
                  bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-medium text-sm
                  transition-all duration-200 cursor-pointer
                  bg-green-500 hover:bg-green-600 text-white
                  dark:bg-green-600 dark:hover:bg-green-500
                  disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Входим...' : 'Войти'}
              </button>

            </form>
          </div>

          <p className="text-center text-xs mt-4 text-gray-400 dark:text-gray-500">
          Чтобы пользоваться курсами без интернета, скачайте их заранее
          </p>
        </div>
      </main>
    </div>
  )
}