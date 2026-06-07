export default function Logo({ size = 120 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Soft gold glow behind trophy */}
      <radialGradient id="glow" cx="50%" cy="55%" r="50%">
        <stop offset="0%" stopColor="#FACC15" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#FACC15" stopOpacity="0" />
      </radialGradient>
      <circle cx="50" cy="55" r="44" fill="url(#glow)" />

      {/* Star above trophy */}
      <polygon
        points="50,6 52.4,13.2 60,13.2 54.1,17.5 56.4,24.7 50,20.4 43.6,24.7 45.9,17.5 40,13.2 47.6,13.2"
        fill="#FACC15"
      />

      {/* Left handle */}
      <path
        d="M29,38 Q14,43 15,58 Q16,70 29,67"
        stroke="#FACC15"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Right handle */}
      <path
        d="M71,38 Q86,43 85,58 Q84,70 71,67"
        stroke="#FACC15"
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Trophy cup body */}
      <path d="M29,30 H71 L64,67 Q50,78 36,67 Z" fill="#FACC15" />

      {/* Cup inner shadow for depth */}
      <path d="M35,30 H65 L59,62 Q50,70 41,62 Z" fill="#F59E0B" opacity="0.35" />

      {/* Shine streak on cup */}
      <path
        d="M38,35 L41,35 L37,60"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Stem */}
      <rect x="44" y="67" width="12" height="15" rx="1.5" fill="#FACC15" />

      {/* Base plate */}
      <rect x="30" y="82" width="40" height="11" rx="4" fill="#FACC15" />

      {/* Base shine */}
      <rect x="35" y="85" width="14" height="3" rx="1.5" fill="rgba(255,255,255,0.22)" />
    </svg>
  )
}
