/** A rough extension for a blob's MIME type, for a friendlier File name. */
function extFor(mime: string): string {
  return mime.split('/')[1]?.replace('jpeg', 'jpg') ?? 'png'
}

/**
 * Fetch an image URL into an in-memory File. Fetching first — rather than pointing
 * a texture straight at the remote/asset URL — is what keeps the editor's WebGL
 * canvas untainted: the File becomes a same-origin object URL, so the rendered
 * result stays exportable (download, and the save-to-PDS upload). Returns null on
 * any failure — a bad source just shouldn't load.
 *
 * Both doors that bring in an image by URL use this: a gallery remix (a remote
 * PDS blob) and the landing sample (a bundled asset). Same guarantee, one home.
 */
export async function urlToFile(url: string, name = 'image'): Promise<File | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    const type = blob.type || 'image/png'
    return new File([blob], `${name}.${extFor(type)}`, { type })
  } catch {
    return null
  }
}
