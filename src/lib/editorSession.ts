import { Image } from '@/domain/models/Image'
import { Color } from '@/domain/value-objects/Color'
import { ShaderInputVars, ShaderType } from '@/types/shader'

/**
 * Persisting the in-progress edit so it survives a full-page navigation — most
 * importantly the OAuth sign-in redirect, where the user leaves to authorize and
 * comes back to a freshly loaded SPA. We snapshot just before the redirect and
 * restore on the next load.
 *
 * The hard parts are images and value types. Images are held as blob URLs that
 * die on reload, so we convert them to data URLs; and a `ShaderInputVars` value
 * can be a primitive, a number array, a Float32Array, a Color, or an Image — so
 * each value is tagged on the way out and rebuilt on the way in. Images are
 * de-duplicated by id (the source is referenced by the draft and every applied
 * effect) so localStorage holds one copy, not one per reference.
 */

const STORAGE_KEY = 'luminframe:editor-session'
// v2: shader keys were normalized (e.g. pixelateEffect → pixelate). A v1
// snapshot can reference a key that no longer exists in the library, which would
// fault on restore — so loadEditorSession rejects mismatched versions, quietly
// discarding any stale in-flight snapshot rather than rehydrating a dead effect.
const VERSION = 2

type SerializedValue =
  | { t: 'str'; v: string }
  | { t: 'num'; v: number }
  | { t: 'bool'; v: boolean }
  | { t: 'null' }
  | { t: 'numArr'; v: number[] }
  | { t: 'f32'; v: number[] }
  | { t: 'color'; v: [number, number, number] }
  | { t: 'imageRef'; id: string }

type SerializedVars = Record<string, SerializedValue>

interface SerializedImage {
  id: string
  /** A data URL — self-contained pixels that survive a reload. */
  url: string
}

interface SerializedEffect {
  type: ShaderType
  params: SerializedVars
}

export interface SerializedSession {
  version: number
  selectedShader: ShaderType
  draft: SerializedVars
  effects: SerializedEffect[]
  images: SerializedImage[]
}

/** The live editor state we snapshot and restore. */
export interface EditorSessionState {
  selectedShader: ShaderType
  draftVars: ShaderInputVars
  effects: ReadonlyArray<{ type: ShaderType; params: ShaderInputVars }>
}

// --- pure value (de)serialization -----------------------------------------

/** Tag a single parameter value. Images become id-references resolved separately. */
export function serializeValue(value: ShaderInputVars[string]): SerializedValue {
  if (value === null) return { t: 'null' }
  if (value instanceof Image) return { t: 'imageRef', id: value.id }
  if (value instanceof Color) return { t: 'color', v: [value.r, value.g, value.b] }
  if (value instanceof Float32Array) return { t: 'f32', v: Array.from(value) }
  if (Array.isArray(value)) return { t: 'numArr', v: value }
  if (typeof value === 'number') return { t: 'num', v: value }
  if (typeof value === 'boolean') return { t: 'bool', v: value }
  return { t: 'str', v: value }
}

/** Rebuild a value from its tag, resolving image references via the rebuilt map. */
export function deserializeValue(
  sv: SerializedValue,
  imagesById: Map<string, Image>
): ShaderInputVars[string] {
  switch (sv.t) {
    case 'null':
      return null
    case 'imageRef':
      return imagesById.get(sv.id) ?? null
    case 'color':
      return Color.fromRGB(sv.v[0], sv.v[1], sv.v[2])
    case 'f32':
      return new Float32Array(sv.v)
    case 'numArr':
      return sv.v
    case 'num':
    case 'bool':
    case 'str':
      return sv.v
  }
}

function serializeVars(vars: ShaderInputVars): SerializedVars {
  const out: SerializedVars = {}
  for (const [key, value] of Object.entries(vars)) {
    out[key] = serializeValue(value)
  }
  return out
}

function deserializeVars(vars: SerializedVars, imagesById: Map<string, Image>): ShaderInputVars {
  const out: ShaderInputVars = {}
  for (const [key, sv] of Object.entries(vars)) {
    out[key] = deserializeValue(sv, imagesById)
  }
  return out
}

// --- image I/O -------------------------------------------------------------

function collectImages(vars: ShaderInputVars, into: Map<string, Image>): void {
  for (const value of Object.values(vars)) {
    if (value instanceof Image) into.set(value.id, value)
  }
}

/** Works for both `blob:` and `data:` URLs (fetch resolves both same-document). */
async function toDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read image as data URL'))
    reader.readAsDataURL(blob)
  })
}

// --- session (de)serialization ---------------------------------------------

export async function serializeSession(state: EditorSessionState): Promise<SerializedSession> {
  const imageMap = new Map<string, Image>()
  collectImages(state.draftVars, imageMap)
  state.effects.forEach((e) => collectImages(e.params, imageMap))

  const images: SerializedImage[] = await Promise.all(
    [...imageMap.values()].map(async (img) => ({
      id: img.id,
      url: await toDataUrl(img.data.url),
    }))
  )

  return {
    version: VERSION,
    selectedShader: state.selectedShader,
    draft: serializeVars(state.draftVars),
    effects: state.effects.map((e) => ({ type: e.type, params: serializeVars(e.params) })),
    images,
  }
}

export async function deserializeSession(s: SerializedSession): Promise<EditorSessionState> {
  const imagesById = new Map<string, Image>()
  await Promise.all(
    s.images.map(async (si) => {
      imagesById.set(si.id, await Image.fromUrl(si.url))
    })
  )

  return {
    selectedShader: s.selectedShader,
    draftVars: deserializeVars(s.draft, imagesById),
    effects: s.effects.map((e) => ({ type: e.type, params: deserializeVars(e.params, imagesById) })),
  }
}

// --- localStorage ----------------------------------------------------------

/**
 * Persist a snapshot. Returns false (and warns) on failure — most likely a
 * QuotaExceededError from a very large image — so callers never block a redirect
 * on persistence.
 */
export function saveEditorSession(session: SerializedSession): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    return true
  } catch (err) {
    console.warn('Could not persist editor session (it may be too large):', err)
    return false
  }
}

export function loadEditorSession(): SerializedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SerializedSession
    if (parsed.version !== VERSION) return null
    return parsed
  } catch {
    return null
  }
}

export function clearEditorSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Nothing actionable; a stale entry is harmless and overwritten next save.
  }
}
