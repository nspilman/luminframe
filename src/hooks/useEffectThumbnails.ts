import { useEffect, useState } from 'react'
import { Image } from '@/domain/models/Image'
import { ShaderType } from '@/types/shader'
import { renderEffectThumbnails } from '@/lib/effectThumbnails'

/**
 * Live effect previews for the picker: a data-URL thumbnail per effect,
 * rendered from the current source at each effect's defaults.
 *
 * Returns null while there is no source or while a batch is in flight — the
 * picker shows icons until thumbnails arrive. Keyed on source identity, so a
 * batch runs once per loaded image, not on every parameter tweak. An in-flight
 * batch is abandoned if the source changes again before it resolves.
 */
export function useEffectThumbnails(
  source: Image | null
): Record<ShaderType, string> | null {
  const [thumbnails, setThumbnails] = useState<Record<ShaderType, string> | null>(null)

  useEffect(() => {
    if (!source) {
      setThumbnails(null)
      return
    }
    let cancelled = false
    setThumbnails(null)
    renderEffectThumbnails(source)
      .then((result) => {
        if (!cancelled) setThumbnails(result)
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('Failed to render effect thumbnails:', error)
          setThumbnails(null)
        }
      })
    return () => {
      cancelled = true
    }
  }, [source])

  return thumbnails
}
