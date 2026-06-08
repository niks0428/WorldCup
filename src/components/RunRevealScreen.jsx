import { useState, useEffect } from 'react'
import { FlagImg } from '../lib/flags'
import { calculateTeamScore } from '../utils/scoring'
import { simulateTournament } from '../utils/tournament'

function MatchRevealCard({ match, revealed }) {
  const chipCls = match.result === 'W'
    ? 'bg-green-500/20 text-green-400'
    : match.result === 'L'
      ? 'bg-red-500/20 text-red-400'
      : 'bg-yellow-400/20 text-yellow-400'
  return (
    <div className={`bg-gray-800 rounded-xl p-3 flex items-center gap-3 transition-all duration-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <div className="w-[4.5rem] shrink-0">
        <div className="text-[10px] uppercase tracking-wider text-gray-500 leading-tight">{match.stage}</div>
        {match.pens && <div className="text-[9px] text-gray-600 mt-0.5">on pens</div>}
      </div>
      <span className="w-9 h-6 rounded overflow-hidden inline-flex shrink-0 shadow">
        <FlagImg nation={match.opponent} className="w-full h-full object-cover" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-white font-bold text-sm truncate">{match.opponent}</div>
      </div>
      <div className="text-2xl font-extrabold text-white tabular-nums shrink-0">{match.gf}–{match.ga}</div>
      <span className={`text-[11px] font-extrabold rounded px-2 py-1 w-7 text-center shrink-0 ${chipCls}`}>
        {match.result}
      </span>
    </div>
  )
}

export default function RunRevealScreen({ slots, seed, onDone }) {
  const score = calculateTeamScore(slots)
  const run = simulateTournament(slots, score, seed)
  const matches = run.matches

  const [revealedCount, setRevealedCount] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (revealedCount >= matches.length) {
      const t = setTimeout(() => setDone(true), 600)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setRevealedCount(n => n + 1), 850)
    return () => clearTimeout(t)
  }, [revealedCount, matches.length])

  // Running tally only counts matches revealed so far.
  const shown = matches.slice(0, revealedCount)
  const gf = shown.reduce((a, m) => a + m.gf, 0)
  const ga = shown.reduce((a, m) => a + m.ga, 0)

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <div className="sticky top-0 bg-gray-950/95 backdrop-blur px-4 py-4 z-10 border-b border-gray-800">
        <div className="max-w-lg mx-auto w-full flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-extrabold text-white">🏆 Tournament Run</h1>
            <p className="text-gray-400 text-xs">{Math.min(revealedCount, matches.length)}/{matches.length} matches played</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-center">
              <div className="text-green-400 font-extrabold text-lg tabular-nums leading-none">{gf}</div>
              <div className="text-[9px] uppercase tracking-wider text-gray-500">Scored</div>
            </div>
            <div className="text-center">
              <div className="text-red-400 font-extrabold text-lg tabular-nums leading-none">{ga}</div>
              <div className="text-[9px] uppercase tracking-wider text-gray-500">Conceded</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 max-w-lg mx-auto w-full">
        {matches.map((m, i) => (
          <MatchRevealCard key={i} match={m} revealed={i < revealedCount} />
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
