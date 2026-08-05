import { useCallback, useState } from 'react'
import { Agent } from '@atproto/api'

/**
 * Publishing state for the Effect Creator — one status machine for a
 * slug-keyed record, parameterized by the put function.
 * Unlike usePublish (which collapses failures to one friendly sentence for
 * the save dialog), errors here pass through verbatim: the author is
 * debugging their own record, and the PDS's message — a lexicon rejection,
 * a scope refusal — is the useful part.
 */
export type RecordPublishState =
  | { phase: 'idle' }
  | { phase: 'publishing' }
  | { phase: 'published'; uri: string }
  | { phase: 'error'; message: string }

export function useRecordPublish<TDef>(
  agent: Agent | null,
  put: (agent: Agent, slug: string, def: TDef) => Promise<{ uri: string }>,
  onPublished?: (uri: string) => void
): { state: RecordPublishState; publish: (slug: string, def: TDef) => Promise<void>; reset: () => void } {
  const [state, setState] = useState<RecordPublishState>({ phase: 'idle' })

  const publish = useCallback(
    async (slug: string, def: TDef) => {
      if (!agent) return
      setState({ phase: 'publishing' })
      try {
        const { uri } = await put(agent, slug, def)
        setState({ phase: 'published', uri })
        onPublished?.(uri)
      } catch (err) {
        setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
      }
    },
    [agent, put, onPublished]
  )

  const reset = useCallback(() => setState({ phase: 'idle' }), [])

  return { state, publish, reset }
}
