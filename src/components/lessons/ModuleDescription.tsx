interface ModuleDescriptionProps {
    description?: string
  }
  
  export const ModuleDescription = ({ description }: ModuleDescriptionProps) => {
    if (!description || !description.replace(/<[^>]*>/g, '').trim()) return null
  
    return (
      <div
        className="rounded-2xl p-5
          bg-white dark:bg-gray-800
          border border-green-100 dark:border-gray-700
          text-sm text-gray-700 dark:text-gray-300 leading-relaxed"
        dangerouslySetInnerHTML={{ __html: description }}
      />
    )
  }