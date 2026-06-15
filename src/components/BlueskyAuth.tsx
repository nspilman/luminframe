import { useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'
import { AtprotoSession } from '@/hooks/useAtprotoSession'

interface BlueskyAuthProps {
  session: AtprotoSession
}

/**
 * The header's Bluesky account control. Three faces, one per auth status:
 * a quiet spinner while the session restores, a handle-entry form when signed
 * out, and the signed-in identity with a sign-out affordance. The actual OAuth
 * state lives in `useAtprotoSession` — this only renders it and collects a handle.
 */
export function BlueskyAuth({ session }: BlueskyAuthProps) {
  const { status, handle, error, signIn, signOut } = session
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
          <Input
            id="bsky-handle"
            autoFocus
            placeholder="you.bsky.social"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
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
