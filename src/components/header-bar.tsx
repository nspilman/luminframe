import { Button } from './ui/button'
import { Github } from 'lucide-react'

export function HeaderBar() {
  return (
    <header className="border-b border-zinc-800/50 bg-black/20 backdrop-blur-xl p-4">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/luminframe.png" alt="Luminframe Logo" className="h-8 w-8" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Luminframe
          </h1>
        </div>
        
        <nav className="flex items-center gap-4">
          {/* <a href="/gallery" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Gallery
          </a>
          <a href="/docs" className="text-sm text-zinc-400 hover:text-white transition-colors">
            Documentation
          </a> */}
          <Button variant="ghost" size="sm" asChild>
            <a href="https://github.com/nspilman/luminframe" target="_blank" rel="noopener noreferrer">
              <Github className="w-4 h-4 mr-2" />
              GitHub
            </a>
          </Button>
        </nav>
      </div>
    </header>
  )
} 