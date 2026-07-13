import { Link } from 'react-router-dom'
import { familyOf, effectFamilies } from '@/lib/shaders/catalog'
import { galleryPathForFamily } from '@/lib/galleryRoute'
import { effectLabel } from '@/lib/luminframeImagePresentation'

/**
 * An effect's name as a chip. When the effect belongs to a family this build
 * knows, it's a door into the gallery filtered to that family — "more of this
 * look" — so every effect name anywhere becomes a way into discovery. An effect
 * this build doesn't recognize stays a plain label, never a broken link.
 *
 * Size and padding come from the caller (a card chip is smaller than a detail
 * chip); the color, shape, and the link behavior are the part held in common.
 */
export function EffectChip({ effectKey, className = '' }: { effectKey: string; className?: string }) {
  const family = familyOf(effectKey)
  const base = `rounded-full bg-violet-500/15 font-medium text-violet-300 ${className}`
  const label = effectLabel(effectKey)

  if (!family) return <span className={base}>{label}</span>

  const familyLabel = effectFamilies.find((f) => f.id === family)?.label ?? family
  return (
    <Link
      to={galleryPathForFamily(family)}
      title={`See more ${familyLabel} looks`}
      className={`${base} transition-colors hover:bg-violet-500/30 hover:text-violet-100`}
    >
      {label}
    </Link>
  )
}
