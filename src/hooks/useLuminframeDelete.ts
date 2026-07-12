import { useCallback } from 'react'
import { AtprotoSession } from './useAtprotoSession'
import { parseAtUri } from '@/infrastructure/atproto/luminframeFeed'

/**
 * Returns a function that deletes one of the signed-in user's own
 * com.luminframe.image records by AT-URI — the retract half of ownership (you
 * can already write to your PDS; this lets you take it back).
 *
 * The write always targets the agent's own repo (`assertDid`), so it can only
 * ever delete the caller's records; the collection + rkey come from the URI.
 */
export function useLuminframeDelete(agent: AtprotoSession['agent']) {
  return useCallback(
    async (uri: string): Promise<void> => {
      if (!agent) throw new Error('Sign in to delete.')
      const parsed = parseAtUri(uri)
      if (!parsed) throw new Error('Malformed record URI.')
      await agent.com.atproto.repo.deleteRecord({
        repo: agent.assertDid,
        collection: parsed.collection,
        rkey: parsed.rkey,
      })
    },
    [agent]
  )
}
