import { getHistory } from '../lib/history'
import { useState } from 'react'

const MODE_LABEL = { classic: 'Classic', expert: 'Expert', hardcore: '💀', daily: '⭐ Daily' }
const TIER_EMOJI = {
  'World Cup Winners': '🏆', 'Finalists': '🥈', 'Semi-finalists': '🥉',
  'Quarter-finalists': '🎯', 'Round of 16': '🔵', 'Group Stage Exit': '⚫',
}

export default function HistoryScreen({ onBack, onViewSquad }) {
  const history = getHistory()

  function relativeDate(iso) {
    const d = new Date(iso)
    const now = new Date()
    const days = Math.floor((now - d) / 86400000)
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days} days ago`
  }

  if (history.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-10 max-w-lg mx-auto">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 block transition-colors">← Back</button>
        <h1 className="text-2xl font-extrabold text-white mb-8">📋 Your History</h1>
        <div className="text-center text-gray-500 py-16">No squads yet — play a game first!</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 max-w-lg mx-auto">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 block transition-colors">← Back</button>
      <h1 className="text-2xl font-extrabold text-white mb-6">📋 Your History</h1>
      <div className="space-y-3">
        {history.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onViewSquad(entry)}
            className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-2xl p-4 transition-colors"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{TIER_EMOJI[entry.tier] || '⚽'}</span>
                <div>
                  <div className="text-white font-bold text-sm">{entry.tier}</div>
                  <div className="text-gray-400 text-xs">{entry.formation} · {MODE_LABEL[entry.mode] || entry.mode}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-yellow-400 font-extrabold text-xl">{entry.score}</div>
                <div className="text-gray-500 text-xs">{relativeDate(entry.date)}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {entry.players.slice(0, 6).map((p, i) => (
                <span key={i} className="text-xs bg-gray-700 text-gray-300 rounded px-1.5 py-0.5 truncate max-w-[90px]">
                  {p.player.name.split(' ').pop()}
                </span>
              ))}
              {entry.players.length > 6 && (
                <span className="text-xs text-gray-500">+{entry.players.length - 6} more</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
