import { useState, useEffect } from 'react'
import { isConfigured } from '../lib/supabase'
import { todaySeed } from '../lib/seededRandom'
import { isDailyDoneToday, timeUntilNextDaily } from '../lib/daily'
import { isMuted, toggleMuted } from '../lib/sound'
import { getChallengeStreak } from '../lib/challengeStreak'
import Logo from './Logo'
import formationsData from '../data/formations.json'

const FORMATIONS = [
  '4-3-3', '4-3-3 (2)', '4-3-3 (4)',
  '4-4-2', '4-4-2 (2)', '4-4-1-1',
  '4-2-3-1', '4-2-3-1 (2)', '4-2-2-2',
  '4-1-4-1', '4-1-2-1-2', '4-1-2-1-2 (2)',
  '4-3-1-2', '4-3-2-1', '4-5-1',
  '3-5-2', '3-4-3', '3-4-1-2', '3-4-2-1',
  '5-3-2', '5-2-1-2', '5-2-3', '5-4-1',
]
// Most-used shapes shown by default; the rest are revealed via "Show all"
const POPULAR_FORMATIONS = ['4-3-3', '4-4-2', '3-5-2', '4-2-3-1', '5-3-2', '3-4-3']

const GROUP_COLORS = {
  GK:  '#facc15', // yellow
  DEF: '#38bdf8', // sky
  MID: '#4ade80', // green
  ATT: '#f87171', // red
}

// Mini pitch that plots the selected formation's slots as coloured dots
function FormationPreview({ formation }) {
  const slots = formationsData[formation]?.slots || []
  return (
    <div
      className="relative w-full max-w-[240px] mx-auto rounded-xl overflow-hidden border border-gray-700"
      style={{
        aspectRatio: '2/3',
        background: 'linear-gradient(180deg, #166534 0%, #15803d 50%, #166534 100%)',
      }}
    >
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 150" preserveAspectRatio="none">
        <rect x="5" y="5" width="90" height="140" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <line x1="5" y1="75" x2="95" y2="75" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
        <circle cx="50" cy="75" r="10" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.8" />
        <rect x="30" y="5" width="40" height="15" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
        <rect x="30" y="130" width="40" height="15" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
      </svg>
      {slots.map(s => (
        <div
          key={s.id}
          className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        >
          <span
            className="rounded-full border border-black/30 shadow"
            style={{ width: 14, height: 14, backgroundColor: GROUP_COLORS[s.group] || '#fff' }}
          />
          <span className="mt-0.5 text-[8px] font-bold text-white/90 leading-none drop-shadow">{s.position}</span>
        </div>
      ))}
    </div>
  )
}
const MODES = [
  { id: 'classic',  label: 'Classic',  badge: null, desc: 'Full squad, stats visible. Pick your slot. 3 skips.' },
  { id: 'expert',   label: 'Expert',   badge: null, desc: 'Position-compatible players only, no stats. 3 skips.' },
  { id: 'hardcore', label: 'Hardcore', badge: '💀', desc: 'Random position assigned. No stats, no skips. Stats revealed at the end.' },
]

export default function SetupScreen({ onStart, onLeaderboard, onPrivacy, onHistory, onGroup, onHowItWorks, onAchievements, onChallenges, streak, currentGroup }) {
  const [mode, setMode] = useState('classic')
  const [formation, setFormation] = useState('4-3-3')
  const [showAllFormations, setShowAllFormations] = useState(false)
  const [dailyDone] = useState(() => isDailyDoneToday())
  const [countdown, setCountdown] = useState(() => timeUntilNextDaily().label)
  const [muted, setMuted] = useState(() => isMuted())
  const [challengeStreak] = useState(() => getChallengeStreak())

  useEffect(() => {
    if (!dailyDone) return
    const t = setInterval(() => setCountdown(timeUntilNextDaily().label), 30000)
    return () => clearInterval(t)
  }, [dailyDone])

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const hasStreak = streak?.streak > 0
  const hasChallengeStreak = challengeStreak?.streak > 0

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

        {/* Streak badges */}
        {(hasStreak || hasChallengeStreak) && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            {hasStreak && (
              <div className="inline-flex items-center gap-1.5 bg-orange-500/15 border border-orange-500/30 rounded-full px-3 py-1">
                <span className="text-base">🔥</span>
                <span className="text-orange-400 font-bold text-sm">{streak.streak} day streak</span>
              </div>
            )}
            {hasChallengeStreak && (
              <button
                onClick={onChallenges}
                className="inline-flex items-center gap-1.5 bg-yellow-400/15 border border-yellow-400/30 hover:border-yellow-400/60 rounded-full px-3 py-1 transition-colors"
                title="View challenge win streaks"
              >
                <span className="text-base">🤝</span>
                <span className="text-yellow-400 font-bold text-sm">{challengeStreak.streak} challenge wins</span>
              </button>
            )}
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
          <div className="sm:flex sm:gap-3 sm:items-start">
            {/* Buttons */}
            <div className="sm:flex-1">
              <div className="grid grid-cols-3 sm:grid-cols-2 gap-2">
                {(showAllFormations
                  ? FORMATIONS
                  // collapsed: show popular shapes, plus the selected one if it isn't popular
                  : POPULAR_FORMATIONS.includes(formation)
                    ? POPULAR_FORMATIONS
                    : [...POPULAR_FORMATIONS, formation]
                ).map(f => (
                  <button
                    key={f}
                    onClick={() => setFormation(f)}
                    className={`rounded-lg border-2 py-2 px-1 text-xs font-mono font-bold leading-tight transition-all whitespace-nowrap ${
                      formation === f ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300' : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAllFormations(v => !v)}
                className="mt-2 w-full py-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500 hover:text-yellow-300 transition-colors"
              >
                {showAllFormations ? '− Show fewer' : `+ Show all ${FORMATIONS.length}`}
              </button>
            </div>

            {/* Live preview of the selected formation — right side on desktop, below on mobile */}
            <div className="mt-3 sm:mt-0 sm:w-[140px] sm:shrink-0 sm:sticky sm:top-4">
              <FormationPreview formation={formation} />
            </div>
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
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onChallenges} className="py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">🤝 Challenges</button>
          {isConfigured
            ? <button onClick={onLeaderboard} className="py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">🏅 Leaderboard</button>
            : <div />
          }
        </div>
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
