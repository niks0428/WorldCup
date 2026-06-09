import { useState, useEffect } from 'react'
import { FlagImg } from '../lib/flags'
import { calculateTeamScore } from '../utils/scoring'
import { simulateTournament } from '../utils/tournament'
import { simulateLeague } from '../utils/league'

function formatScorers(scorers) {
  if (!scorers || scorers.length === 0) return null
  const counts = {}
  for (const name of scorers) counts[name] = (counts[name] ?? 0) + 1
  const parts = Object.entries(counts).map(([name, n]) => n > 1 ? `${name} ×${n}` : name)
  const joined = parts.join(', ')
  return joined.length > 48 ? joined.slice(0, 45) + '…' : joined
}

function getStepMs(index, total, isPL) {
  if (isPL) {
    const remaining = total - index
    if (remaining <= 1) return 1400
    if (remaining <= 3) return 600
    if (remaining <= 6) return 280
    return 130
  }
  // WC: group games 900ms; R16 1200ms; QF 1600ms; SF 2200ms; Final 3000ms
  const koIndex = index - 3
  if (koIndex < 0) return 900
  return [1200, 1600, 2200, 3000][koIndex] ?? 3000
}

function MatchRevealCard({ match, revealed, isPL, index }) {
  const chipCls = match.result === 'W'
    ? 'bg-green-500/20 text-green-400'
    : match.result === 'L'
      ? 'bg-red-500/20 text-red-400'
      : 'bg-yellow-400/20 text-yellow-400'
  const leftLabel = isPL ? `MD ${index + 1}` : match.stage
  const scorersStr = formatScorers(match.scorers)
  return (
    <div className={`bg-gray-800 rounded-xl p-3 transition-all duration-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="flex items-center gap-3">
        <div className="w-[4.5rem] shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-gray-500 leading-tight">{leftLabel}</div>
          {isPL
            ? <div className="text-[9px] text-gray-600 mt-0.5">{match.home ? 'home' : 'away'}</div>
            : match.pens && <div className="text-[9px] text-gray-600 mt-0.5">on pens</div>}
        </div>
        <span className="w-9 h-6 inline-flex shrink-0">
          <FlagImg nation={match.opponent} className="w-full h-full" />
        </span>
        <div className="flex-1 min-w-0">
          <div className="text-white font-bold text-sm truncate">{match.opponent}</div>
        </div>
        <div className="text-2xl font-extrabold text-white tabular-nums shrink-0">{match.gf}–{match.ga}</div>
        <span className={`text-[11px] font-extrabold rounded px-2 py-1 w-7 text-center shrink-0 ${chipCls}`}>
          {match.result}
        </span>
      </div>
      {scorersStr && (
        <div className="text-[10px] text-green-400/80 mt-1.5 pl-[4.5rem] truncate">
          ⚽ {scorersStr}
        </div>
      )}
    </div>
  )
}

export default function RunRevealScreen({ slots, seed, competition = 'wc', onDone }) {
  const isPL = competition === 'pl'
  const score = calculateTeamScore(slots)
  const run = isPL ? simulateLeague(slots, score, seed) : simulateTournament(slots, score, seed)
  const matches = run.matches

  const [revealedCount, setRevealedCount] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (revealedCount >= matches.length) {
      const t = setTimeout(() => setDone(true), 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setRevealedCount(n => n + 1), getStepMs(revealedCount, matches.length, isPL))
    return () => clearTimeout(t)
  }, [revealedCount, matches.length, isPL])

  // Running tally only counts matches revealed so far.
  const shown = matches.slice(0, revealedCount)
  const gf = shown.reduce((a, m) => a + m.gf, 0)
  const ga = shown.reduce((a, m) => a + m.ga, 0)
  const won = shown.filter(m => m.result === 'W').length
  const drawn = shown.filter(m => m.result === 'D').length
  const lost = shown.filter(m => m.result === 'L').length
  const pts = won * 3 + drawn

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur px-4 py-4 z-10 border-b border-gray-800">
        <div className="max-w-lg mx-auto w-full flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-extrabold text-white">{isPL ? '🦁 The Season' : '🏆 Tournament Run'}</h1>
            <p className="text-gray-400 text-xs">{Math.min(revealedCount, matches.length)}/{matches.length} {isPL ? 'games' : 'matches'} played</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {isPL && (
              <div className="text-center">
                <div className="text-white font-extrabold text-lg tabular-nums leading-none">{pts}</div>
                <div className="text-[9px] uppercase tracking-wider text-gray-500">Pts</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-green-400 font-extrabold text-lg tabular-nums leading-none">{isPL ? won : gf}</div>
              <div className="text-[9px] uppercase tracking-wider text-gray-500">{isPL ? 'Won' : 'Scored'}</div>
            </div>
            <div className="text-center">
              <div className="text-red-400 font-extrabold text-lg tabular-nums leading-none">{isPL ? lost : ga}</div>
              <div className="text-[9px] uppercase tracking-wider text-gray-500">{isPL ? 'Lost' : 'Conceded'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 max-w-lg mx-auto w-full">
        {matches.map((m, i) => (
          <MatchRevealCard key={i} match={m} revealed={i < revealedCount} isPL={isPL} index={i} />
        ))}
      </div>

      {done && (
        <div className="sticky bottom-0 bg-gray-950/95 backdrop-blur px-4 py-4 border-t border-gray-800">
          <div className="max-w-lg mx-auto w-full">
            <button
              onClick={onDone}
              className="w-full py-3.5 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-extrabold transition-colors animate-pulse"
            >
              See Result →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
