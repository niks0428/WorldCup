import { useState } from 'react'
import { isConfigured } from '../lib/supabase'

const FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '3-4-3', '4-5-1']
const MODES = [
  {
    id: 'classic',
    label: 'Classic',
    badge: null,
    desc: 'Full squad shown. Pick your player, then choose which slot to fill. 3 skips.',
  },
  {
    id: 'expert',
    label: 'Expert',
    badge: null,
    desc: 'Position-compatible players only. Pick player, choose slot. 3 skips.',
  },
  {
    id: 'hardcore',
    label: 'Hardcore',
    badge: '💀',
    desc: 'The game picks your position randomly. Must choose a player. No skips.',
  },
]

export default function SetupScreen({ onStart, onLeaderboard }) {
  const [mode, setMode] = useState('classic')
  const [formation, setFormation] = useState('4-3-3')

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12">
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
          Lift the Trophy
        </h1>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Spin real World Cup &amp; Euro squads, draft your ultimate XI, and find out if your team could go all the way.
        </p>
      </div>

      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">Mode</h2>
          <div className="flex flex-col gap-3">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  mode === m.id
                    ? m.id === 'hardcore'
                      ? 'border-red-500 bg-red-500/10 text-white'
                      : 'border-yellow-400 bg-yellow-400/10 text-white'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-base">{m.label}</span>
                  {m.badge && <span>{m.badge}</span>}
                </div>
                <div className="text-xs leading-snug">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">Formation</h2>
          <div className="grid grid-cols-4 gap-2">
            {FORMATIONS.map(f => (
              <button
                key={f}
                onClick={() => setFormation(f)}
                className={`rounded-lg border-2 py-2 text-sm font-mono font-bold transition-all ${
                  formation === f
                    ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => onStart({ mode, formation })}
          className={`w-full py-4 rounded-2xl font-extrabold text-lg transition-colors shadow-lg ${
            mode === 'hardcore'
              ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20'
              : 'bg-yellow-400 hover:bg-yellow-300 text-gray-900 shadow-yellow-400/20'
          }`}
        >
          {mode === 'hardcore' ? '💀 Start Hardcore' : 'Start Drafting →'}
        </button>

        {isConfigured && (
          <button
            onClick={onLeaderboard}
            className="w-full py-3 rounded-2xl border-2 border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white font-bold transition-colors"
          >
            🏅 Leaderboard
          </button>
        )}
      </div>
    </div>
  )
}
