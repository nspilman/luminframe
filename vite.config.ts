import { defineConfig, loadEnv, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import glsl from 'vite-plugin-glsl';
import path from "path"

/**
 * The OAuth client metadata document, derived from the deploy URL. atproto
 * requires `client_id` to be the exact URL the document is served at, so it
 * can't be a hand-edited static file — it must track wherever the app is
 * deployed. Loopback dev doesn't use this at all (the client builds a synthetic
 * localhost client), so it's only emitted when VITE_PUBLIC_URL is set.
 */
function buildClientMetadata(publicUrl: string) {
  return {
    client_id: `${publicUrl}/client-metadata.json`,
    client_name: 'Luminframe',
    client_uri: publicUrl,
    redirect_uris: [`${publicUrl}/`],
    scope: 'atproto transition:generic',
    grant_types: ['authorization_code', 'refresh_token'],
    response_types: ['code'],
    token_endpoint_auth_method: 'none',
    application_type: 'web',
    dpop_bound_access_tokens: true,
  }
}

function clientMetadataPlugin(publicUrl?: string): Plugin {
  return {
    name: 'atproto-client-metadata',
    // Serve it in dev (only matters if you run a non-loopback dev origin).
    configureServer(server) {
      if (!publicUrl) return
      server.middlewares.use((req, res, next) => {
        if (req.url !== '/client-metadata.json') return next()
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(buildClientMetadata(publicUrl)))
      })
    },
    // Emit it into the production build at the site root.
    generateBundle() {
      if (!publicUrl) return
      this.emitFile({
        type: 'asset',
        fileName: 'client-metadata.json',
        source: JSON.stringify(buildClientMetadata(publicUrl), null, 2),
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), glsl(), clientMetadataPlugin(env.VITE_PUBLIC_URL)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
