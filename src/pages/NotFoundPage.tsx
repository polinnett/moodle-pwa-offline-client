import { Layout } from '../components/layout/Layout'
import { Icon } from '../components/ui/Icon'

export const NotFoundPage = () => {

  return (
    <Layout title="Страница не найдена">
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Icon name="default" size={64} />
        <h1 className="text-4xl font-bold text-gray-800 dark:text-white">404</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Страница не найдена
        </p>
      </div>
    </Layout>
  )
}