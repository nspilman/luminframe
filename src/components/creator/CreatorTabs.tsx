import { Link } from 'react-router-dom'
import { Code2, Wand2 } from 'lucide-react'
import { CREATE_LOOK_PATH, CREATE_ROOT } from '@/lib/galleryRoute'

/**
 * The two doors of the creator wing, as links — each room is a real address
 * (/create writes GLSL, /create/look composes chains), so the pair is
 * navigation, not local state.
 */
export function CreatorTabs({ active }: { active: 'effect' | 'look' }) {
  const tab = (to: string, isActive: boolean, icon: React.ReactNode, label: string) => (
    <Link
      to={to}
      aria-current={isActive ? 'page' : undefined}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
        isActive ? 'bg-violet-600/20 text-white' : 'text-zinc-400 hover:text-zinc-200'
      }`}
    >
      {icon}
      {label}
    </Link>
  )

  return (
    <div className="flex items-center gap-1 border-b border-zinc-800/50 px-4 py-2">
      {tab(CREATE_ROOT, active === 'effect', <Code2 className="h-3.5 w-3.5" />, 'Write GLSL')}
      {tab(CREATE_LOOK_PATH, active === 'look', <Wand2 className="h-3.5 w-3.5" />, 'Compose a look')}
    </div>
  )
}
