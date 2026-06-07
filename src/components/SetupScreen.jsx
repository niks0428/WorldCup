import { useState, useEffect } from 'react'
import { isConfigured } from '../lib/supabase'
import { todaySeed } from '../lib/seededRandom'
import { isDailyDoneToday, timeUntilNextDaily } from '../lib/daily'
import { isMuted, toggleMuted } from '../lib/sound'
import Logo from './Logo'

const FORMATIONS = ['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '5-3-2', '3-4-3', '4-5-1']
const MODES = [
  { id: 'classic',  label: 'Classic',  badge: null, desc: 'Full squad, stats visible. Pick your slot. 3 skips.' },
  { id: 'expert',   label: 'Expert',   badge: null, desc: 'Position-compatible players only, no stats. 3 skips.' },
  { id: 'hardcore', label: 'Hardcore', badge: '💀', desc: 'Random position assigned. No stats, no skips. Stats revealed at the end.' },
]

export default function SetupScreen({ onStart, onLeaderboard, onPrivacy, onHistory, onGroup, onHowItWorks, onAchievements, streak, currentGroup }) {
  const [mode, setMode] = useState('classic')
  const [formation, setFormation] = useState('4-3-3')
  const [dailyDone] = useState(() => isDailyDoneToday())
  const [countdown, setCountdown] = useState(() => timeUntilNextDaily().label)
  const [muted, setMuted] = useState(() => isMuted())

  useEffect(() => {
    if (!dailyDone) return
    const t = setInterval(() => setCountdown(timeUntilNextDaily().label), 30000)
    return () => clearInterval(t)
  }, [dailyDone])

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const hasStreak = streak?.streak > 0

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-10 relative">
      <button
        onClick={() => setMuted(toggleMuted())}
        className="absolute top-4 right-4 w-10 h-10 rounded-full border border-gray-700 hover:border-gray-500 text-lg flex items-center justify-center transition-colors"
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
      <div className="text-center mb-6">
        <div className="flex justify-center mb-3">
          <Logo size={100} />
        </div>
        <h1 className="text-white mb-1 leading-none">
          <span className="block text-2xl font-light tracking-[0.25em] text-yellow-400/80 uppercase">Lift the</span>
          <span className="block text-5xl md:text-6xl font-extrabold tracking-tight">Trophy</span>
        </h1>

        {/* Streak badge */}
        {hasStreak && (
          <div className="inline-flex items-center gap-1.5 mt-3 bg-orange-500/15 border border-orange-500/30 rounded-full px-3 py-1">
            <span className="text-base">🔥</span>
            <span className="text-orange-400 font-bold text-sm">{streak.streak} day streak</span>
          </div>
        )}
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Daily Challenge */}
        {dailyDone ? (
          <div className="w-full rounded-2xl border-2 border-gray-700 bg-gray-900 p-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-400 font-extrabold text-base">✅ Daily Complete</span>
                  {hasStreak && <span className="text-xs text-orange-400 font-bold">🔥 {streak.streak}</span>}
                </div>
                <div className="text-gray-500 text-xs">Next challenge in {countdown}</div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onStart({ mode: 'daily', formation, seed: todaySeed(), isDaily: true })}
            className="w-full rounded-2xl border-2 border-yellow-400/60 bg-yellow-400/10 hover:bg-yellow-400/20 p-4 text-left transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-yellow-400 font-extrabold text-base">⭐ Daily Challenge</span>
                  {hasStreak && <span className="text-xs text-orange-400 font-bold">🔥 {streak.streak}</span>}
                </div>
                <div className="text-gray-400 text-xs">Everyone gets the same spins · {today}</div>
              </div>
              <span className="text-yellow-400 text-xl group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        )}

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-800" />
          <span className="text-gray-600 text-xs uppercase tracking-widest">or play your own</span>
          <div className="flex-1 h-px bg-gray-800" />
        </div>

        {/* Mode */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-2">Mode</h2>
          <div className="flex flex-col gap-2">
            {MODES.map(m => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  mode === m.id
                    ? m.id === 'hardcore' ? 'border-red-500 bg-red-500/10 text-white' : 'border-yellow-400 bg-yellow-400/10 text-white'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-bold text-sm">{m.label}</span>
                  {m.badge && <span>{m.badge}</span>}
                </div>
                <div className="text-xs leading-snug opacity-80">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Formation */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-2">Formation</h2>
          <div className="grid grid-cols-4 gap-2">
            {FORMATIONS.map(f => (
              <button
                key={f}
                onClick={() => setFormation(f)}
                className={`rounded-lg border-2 py-2 text-sm font-mono font-bold transition-all ${
                  formation === f ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300' : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
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
            mode === 'hardcore' ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20' : 'bg-yellow-400 hover:bg-yellow-300 text-gray-900 shadow-yellow-400/20'
          }`}
        >
          {mode === 'hardcore' ? '💀 Start Hardcore' : 'Start Drafting →'}
        </button>

        {/* Nav buttons — always 2-column grid */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onHistory}      className="py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">📋 History</button>
          <button onClick={onHowItWorks}   className="py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">ℹ️ How to Score</button>
          <button onClick={onAchievements} className="py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">🏆 Achievements</button>
          {isConfigured
            ? <button onClick={onGroup} className="py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">{currentGroup ? `👥 ${currentGroup.name}` : '👥 Groups'}</button>
            : <div />
          }
        </div>
        {isConfigured && (
          <button onClick={onLeaderboard} className="w-full py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">
            🏅 Leaderboard
          </button>
        )}
      </div>

      <div className="mt-8 text-center space-y-2">
        <p className="text-gray-700 text-xs max-w-sm mx-auto leading-relaxed">
          This is an independent fan-made game. Not affiliated with FIFA, UEFA, EA Sports, or any football organisation. Player names and ratings used for entertainment only.
        </p>
        <button onClick={onPrivacy} className="text-gray-600 hover:text-gray-400 text-xs transition-colors underline underline-offset-2">
          Privacy Policy
        </button>
      </div>
    </div>
  )
}
