import type { CourseModule } from '../../types'
import { ModuleDescription } from './ModuleDescription';

export const UrlContent = ({ module }: { module: CourseModule }) => {
  const url = module.contents?.[0]?.fileurl

  return (
    <div className="space-y-4">
      <ModuleDescription description={module.description} />
      <div className="rounded-2xl p-6
        bg-white dark:bg-gray-800
        border border-green-100 dark:border-gray-700"
      >
        <p className="text-sm text-gray-800 dark:text-white mb-1">
          Нажмите на ссылку, чтобы открыть ресурс:
        </p>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-green-600 dark:text-green-400
              hover:underline break-words leading-relaxed"
          >
            {module.name}
          </a>
        ) : (
          <p className="text-sm text-gray-400">Ссылка недоступна</p>
        )}
      </div>
    </div>
  )
}