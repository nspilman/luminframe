/**
 * The shared floor under the publish scripts: env-var credentials read one
 * way, one login.
 */
import { AtpAgent } from '@atproto/api'

export const service = process.env.PDS_SERVICE || 'https://bsky.social'

/** Sign in from the env, or exit with the standard instruction. */
export async function loginFromEnv(): Promise<AtpAgent> {
  const identifier = process.env.ATP_IDENTIFIER
  const password = process.env.ATP_APP_PASSWORD
  const creds = identifier && password ? { identifier, password } : null
  if (!creds) {
    console.error('\nSet ATP_IDENTIFIER and ATP_APP_PASSWORD to publish. See this file’s header.')
    process.exit(1)
  }
  const agent = new AtpAgent({ service })
  await agent.login(creds)
  console.log(`Signed in as ${agent.assertDid} on ${service}.`)
  return agent
}

