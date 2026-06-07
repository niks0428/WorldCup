const FLAG_MAP = {
  Brazil: '🇧🇷', Argentina: '🇦🇷', France: '🇫🇷', Germany: '🇩🇪',
  Spain: '🇪🇸', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Portugal: '🇵🇹', Italy: '🇮🇹',
  Netherlands: '🇳🇱', Croatia: '🇭🇷', Uruguay: '🇺🇾', Belgium: '🇧🇪',
  Mexico: '🇲🇽', Senegal: '🇸🇳', Japan: '🇯🇵', Morocco: '🇲🇦',
  Australia: '🇦🇺',
}

export default function PitchView({ slots }) {
  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        maxWidth: 480,
        aspectRatio: '2/3',
        background: 'linear-gradient(180deg, #166534 0%, #15803d 40%, #16a34a 60%, #15803d 100%)',
        boxShadow: '0 0 60px rgba(0,0,0,0.5)',
      }}
    >
      {/* Pitch markings */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 150" preserveAspectRatio="none">
        <rect x="5" y="5" width="90" height="140" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
        <line x1="5" y1="75" x2="95" y2="75" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
        <circle cx="50" cy="75" r="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <circle cx="50" cy="75" r="0.8" fill="rgba(255,255,255,0.3)" />
        <rect x="30" y="5" width="40" height="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <rect x="30" y="130" width="40" height="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
      </svg>

      {slots.map(slot => (
        <PlayerCard key={slot.id} slot={slot} />
      ))}
    </div>
  )
}

function PlayerCard({ slot }) {
  const left = `${slot.x}%`
  const top = `${slot.y}%`

  if (!slot.player) {
    return (
      <div
        className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
        style={{ left, top }}
      >
        <div className="w-10 h-10 rounded-full border-2 border-dashed border-white/30 flex items-center justify-center bg-black/20">
          <span className="text-white/40 text-xs font-bold">{slot.position}</span>
        </div>
      </div>
    )
  }

  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5"
      style={{ left, top }}
    >
      <div className="w-11 h-11 rounded-full bg-yellow-400 border-2 border-white shadow-lg flex items-center justify-center text-lg">
        {FLAG_MAP[slot.player.nation] || '⚽'}
      </div>
      <div className="bg-black/70 rounded px-1.5 py-0.5 text-center max-w-[72px]">
        <div className="text-white text-[10px] font-bold leading-tight truncate">
          {slot.player.name.split(' ').pop()}
        </div>
        <div className="text-yellow-400 text-[10px] font-bold">{slot.player.overall}</div>
      </div>
    </div>
  )
}
