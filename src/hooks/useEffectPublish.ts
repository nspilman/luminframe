import { useCallback, useState } from 'react'
import { Agent } from '@atproto/api'
import { EffectDefinition } from '@/effects-contract'
import { putEffectRecord } from '@/infrastructure/atproto/effectPublish'

/**
 * Publishing state for the Effect Creator. Unlike usePublish (which collapses
 * failures to one friendly sentence for the save dialog), errors here pass
 * through verbatim: the author is debugging their own record, and the PDS's
 * message — a lexicon rejection, a scope refusal — is the useful part.
 */
export type EffectPublishState =
  | { phase: 'idle' }
  | { phase: 'publishing' }
  | { phase: 'published'; uri: string }
  | { phase: 'error'; message: string }

export function useEffectPublish(
  agent: Agent | null,
  onPublished?: (uri: string) => void
): { state: EffectPublishState; publish: (slug: string, def: EffectDefinition) => Promise<void>; reset: () => void } {
  const [state, setState] = useState<EffectPublishState>({ phase: 'idle' })

  const publish = useCallback(
    async (slug: string, def: EffectDefinition) => {
      if (!agent) return
      setState({ phase: 'publishing' })
      try {
        const { uri } = await putEffectRecord(agent, slug, def)
        setState({ phase: 'published', uri })
        onPublished?.(uri)
      } catch (err) {
        setState({ phase: 'error', message: err instanceof Error ? err.message : String(err) })
      }
    },
    [agent, onPublished]
  )

  const reset = useCallback(() => setState({ phase: 'idle' }), [])

  return { state, publish, reset }
}
