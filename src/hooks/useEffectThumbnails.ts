import { useEffect, useState } from 'react'
import { Image } from '@/domain/models/Image'
import { EffectKey, ShaderEffect } from '@/types/shader'
import { renderEffectThumbnails } from '@/lib/effectThumbnails'

/**
 * Live effect previews for the picker: a data-URL thumbnail per effect —
 * builtins plus any loaded custom effects — rendered from the current source
 * at each effect's defaults.
 *
 * Returns null while there is no source or while a batch is in flight — the
 * picker shows icons until thumbnails arrive. Keyed on source identity and the
 * custom map's identity, so a batch runs once per loaded image plus once more
 * when custom effects land, not on every render. An in-flight batch is
 * abandoned if either changes again before it resolves.
 *
 * `custom` is required and must be referentially stable (memoize it): the
 * batch re-runs on its identity, so a fresh object per render — exactly what
 * a `= {}` default would quietly be — would re-render thumbnails forever.
 */
export function useEffectThumbnails(
  source: Image | null,
  custom: Record<EffectKey, ShaderEffect>
): Record<EffectKey, string> | null {
  const [thumbnails, setThumbnails] = useState<Record<EffectKey, string> | null>(null)

  useEffect(() => {
    if (!source) {
      setThumbnails(null)
      return
    }
    let cancelled = false
    setThumbnails(null)
    renderEffectThumbnails(source, custom)
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
  }, [source, custom])

  return thumbnails
}
