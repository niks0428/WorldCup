import { useState, useEffect, useMemo } from 'react'
import { fetchScores, isConfigured } from '../lib/supabase'
import { decodeSquad } from './ResultScreen'
import { simulateTournament } from '../utils/tournament'

// Reproduce the tournament run for a leaderboard row using the same inputs the
// player saw (squad names + seed + score + tier), so goals match exactly.
function runForRow(s) {
  try {
    let slots = []
    const hash = s.squad_url ? s.squad_url.split('#')[1] || '' : ''
    if (hash.startsWith('s=')) {
      const data = decodeSquad(hash.slice(2))
      if (Array.isArray(data?.s)) slots = data.s.map(p => ({ player: { name: p?.n } }))
    }
    return simulateTournament(slots, s.score, s.seed)
  } catch {
    // Never let one malformed/hostile row break the whole leaderboard render.
    return { goalsFor: 0, goalsAgainst: 0 }
  }
}

// Only allow http(s) links from leaderboard rows. squad_url comes from a public,
// unauthenticated Supabase insert, so a malicious row could carry a
// `javascript:` (or `data:`) URL — rendering that in an href would be stored XSS.
function safeHttpUrl(url) {
  if (typeof url !== 'string') return null
  try {
    const u = new URL(url, window.location.origin)
    return (u.protocol === 'http:' || u.protocol === 'https:') ? u.href : null
  } catch {
    return null
  }
}

const MODE_LABEL = { classic: 'Classic', expert: 'Expert', hardcore: '💀', daily: '⭐ Daily' }
const TIER_EMOJI = {
  'World Cup Winners': '🏆', 'Finalists': '🥈', 'Semi-finalists': '🥉',
  'Quarter-finalists': '🎯', 'Round of 16': '🔵', 'Group Stage Exit': '⚫',
}

const TIME_TABS = [
  { id: 'alltime', label: 'All Time' },
  { id: 'week',    label: 'This Week' },
  { id: 'daily',   label: '⭐ Today' },
]
const MODE_TABS = [
  { id: 'all',      label: 'All' },
  { id: 'classic',  label: 'Classic' },
  { id: 'expert',   label: 'Expert' },
  { id: 'hardcore', label: '💀' },
]

export default function LeaderboardScreen({ onBack, challengeSeed, groupCode }) {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [timeFilter, setTimeFilter] = useState('alltime')
  const [modeFilter, setModeFilter] = useState('all')

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return }
    setLoading(true)
    setError(null)
    fetchScores({
      modeFilter,
      timeFilter,
      seed: challengeSeed || undefined,
      groupCode: groupCode || undefined,
    })
      .then(setScores)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [modeFilter, timeFilter, challengeSeed, groupCode])

  // Attach goals from the simulated run, then rank by score → goal difference.
  const ranked = useMemo(() => {
    const list = scores
      .map(s => {
        const run = runForRow(s)
        return { ...s, _gf: run.goalsFor, _ga: run.goalsAgainst, _gd: run.goalsFor - run.goalsAgainst }
      })
      .sort((a, b) =>
        b.score - a.score ||
        b._gd - a._gd ||
        new Date(a.created_at) - new Date(b.created_at)
      )
    // Flag rows whose rank vs. an equal-score neighbour was decided by GD.
    return list.map((s, i) => ({
      ...s,
      _tiebreak: (list[i - 1] && list[i - 1].score === s.score) ||
                 (list[i + 1] && list[i + 1].score === s.score),
    }))
  }, [scores])

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm">← Back</button>
        <h1 className="text-2xl font-extrabold text-white">
          {groupCode ? '👥 Group Leaderboard' : challengeSeed ? '🤝 Challenge Results' : '🏅 Leaderboard'}
        </h1>
      </div>

      {!isConfigured && (
        <div className="bg-gray-800 rounded-2xl p-6 text-center space-y-3">
          <div className="text-4xl">⚙️</div>
          <div className="text-white font-bold">Leaderboard not configured</div>
          <div className="text-gray-400 text-sm">Add your Supabase URL and anon key to <code className="text-yellow-400">src/lib/supabase.js</code>.</div>
        </div>
      )}

      {isConfigured && (
        <>
          {/* Time filter */}
          {!challengeSeed && (
            <div className="flex gap-2 mb-3">
              {TIME_TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTimeFilter(t.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    timeFilter === t.id ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Mode filter — hide for daily (only one mode) */}
          {timeFilter !== 'daily' && !challengeSeed && (
            <div className="flex gap-2 mb-4">
              {MODE_TABS.map(m => (
                <button
                  key={m.id}
                  onClick={() => setModeFilter(m.id)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    modeFilter === m.id ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-500 hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {loading && <div className="text-center text-gray-500 py-16">Loading…</div>}
          {error && <div className="text-center text-red-400 py-16 text-sm">{error}</div>}
          {!loading && !error && scores.length === 0 && (
            <div className="text-center text-gray-500 py-16">
              {timeFilter === 'daily' ? "No daily scores yet — play today's challenge!" : 'No scores yet — be the first!'}
            </div>
          )}

          {!loading && !error && ranked.length > 0 && (
            <div className="space-y-2">
              {ranked.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                    i === 0 ? 'bg-yellow-400/10 border border-yellow-400/30' :
                    i === 1 ? 'bg-gray-400/5 border border-gray-400/15' :
                    i === 2 ? 'bg-orange-400/5 border border-orange-400/15' :
                    'bg-gray-800'
                  }`}
                >
                  <span className="text-lg w-7 text-center shrink-0">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (
                      <span className="text-gray-500 text-sm font-bold">{i + 1}</span>
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-sm truncate">{s.player_name}</div>
                    <div className="text-gray-400 text-xs truncate">
                      {TIER_EMOJI[s.tier] || ''} {s.tier} · {s.formation} · {MODE_LABEL[s.mode] || s.mode}
                    </div>
                    <div className="text-[11px] mt-0.5 tabular-nums flex items-center gap-1.5">
                      <span>
                        <span className="text-green-400 font-semibold">{s._gf}</span>
                        <span className="text-gray-600"> scored · </span>
                        <span className="text-red-400 font-semibold">{s._ga}</span>
                        <span className="text-gray-600"> conceded · GD </span>
                        <span className={`font-semibold ${s._tiebreak ? 'text-yellow-400' : 'text-gray-300'}`}>
                          {s._gd >= 0 ? '+' : ''}{s._gd}
                        </span>
                      </span>
                      {s._tiebreak && (
                        <span
                          className="text-[9px] font-bold text-yellow-400/90 bg-yellow-400/10 border border-yellow-400/25 rounded px-1 py-px shrink-0"
                          title="Tied on score — ranked by goal difference"
                        >
                          ⚖️ GD
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-yellow-400 font-extrabold text-lg">{s.score}</div>
                    {safeHttpUrl(s.squad_url) && (
                      <a href={safeHttpUrl(s.squad_url)} target="_blank" rel="noopener noreferrer"
                        className="text-gray-500 hover:text-gray-300 text-[10px] transition-colors">
                        View →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
