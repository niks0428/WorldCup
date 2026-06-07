import { calculateTeamScore, getTier, buildShareText } from '../utils/scoring'
import PitchView from './PitchView'
import { useState } from 'react'

export default function ResultScreen({ slots, formation, onRestart }) {
  const score = calculateTeamScore(slots)
  const tier = getTier(score)
  const [copied, setCopied] = useState(false)

  function handleShare() {
    const text = buildShareText(tier)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const starters = slots.filter(s => s.player)
  const avgOverall = starters.length
    ? Math.round(starters.reduce((a, s) => a + s.player.overall, 0) / starters.length)
    : 0

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <div className="lg:w-80 xl:w-96 bg-gray-900 flex flex-col p-6 gap-6 justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white mb-6">🏆 Lift the Trophy</h1>

          <div className="text-center bg-gray-800 rounded-2xl p-6 mb-6">
            <div className="text-6xl mb-3">{tier.emoji}</div>
            <div className="text-2xl font-extrabold text-white mb-1">{tier.label}</div>
            <div className="text-gray-400 text-sm">Team Score: <span className="text-yellow-400 font-bold text-lg">{score}</span></div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard label="Avg Rating" value={avgOverall} />
            <StatCard label="Formation" value={formation} />
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Your XI</p>
            {slots.map(slot => (
              slot.player && (
                <div key={slot.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-500 w-8">{slot.position}</span>
                  <span className="text-sm text-white flex-1 truncate">{slot.player.name}</span>
                  <span className="text-yellow-400 font-bold text-sm">{slot.player.overall}</span>
                </div>
              )
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleShare}
            className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Share Result'}
          </button>
          <button
            onClick={onRestart}
            className="w-full py-3 rounded-xl border-2 border-gray-700 hover:border-gray-500 text-gray-300 font-bold transition-colors"
          >
            Play Again
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 bg-gray-950">
        <PitchView slots={slots} />
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-gray-800 rounded-xl p-3 text-center">
      <div className="text-xs text-gray-500 mb-1 uppercase tracking-widest">{label}</div>
      <div className="text-white font-bold text-lg">{value}</div>
    </div>
  )
}
