import { Link } from 'react-router-dom'
import { Code2, Blocks } from 'lucide-react'
import { CREATE_GLSL_PATH, CREATE_ROOT } from '@/lib/galleryRoute'

/**
 * The two doors of the creator wing, as links — each room is a real address
 * (/create builds a shader from blocks, /create/glsl writes one as code), so
 * the pair is navigation, not local state.
 */
export function CreatorTabs({ active }: { active: 'blocks' | 'glsl' }) {
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
      {tab(CREATE_ROOT, active === 'blocks', <Blocks className="h-3.5 w-3.5" />, 'Blocks')}
      {tab(CREATE_GLSL_PATH, active === 'glsl', <Code2 className="h-3.5 w-3.5" />, 'Write GLSL')}
    </div>
  )
}
