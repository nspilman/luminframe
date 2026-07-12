import { Button } from './ui/button'
import { Github } from 'lucide-react'
import { BlueskyAuth } from './BlueskyAuth'
import { AtprotoSession } from '@/hooks/useAtprotoSession'

/** The top-level views the header switches between. */
export type AppView = 'editor' | 'gallery'

const NAV: { value: AppView; label: string }[] = [
  { value: 'editor', label: 'Editor' },
  { value: 'gallery', label: 'Gallery' },
]

interface HeaderBarProps {
  session: AtprotoSession
  view: AppView
  onNavigate: (view: AppView) => void
}

export function HeaderBar({ session, view, onNavigate }: HeaderBarProps) {
  return (
    <header className="relative z-50 border-b border-zinc-800/50 bg-black/20 backdrop-blur-xl p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/luminframe.png" alt="Luminframe Logo" className="h-8 w-8" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Luminframe
          </h1>
        </div>

        <nav className="flex items-center gap-4">
          <div className="flex gap-1 rounded-md border border-zinc-800 bg-zinc-900/50 p-1">
            {NAV.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onNavigate(item.value)}
                aria-pressed={view === item.value}
                className={`rounded px-3 py-1 text-sm transition-colors ${
                  view === item.value ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:bg-white/5'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <Button variant="ghost" size="sm" asChild>
            <a href="https://github.com/nspilman/luminframe" target="_blank" rel="noopener noreferrer">
              <Github className="w-4 h-4 mr-2" />
              GitHub
            </a>
          </Button>
          <BlueskyAuth session={session} />
        </nav>
      </div>
    </header>
  )
} 