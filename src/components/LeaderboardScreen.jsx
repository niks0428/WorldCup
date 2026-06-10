import { useState, useEffect, useMemo } from 'react'
import { fetchScores, fetchTopStreaks, isConfigured } from '../lib/supabase'
import { decodeSquad } from './ResultScreen'
import { simulateTournament } from '../utils/tournament'
import { simulateLeague, LEAGUE_TIER_META } from '../utils/league'

// Reproduce the run for a leaderboard row using the same inputs the player saw
// (squad names + seed + score), so goals match exactly. Premier League rows
// replay the 38-game season; World Cup rows replay the knockout cup.
function runForRow(s, competition) {
  try {
    let slots = []
    const hash = s.squad_url ? s.squad_url.split('#')[1] || '' : ''
    if (hash.startsWith('s=')) {
      const data = decodeSquad(hash.slice(2))
      if (Array.isArray(data?.s)) slots = data.s.map(p => ({ player: { name: p?.n } }))
    }
    return competition === 'pl'
      ? simulateLeague(slots, s.score, s.seed)
      : simulateTournament(slots, s.score, s.seed)
  } catch {
    // Never let one malformed/hostile row break the whole leaderboard render.
    return { goalsFor: 0, goalsAgainst: 0, won: 0, drawn: 0, lost: 0 }
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
const WC_TIER_EMOJI = {
  'World Cup Winners': '🏆', 'Finalists': '🥈', 'Semi-finalists': '🥉',
  'Quarter-finalists': '🎯', 'Round of 16': '🔵', 'Group Stage Exit': '⚫',
}
// How far the team got — the primary leaderboard sort (winners first).
const WC_TIER_RANK = {
  'World Cup Winners': 6, 'Finalists': 5, 'Semi-finalists': 4,
  'Quarter-finalists': 3, 'Round of 16': 2, 'Group Stage Exit': 1,
}
// Premier League tiers, keyed by the stored label (run.tierMeta.label). Built
// from LEAGUE_TIER_META (declared best→worst), so rank descends with order.
const PL_LABELS = Object.values(LEAGUE_TIER_META)
const PL_TIER_EMOJI = Object.fromEntries(PL_LABELS.map(m => [m.label, m.emoji]))
const PL_TIER_RANK = Object.fromEntries(PL_LABELS.map((m, i) => [m.label, PL_LABELS.length - i]))

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
const SORT_TABS = [
  { id: 'points',    label: 'Points',    plOnly: true },
  { id: 'placement', label: 'Placement' },
  { id: 'rating',    label: 'Rating' },
  { id: 'gd',        label: 'Goal Diff' },
  { id: 'gf',        label: 'Scored' },
  { id: 'ga',        label: 'Conceded' },
]

// The chosen sort field's raw value for a row. 'desc' = highest value first.
function primaryVal(s, sortBy, tierRank) {
  if (sortBy === 'points') return s._pts
  if (sortBy === 'wins')   return s._won
  if (sortBy === 'rating') return s.score
  if (sortBy === 'gd')     return s._gd
  if (sortBy === 'gf')     return s._gf
  if (sortBy === 'ga')     return s._ga
  return tierRank[s.tier] || 0 // placement
}

function getSavedName() { try { return localStorage.getItem('ltt_player_name') || '' } catch { return '' } }

export default function LeaderboardScreen({ onBack, challengeSeed, groupCode, competition = 'wc' }) {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  // Separate boards per competition; default to whichever you came from.
  const [comp, setComp] = useState(competition === 'pl' ? 'pl' : 'wc')
  const isPL = comp === 'pl'
  const tierEmoji = isPL ? PL_TIER_EMOJI : WC_TIER_EMOJI
  const tierRank = isPL ? PL_TIER_RANK : WC_TIER_RANK
  // Competition toggle only on the general board (challenge/group views are
  // their own scoped lists).
  const showCompToggle = !challengeSeed && !groupCode
  const [timeFilter, setTimeFilter] = useState('alltime')
  const [modeFilter, setModeFilter] = useState('all')
  const [sortBy, setSortBy] = useState(competition === 'pl' ? 'points' : 'placement')
  const [sortDir, setSortDir] = useState('desc')
  // Scores vs. challenge win-streak board. Streaks are global only — a specific
  // challenge or group view stays on its scores list.
  const [board, setBoard] = useState('scores')
  const [streaks, setStreaks] = useState([])
  const [dailyStreaks, setDailyStreaks] = useState([])
  const showStreakToggle = !challengeSeed && !groupCode
  const myName = getSavedName()

  // Reset sort to the natural default when switching competitions.
  useEffect(() => {
    setSortBy(comp === 'pl' ? 'points' : 'placement')
    setSortDir('desc')
  }, [comp])

  useEffect(() => {
    if (!isConfigured || board !== 'scores') return
    setLoading(true)
    setError(null)
    fetchScores({
      modeFilter,
      timeFilter,
      seed: challengeSeed || undefined,
      groupCode: groupCode || undefined,
      competition: comp,
      scoreOrder: sortDir === 'asc' ? 'asc' : 'desc',
    })
      .then(setScores)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [modeFilter, timeFilter, challengeSeed, groupCode, board, comp, sortDir])

  useEffect(() => {
    if (!isConfigured || board !== 'streaks') return
    setLoading(true)
    setError(null)
    Promise.all([
      fetchTopStreaks({ limit: 25, column: 'challenge_streak', competition: comp }),
      fetchTopStreaks({ limit: 25, column: 'streak', competition: comp }),
    ])
      .then(([wins, daily]) => { setStreaks(wins); setDailyStreaks(daily) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [board, comp])

  // Attach goals + win record from the simulated run, then rank by chosen field.
  const ranked = useMemo(() => {
    const list = scores
      .map(s => {
        const run = runForRow(s, comp)
        return {
          ...s,
          _gf:    run.goalsFor,
          _ga:    run.goalsAgainst,
          _gd:    run.goalsFor - run.goalsAgainst,
          _won:   run.won   ?? 0,
          _drawn: run.drawn ?? 0,
          _lost:  run.lost  ?? 0,
          _pts:   run.points ?? ((run.won ?? 0) * 3 + (run.drawn ?? 0)),
        }
      })
      // Sort by the chosen field + direction, then a stable best-first chain.
      // PL default (points): pts → score → GD → earliest.
      // Everything else: wins → placement → rating → GD → earliest.
      .sort((a, b) => {
        const diff = primaryVal(b, sortBy, tierRank) - primaryVal(a, sortBy, tierRank)
        if (diff) return sortDir === 'asc' ? -diff : diff
        if (sortBy === 'points') {
          return b.score - a.score ||
            b._gd - a._gd ||
            new Date(a.created_at) - new Date(b.created_at)
        }
        return (b._pts - a._pts) ||
          (b._won - a._won) ||
          (tierRank[b.tier] || 0) - (tierRank[a.tier] || 0) ||
          b.score - a.score ||
          b._gd - a._gd ||
          new Date(a.created_at) - new Date(b.created_at)
      })
    // Flag rows split from a same-tier, same-rating neighbour by goal difference.
    const sameBucket = (x, y) => x && y && x.tier === y.tier && x.score === y.score
    return list.map((s, i) => ({
      ...s,
      _tiebreak: sameBucket(list[i - 1], s) || sameBucket(list[i + 1], s),
    }))
  }, [scores, sortBy, sortDir, tierRank])

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm">← Back</button>
        <h1 className="text-2xl font-extrabold text-white">
          {groupCode ? '👥 Group Leaderboard'
            : challengeSeed ? '🤝 Challenge Results'
            : board === 'streaks' ? '🔥 Streaks'
            : '🏅 Leaderboard'}
        </h1>
      </div>

      {/* Competition board — World Cup vs Premier League (separate boards) */}
      {isConfigured && showCompToggle && (
        <div className="flex gap-2 mb-4">
          {[['wc', '🌍 World Cup'], ['pl', '🦁 Premier League']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setComp(id)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                comp === id
                  ? (id === 'pl' ? 'bg-sky-400 text-gray-900' : 'bg-yellow-400 text-gray-900')
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Scores vs. win-streak board */}
      {isConfigured && showStreakToggle && (
        <div className="flex gap-2 mb-4">
          {[['scores', '🏅 Scores'], ['streaks', '🔥 Streaks']].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setBoard(id)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                board === id ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

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
          {board === 'scores' && !challengeSeed && (
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
          {board === 'scores' && timeFilter !== 'daily' && !challengeSeed && (
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

          {/* Sort field + direction */}
          {board === 'scores' && (
            <>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {SORT_TABS.filter(t => !t.plOnly || isPL).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSortBy(t.id)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      sortBy === t.id ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-500 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSortDir(d => (d === 'desc' ? 'asc' : 'desc'))}
                className="w-full mb-4 py-1.5 rounded-lg text-xs font-bold bg-gray-800 text-gray-300 hover:text-white transition-colors"
              >
                {sortDir === 'desc' ? '↓ Highest to lowest' : '↑ Lowest to highest'}
              </button>
            </>
          )}

          {loading && <div className="text-center text-gray-500 py-16">Loading…</div>}
          {error && <div className="text-center text-red-400 py-16 text-sm">{error}</div>}

          {board === 'streaks' && !loading && !error && (
            <div className="space-y-8">
              <StreakTable
                title="🤝 Challenge Win Streaks"
                subtitle={`Longest run of ${isPL ? 'Premier League' : 'World Cup'} challenge wins`}
                rows={streaks}
                valueKey="challenge_streak"
                myName={myName}
                emptyMsg="No challenge wins yet — be the first!"
              />
              <StreakTable
                title="⭐ Daily Challenge Streaks"
                subtitle="Most days played in a row"
                rows={dailyStreaks}
                valueKey="streak"
                myName={myName}
                emptyMsg="No daily streaks yet — play today's challenge!"
              />
            </div>
          )}

          {board === 'scores' && !loading && !error && scores.length === 0 && (
            <div className="text-center text-gray-500 py-16">
              {timeFilter === 'daily' ? "No daily scores yet — play today's challenge!" : 'No scores yet — be the first!'}
            </div>
          )}

          {board === 'scores' && !loading && !error && ranked.length > 0 && (
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
                      {tierEmoji[s.tier] || ''} {s.tier} · {s.formation} · {MODE_LABEL[s.mode] || s.mode}
                    </div>
                    {isPL && (
                      <div className="text-[11px] mt-0.5 tabular-nums">
                        <span className="text-green-400 font-semibold">{s._won}W</span>
                        <span className="text-gray-600"> · </span>
                        <span className="text-gray-300 font-semibold">{s._drawn}D</span>
                        <span className="text-gray-600"> · </span>
                        <span className="text-red-400 font-semibold">{s._lost}L</span>
                        <span className="text-gray-600"> · GD </span>
                        <span className={`font-semibold ${s._tiebreak ? 'text-yellow-400' : 'text-gray-300'}`}>
                          {s._gd >= 0 ? '+' : ''}{s._gd}
                        </span>
                      </div>
                    )}
                    {!isPL && (
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
                    )}
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

// One streak ranking table (challenge wins or daily streak). `valueKey` is the
// row field holding the count; the player's own row is highlighted.
function StreakTable({ title, subtitle, rows, valueKey, myName, emptyMsg }) {
  return (
    <div>
      <h2 className="text-sm font-bold text-white mb-0.5">{title}</h2>
      <p className="text-gray-500 text-xs mb-3">{subtitle}</p>
      {rows.length === 0 ? (
        <div className="text-center text-gray-500 py-8 text-sm">{emptyMsg}</div>
      ) : (
        <div className="space-y-2">
          {rows.map((s, i) => {
            const isMe = myName && s.player_name === myName
            return (
              <div
                key={`${s.player_name}-${i}`}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                  isMe ? 'bg-orange-400/10 border border-orange-400/40' :
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
                  <div className="text-white font-bold text-sm truncate">
                    {s.player_name}{isMe && <span className="text-orange-400 text-xs font-normal"> (you)</span>}
                  </div>
                </div>
                <div className="text-orange-400 font-extrabold text-lg shrink-0">{s[valueKey]} 🔥</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
