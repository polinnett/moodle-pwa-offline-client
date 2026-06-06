import { Icon } from '../ui/Icon'

export const ModuleIcon = ({ modname }: { modname: string }) => {
  const icons: Record<string, string> = {
    resource: 'resource',
    page:     'page',
    url:      'url',
    folder:   'folder',
    assign:   'assign',
    quiz:     'quiz',
    forum:    'forum',
    label:    'label',
    book:     'book',
  }
  const iconName = icons[modname] ?? 'default'
  return <Icon name={iconName} size={20} />
}