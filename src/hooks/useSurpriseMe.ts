import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchNetworkImages } from '@/infrastructure/atproto/luminframeFeed'
import { editorRemixPath } from '@/lib/galleryRoute'

/**
 * "Surprise me": open a random image from the network in the editor as a remix —
 * so the entrance shows off what people have actually made, and editing the pick
 * records lineage back to it. It reuses the ?remix= door (one mechanism, provenance
 * carried), rather than loading the image as an anonymous sample.
 *
 * Returns false when the network has nothing to offer (or the lookup fails), so the
 * caller can fall back to the bundled sample — the entrance never dead-ends.
 */
export function useSurpriseMe(): { surprise: () => Promise<boolean>; isFinding: boolean } {
  const navigate = useNavigate()
  const [isFinding, setIsFinding] = useState(false)

  const surprise = useCallback(async (): Promise<boolean> => {
    setIsFinding(true)
    try {
      const images = await fetchNetworkImages()
      const withImage = images.filter((image) => image.imageUrl)
      if (withImage.length === 0) return false
      const pick = withImage[Math.floor(Math.random() * withImage.length)]
      navigate(editorRemixPath(pick.uri))
      return true
    } catch {
      return false
    } finally {
      setIsFinding(false)
    }
  }, [navigate])

  return { surprise, isFinding }
}
