import { Layout } from '../components/Layout'
import { Logo } from '../components/Logo'
import { Icon } from '../components/Icon'

export const HomePage = () => {
  return (
    <Layout title="Moodle PWA">
      <div className="space-y-4">
        <div className="rounded-2xl p-6
          bg-white dark:bg-gray-800
          border border-green-200 dark:border-gray-700"
        >
          <div className="flex flex-col items-center text-center mb-4">
            <Logo size={56} />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mt-3">
                Добро пожаловать в Moodle PWA
            </h1>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Это прогрессивное веб-приложение для доступа к образовательному контенту
            платформы Moodle LMS – в том числе без подключения к интернету.
          </p>
        </div>

        <div className="rounded-2xl p-6
          bg-white dark:bg-gray-800
          border border-green-200 dark:border-gray-700"
        >
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">
            Возможности приложения
          </h2>
          <div className="space-y-3">
          {[
            { icon: 'courses', title: 'Курсы и лекции', desc: 'Просматривайте доступные курсы и учебные материалы' },
            { icon: 'offline', title: 'Офлайн-доступ', desc: 'Скачивайте курсы и читайте их без интернета' },
            { icon: 'video', title: 'Видеолекции', desc: 'Смотрите видео онлайн или сохраняйте для офлайн-просмотра' },
            { icon: 'transcribe', title: 'Расшифровка видео', desc: 'Автоматически переводите видеолекции в текст и сохраняйте в PDF' },
            { icon: 'quiz', title: 'Тесты', desc: 'Проходите тесты с поддержкой разных типов вопросов' },
            { icon: 'theme', title: 'Темная тема', desc: 'Удобный интерфейс в светлой и темной теме' },
            ].map(item => (
            <div key={item.title} className="flex items-start gap-3">
                <Icon name={item.icon} size={24} className="shrink-0 mt-0.5" />
                <div>
                <p className="text-sm font-medium text-gray-800 dark:text-white">
                    {item.title}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {item.desc}
                </p>
                </div>
            </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-6
          bg-white dark:bg-gray-800
          border border-green-200 dark:border-gray-700"
        >
          <h2 className="font-bold text-gray-900 dark:text-white mb-4">
            Как пользоваться
          </h2>
          <div className="space-y-3">
            {[
              { step: '1', text: 'Перейдите в раздел «Курсы» и выберите нужный курс' },
              { step: '2', text: 'Нажмите «Скачать» чтобы сохранить курс' },
              { step: '3', text: 'Откройте лекцию – текстовые материалы и видео доступны офлайн после скачивания' },
              { step: '4', text: 'Для расшифровки видео нажмите кнопку «Расшифровка текстом»' },
              { step: '5', text: 'Тесты доступны только онлайн – результаты отправляются на сервер' },
            ].map(item => (
              <div key={item.step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: 'var(--color-primary-600)' }}
                >
                    <span className="text-xs font-bold text-white">{item.step}</span>
                </div>
                <p className="text-sm text-gray-600 dark:text-white leading-relaxed">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-6
          bg-white dark:bg-gray-800
          border border-green-200 dark:border-gray-700"
        >
          <h2 className="font-bold text-gray-900 dark:text-white mb-3">
            Об авторе
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Приложение разработано в рамках выпускной квалификационной работы
            </p>
            <p className="text-sm font-medium text-gray-800 dark:text-white mb-1">
            Хафизова Полина Дмитриевна, 221-323
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            Веб-технологии 2022-2026
            </p>
            <a
            href="https://github.com/polinnett/moodle-pwa-offline-client"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 dark:text-green-400 hover:underline"
            >
            github.com/polinnett/moodle-pwa-offline-client
            </a>
        </div>

      </div>
    </Layout>
  )
}