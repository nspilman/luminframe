import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'
import { AtprotoSession } from '@/hooks/useAtprotoSession'
import { useHandleTypeahead, ActorSuggestion } from '@/hooks/useHandleTypeahead'

interface BlueskyAuthProps {
  session: AtprotoSession
}

/** One typeahead suggestion row: avatar, display name, and @handle. */
function SuggestionRow({
  actor,
  active,
  onSelect,
}: {
  actor: ActorSuggestion
  active: boolean
  onSelect: () => void
}) {
  return (
    <li role="option" aria-selected={active}>
      <button
        type="button"
        // Keep focus in the input so its blur doesn't close the list before the click lands.
        onMouseDown={(e) => e.preventDefault()}
        onClick={onSelect}
        className={`flex w-full items-center gap-2 px-2 py-1.5 text-left transition-colors ${
          active ? 'bg-violet-600/20' : 'hover:bg-white/5'
        }`}
      >
        {actor.avatar ? (
          <img src={actor.avatar} alt="" className="h-6 w-6 shrink-0 rounded-full bg-zinc-800 object-cover" />
        ) : (
          <span className="h-6 w-6 shrink-0 rounded-full bg-zinc-800" />
        )}
        <span className="min-w-0 flex-1">
          {actor.displayName && (
            <span className="block truncate text-sm text-zinc-200">{actor.displayName}</span>
          )}
          <span className="block truncate text-xs text-zinc-500">@{actor.handle}</span>
        </span>
      </button>
    </li>
  )
}

/**
 * The header's Bluesky account control. Three faces, one per auth status:
 * a quiet spinner while the session restores, a handle-entry form when signed
 * out, and the signed-in identity with a sign-out affordance. The actual OAuth
 * state lives in `useAtprotoSession` — this only renders it and collects a handle.
 *
 * The handle field autocompletes as you type (the Atmosphere convention): matching
 * accounts come from the network's actor typeahead and can be chosen by click or
 * keyboard (↑/↓ to move, Enter to pick, Esc to dismiss).
 */
export function BlueskyAuth({ session }: BlueskyAuthProps) {
  const { status, handle, error, signIn, signOut } = session
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Typeahead state: the fetched matches, whether the list is showing, and which
  // row the keyboard has highlighted (-1 = none).
  const { suggestions } = useHandleTypeahead(value)
  const [listOpen, setListOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const showList = listOpen && suggestions.length > 0

  if (status === 'initializing') {
    return (
      <span className="flex items-center gap-2 text-sm text-zinc-500">
        <Spinner size="sm" />
      </span>
    )
  }

  if (status === 'signed-in') {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-violet-300">@{handle ?? '…'}</span>
        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
    )
  }

  const choose = (actor: ActorSuggestion) => {
    setValue(actor.handle)
    setListOpen(false)
    setActiveIndex(-1)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      // A highlighted suggestion wins Enter; without one, Enter submits the form.
      e.preventDefault()
      choose(suggestions[activeIndex])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setListOpen(false)
      setActiveIndex(-1)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    // On success this navigates away and the promise never resolves, so the
    // button simply stays in its submitting state until the redirect happens.
    await signIn(value)
    setSubmitting(false)
  }

  return (
    <div className="relative">
      <Button
        size="sm"
        className="bg-violet-600 text-white hover:bg-violet-500"
        onClick={() => setOpen((v) => !v)}
      >
        Sign in with Bluesky
      </Button>

      {open && (
        <form
          onSubmit={submit}
          className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border border-zinc-800 bg-zinc-950 p-3 shadow-xl"
        >
          <label htmlFor="bsky-handle" className="mb-1 block text-xs text-zinc-400">
            Your Bluesky handle
          </label>
          <div className="relative">
            <Input
              id="bsky-handle"
              autoFocus
              placeholder="you.bsky.social"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setListOpen(true)
                setActiveIndex(-1)
              }}
              onFocus={() => setListOpen(true)}
              onBlur={() => setListOpen(false)}
              onKeyDown={onKeyDown}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              role="combobox"
              aria-expanded={showList}
              aria-autocomplete="list"
              aria-controls="bsky-handle-suggestions"
            />

            {showList && (
              <ul
                id="bsky-handle-suggestions"
                role="listbox"
                className="absolute left-0 right-0 top-full z-10 mt-1 max-h-64 overflow-y-auto overflow-x-hidden rounded-md border border-zinc-800 bg-zinc-950 py-1 shadow-xl"
              >
                {suggestions.map((actor, i) => (
                  <SuggestionRow
                    key={actor.did}
                    actor={actor}
                    active={i === activeIndex}
                    onSelect={() => choose(actor)}
                  />
                ))}
              </ul>
            )}
          </div>

          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !value.trim()}
            className="mt-3 w-full bg-violet-600 text-white hover:bg-violet-500"
          >
            {submitting ? <Spinner size="sm" /> : 'Continue'}
          </Button>
        </form>
      )}
    </div>
  )
}
