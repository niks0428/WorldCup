import { useState, useEffect } from 'react'
import { FlagImg } from '../lib/flags'

function statColor(v) {
  if (v > 80) return 'text-green-400'
  if (v <= 50) return 'text-red-500'
  return 'text-yellow-400'
}
function barColor(v) {
  if (v > 80) return 'bg-green-400'
  if (v <= 50) return 'bg-red-500'
  return 'bg-yellow-400'
}

const STATS = [['PAC','pac'],['SHO','sho'],['PAS','pas'],['DRI','dri'],['DEF','def'],['PHY','phy']]

function PlayerRevealCard({ slot, revealed }) {
  const p = slot.player
  return (
    <div className={`bg-gray-800 rounded-xl p-3 transition-all duration-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="w-8 h-6 rounded overflow-hidden inline-flex shrink-0 shadow">
          <FlagImg nation={p.nation} className="w-full h-full object-cover" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm truncate">{p.name}</div>
          <div className="text-gray-400 text-xs">{slot.position} · {p.nation}</div>
        </div>
        <div className={`text-2xl font-extrabold shrink-0 ${statColor(p.overall)}`}>{p.overall}</div>
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {STATS.map(([label, key]) => (
          <div key={key} className="flex items-center gap-1">
            <span className="text-[9px] font-bold text-gray-500 w-5 shrink-0">{label}</span>
            <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${barColor(p[key])}`} style={{ width: `${p[key]}%` }} />
            </div>
            <span className={`text-[10px] font-bold w-5 text-right tabular-nums ${statColor(p[key])}`}>{p[key]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RevealScreen({ slots, onDone }) {
  const filled = slots.filter(s => s.player)
  const [revealedCount, setRevealedCount] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (revealedCount >= filled.length) {
      setTimeout(() => setDone(true), 600)
      return
    }
    const t = setTimeout(() => setRevealedCount(n => n + 1), 700)
    return () => clearTimeout(t)
  }, [revealedCount, filled.length])

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur px-4 py-4 flex items-center justify-between z-10 border-b border-gray-800">
        <div>
          <h1 className="text-lg font-extrabold text-white">💀 Squad Revealed</h1>
          <p className="text-gray-400 text-xs">{revealedCount}/{filled.length} players revealed</p>
        </div>
        {done && (
          <button
            onClick={onDone}
            className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-extrabold text-sm transition-colors animate-pulse"
          >
            See Score →
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 max-w-lg mx-auto w-full">
        {filled.map((slot, i) => (
          <PlayerRevealCard
            key={slot.id}
            slot={slot}
            revealed={i < revealedCount}
          />
        ))}
      </div>
    </div>
  )
}
