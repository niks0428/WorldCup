import { useState, useEffect } from 'react'
import { isConfigured } from '../lib/supabase'
import { todaySeed, randomSeed } from '../lib/seededRandom'
import { isDailyDoneToday, timeUntilNextDaily, dailyDifficulty, dailyFormation, DIFFICULTY_LABEL } from '../lib/daily'
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
  { id: 'classic',  label: 'Classic',  badge: null, swapLabel: '2🔄 · 1⏭️', desc: 'Full squad, stats visible. 2 club swaps, 1 era swap.' },
  { id: 'expert',   label: 'Expert',   badge: null, swapLabel: '1🔄',        desc: 'Position-compatible players only. No stats. 1 club swap.' },
  { id: 'hardcore', label: 'Hardcore', badge: '💀', swapLabel: 'No swaps',   desc: 'Random position. No stats. Stats revealed at the end.' },
]

const ERA_OPTIONS = [
  { id: 'all',    label: 'All-time' },
  { id: '2000s',  label: '2000s+' },
  { id: '2010s',  label: '2010s+' },
  { id: 'modern', label: 'Modern' },
]

export default function SetupScreen({ competition = 'wc', onStart, onBack, onLeaderboard, onPrivacy, onHistory, onGroup, onHowItWorks, onAchievements, onChallenges, onPlayers, onStats, streak, currentGroup }) {
  const isPL = competition === 'pl'
  const [mode, setMode] = useState('classic')
  const [formation, setFormation] = useState('4-3-3')
  const [eraFilter, setEraFilter] = useState('all')
  const [blindDraft, setBlindDraft] = useState(false)
  const [showAllFormations, setShowAllFormations] = useState(false)
  const [h2hSeed, setH2hSeed] = useState(null)
  const [h2hCopied, setH2hCopied] = useState(false)
  const [dailyDone] = useState(() => isDailyDoneToday(competition))
  const [countdown, setCountdown] = useState(() => timeUntilNextDaily().label)
  const [muted, setMuted] = useState(() => isMuted())
  const [challengeStreak] = useState(() => getChallengeStreak(competition))

  useEffect(() => {
    if (!dailyDone) return
    const t = setInterval(() => setCountdown(timeUntilNextDaily().label), 30000)
    return () => clearInterval(t)
  }, [dailyDone])

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const todayDifficulty = dailyDifficulty(competition)
  const todayFormationLock = dailyFormation(competition)
  const hasStreak = streak?.streak > 0
  const hasChallengeStreak = challengeStreak?.streak > 0

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-10 relative">
      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-4 left-4 h-10 px-3 rounded-full border border-gray-700 hover:border-gray-500 text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
          title="Change competition"
        >
          ← Back
        </button>
      )}
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

        <div className={`inline-flex items-center gap-1.5 mt-3 rounded-full px-3 py-1 border ${isPL ? 'bg-sky-400/15 border-sky-400/30' : 'bg-yellow-400/15 border-yellow-400/30'}`}>
          <span className="text-base">{isPL ? '🦁' : '🌍'}</span>
          <span className={`font-bold text-sm ${isPL ? 'text-sky-400' : 'text-yellow-400'}`}>
            {isPL ? 'Premier League · go 38-0-0' : 'World Cup'}
          </span>
        </div>

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
        {/* Daily Challenge — per competition, difficulty rotates daily */}
        {dailyDone ? (
          <div className="w-full rounded-2xl border-2 border-gray-700 bg-gray-900 p-4 text-left">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-400 font-extrabold text-base">✅ Daily Complete</span>
                  {hasStreak && <span className="text-xs text-orange-400 font-bold">🔥 {streak.streak}</span>}
                </div>
                <div className="text-gray-500 text-xs">Today was {DIFFICULTY_LABEL[todayDifficulty]} · <span className="font-mono">{todayFormationLock}</span> · Next in {countdown}</div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => onStart({ mode: 'daily', difficulty: todayDifficulty, formation: todayFormationLock, seed: todaySeed(), isDaily: true })}
            className="w-full rounded-2xl border-2 border-yellow-400/60 bg-yellow-400/10 hover:bg-yellow-400/20 p-4 text-left transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="text-yellow-400 font-extrabold text-base">⭐ Daily Challenge</span>
                  <span className="text-[10px] bg-gray-800 text-gray-300 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">{DIFFICULTY_LABEL[todayDifficulty]}</span>
                  <span className="text-[10px] bg-yellow-400/20 text-yellow-300 font-mono font-bold px-1.5 py-0.5 rounded border border-yellow-400/30">🔒 {todayFormationLock}</span>
                  {hasStreak && <span className="text-xs text-orange-400 font-bold">🔥 {streak.streak}</span>}
                </div>
                <div className="text-gray-400 text-xs">Everyone gets the same spins · {today}</div>
              </div>
              <span className="text-yellow-400 text-xl group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </button>
        )}

        {/* Head-to-Head challenge */}
        {(() => {
          function createH2H() {
            const seed = randomSeed()
            setH2hSeed(seed)
            const url = `${window.location.href.split('#')[0]}#h2h=${formation}|${seed}|${isPL ? 'pl' : 'wc'}`
            navigator.clipboard.writeText(url).then(() => {
              setH2hCopied(true); setTimeout(() => setH2hCopied(false), 3000)
            })
          }
          return (
            <div className="rounded-2xl border-2 border-gray-700 bg-gray-900 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-base">⚔️</span>
                <div>
                  <div className="text-white font-bold text-sm">Head-to-Head</div>
                  <div className="text-gray-500 text-xs">Same spins, you vs a mate — highest score wins</div>
                </div>
              </div>
              {!h2hSeed ? (
                <button
                  onClick={createH2H}
                  className="w-full py-2 rounded-xl border border-gray-600 hover:border-yellow-400/60 text-gray-300 hover:text-yellow-300 text-sm font-bold transition-all"
                >
                  Generate Challenge Link
                </button>
              ) : (
                <div className="space-y-2">
                  <div className={`text-center text-xs font-bold py-1.5 rounded-lg ${h2hCopied ? 'text-green-400' : 'text-gray-400'}`}>
                    {h2hCopied ? '✓ Link copied — send it to your opponent!' : 'Link ready · click to copy again'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={createH2H}
                      className="flex-1 py-2 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 text-xs font-bold transition-colors"
                    >
                      📋 Copy Link
                    </button>
                    <button
                      onClick={() => onStart({ mode: 'classic', formation, seed: h2hSeed, isH2H: true, eraFilter: isPL ? 'all' : eraFilter, blindDraft: false })}
                      className="flex-1 py-2 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-900 text-xs font-bold transition-colors"
                    >
                      Play Your Side →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })()}

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
                onClick={() => { setMode(m.id); if (m.id !== 'classic') setBlindDraft(false) }}
                className={`rounded-xl border-2 p-3 text-left transition-all ${
                  mode === m.id
                    ? m.id === 'hardcore' ? 'border-red-500 bg-red-500/10 text-white' : 'border-yellow-400 bg-yellow-400/10 text-white'
                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{m.label}</span>
                    {m.badge && <span>{m.badge}</span>}
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    m.id === 'hardcore' ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'
                  }`}>
                    {m.swapLabel}
                  </span>
                </div>
                <div className="text-xs leading-snug opacity-80">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Blind Draft toggle — Classic only (expert/hardcore always hide stats) */}
        {mode === 'classic' && (
          <button
            onClick={() => setBlindDraft(v => !v)}
            className={`w-full flex items-center justify-between rounded-xl border-2 px-4 py-3 transition-all ${
              blindDraft
                ? 'border-yellow-400 bg-yellow-400/10 text-white'
                : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
            }`}
          >
            <div className="text-left">
              <div className="font-bold text-sm">🙈 Blind Draft</div>
              <div className="text-xs opacity-70 mt-0.5">Pick players without seeing their stats</div>
            </div>
            <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ml-3 ${blindDraft ? 'bg-yellow-400' : 'bg-gray-700'}`}>
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${blindDraft ? 'left-5' : 'left-0.5'}`} />
            </div>
          </button>
        )}

        {/* Era Filter — WC / Euro only */}
        {!isPL && (
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-2">Era</h2>
            <div className="grid grid-cols-4 gap-1.5">
              {ERA_OPTIONS.map(e => (
                <button
                  key={e.id}
                  onClick={() => setEraFilter(e.id)}
                  className={`py-2 rounded-lg border-2 text-xs font-bold transition-all ${
                    eraFilter === e.id
                      ? 'border-yellow-400 bg-yellow-400/10 text-yellow-300'
                      : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </div>
        )}

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
          onClick={() => onStart({ mode, formation, eraFilter: isPL ? 'all' : eraFilter, blindDraft: mode === 'classic' ? blindDraft : false })}
          className={`w-full py-4 rounded-2xl font-extrabold text-lg transition-colors shadow-lg ${
            mode === 'hardcore' ? 'bg-red-500 hover:bg-red-400 text-white shadow-red-500/20' : 'bg-yellow-400 hover:bg-yellow-300 text-gray-900 shadow-yellow-400/20'
          }`}
        >
          {mode === 'hardcore' ? '💀 Start Hardcore' : 'Start Drafting →'}
        </button>

        {/* Nav buttons — 2-column grid */}
        <div className="grid grid-cols-2 gap-2">
          <button onClick={onHistory}      className="py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">📋 History</button>
          <button onClick={onStats}        className="py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">📊 My Stats</button>
          <button onClick={onAchievements} className="py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">🏆 Achievements</button>
          <button onClick={onChallenges}   className="py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">🤝 Challenges</button>
          <button onClick={onHowItWorks}   className="col-span-2 py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">ℹ️ How to Score</button>
        </div>

        {/* Browse everyone in the spin pool */}
        <button onClick={onPlayers} className="w-full py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">
          🔎 Players in the Spin
        </button>

        {/* Groups + Leaderboard share the bottom row */}
        {isConfigured && (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={onGroup} className="py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors">{currentGroup ? `👥 ${currentGroup.name}` : '👥 Groups'}</button>
            <button onClick={onLeaderboard} className="py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white text-sm font-bold transition-colors">🏅 Leaderboard</button>
          </div>
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
