import { useState } from 'react'
import { crestUrl, clubShort, clubColor } from '../data/clubs'

// A coloured monogram badge — the graceful fallback when a club has no mapped
// crest id or the remote image fails to load. Mirrors how FlagImg falls back to
// an emoji, so a wrong/missing club id never shows a broken image.
function Monogram({ club, className }) {
  return (
    <span
      className={`inline-flex items-center justify-center font-extrabold text-white leading-none ${className}`}
      style={{ backgroundColor: clubColor(club) }}
      title={club}
    >
      <span style={{ fontSize: '0.5em', letterSpacing: '0.02em' }}>{clubShort(club)}</span>
    </span>
  )
}

export function ClubCrest({ club, className = 'w-full h-full', alt }) {
  const [failed, setFailed] = useState(false)
  const url = crestUrl(club)
  if (!url || failed) return <Monogram club={club} className={className} />
  return (
    <img
      src={url}
      alt={alt ?? club}
      className={`object-contain ${className}`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
