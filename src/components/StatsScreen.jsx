import { getHistory } from '../lib/history'
import { getUnlockedAchievements, ALL_ACHIEVEMENTS } from '../lib/achievements'

const TIER_RANK = {
  'World Cup Winners': 7, 'Invincibles': 7, 'Centurions': 6, 'Champions': 5,
  'Finalists': 5, 'Title Race': 4, 'Semi-finalists': 4, 'Champions League': 4,
  'Quarter-finalists': 3, 'Round of 16': 2, 'Group Stage Exit': 1,
}

export default function StatsScreen({ onBack }) {
  const history = getHistory()
  const unlocked = getUnlockedAchievements()

  if (history.length === 0) {
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-10 max-w-lg mx-auto">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 block transition-colors">← Back</button>
        <h1 className="text-2xl font-extrabold text-white mb-8">📊 My Stats</h1>
        <div className="text-center text-gray-500 py-16">No games yet — play your first game!</div>
      </div>
    )
  }

  const scores = history.map(e => e.score)
  const best = Math.max(...scores)
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)

  const bestEntry = history.reduce((a, b) => (TIER_RANK[b.tier] ?? 0) > (TIER_RANK[a.tier] ?? 0) ? b : a, history[0])

  const formationCounts = {}
  history.forEach(e => { formationCounts[e.formation] = (formationCounts[e.formation] || 0) + 1 })
  const topFormation = Object.entries(formationCounts).sort((a, b) => b[1] - a[1])[0]

  const modeCounts = {}
  history.forEach(e => {
    const m = e.mode === 'daily' ? 'daily' : e.mode
    modeCounts[m] = (modeCounts[m] || 0) + 1
  })

  const nationCounts = {}
  history.forEach(e => {
    ;(e.players || []).forEach(p => {
      if (p.player?.nation) nationCounts[p.player.nation] = (nationCounts[p.player.nation] || 0) + 1
    })
  })
  const topNations = Object.entries(nationCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)

  const SCORE_BANDS = [
    { min: 90, label: '90+', cls: 'bg-yellow-400' },
    { min: 82, label: '82–89', cls: 'bg-green-400' },
    { min: 74, label: '74–81', cls: 'bg-sky-400' },
    { min: 0,  label: 'Below 74', cls: 'bg-gray-600' },
  ]
  const bandCounts = SCORE_BANDS.map(b => ({
    ...b,
    count: scores.filter(s => s >= b.min && (b.max == null || s < b.max)).length,
  }))
  SCORE_BANDS.forEach((b, i) => {
    bandCounts[i].max = SCORE_BANDS[i - 1]?.min ?? 100
    bandCounts[i].count = scores.filter(s => s >= b.min && s < (SCORE_BANDS[i - 1]?.min ?? 100)).length
  })

  const MODE_LABEL = { classic: 'Classic', expert: 'Expert', hardcore: '💀 Hardcore', daily: '⭐ Daily' }
  const TIER_EMOJI = {
    'World Cup Winners': '🏆', 'Invincibles': '🏆', 'Centurions': '🌟', 'Champions': '🥇',
    'Finalists': '🥈', 'Title Race': '🥈', 'Semi-finalists': '🥉', 'Champions League': '🥉',
    'Quarter-finalists': '🎯', 'Round of 16': '🔵', 'Group Stage Exit': '⚫',
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 max-w-lg mx-auto">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 block transition-colors">← Back</button>
      <h1 className="text-2xl font-extrabold text-white mb-6">📊 My Stats</h1>

      {/* Top numbers */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatTile label="Games" value={history.length} />
        <StatTile label="Best OVR" value={best} accent="text-yellow-400" />
        <StatTile label="Avg OVR" value={avg} />
      </div>

      {/* Best result */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Best Result</p>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{TIER_EMOJI[bestEntry.tier] || '⚽'}</span>
          <div className="flex-1 min-w-0">
            <div className="text-white font-bold">{bestEntry.tier}</div>
            <div className="text-gray-400 text-xs">{bestEntry.formation} · {MODE_LABEL[bestEntry.mode] || bestEntry.mode}</div>
          </div>
          <div className="text-yellow-400 font-extrabold text-2xl">{bestEntry.score}</div>
        </div>
      </div>

      {/* Score distribution */}
      <div className="bg-gray-800 rounded-2xl p-4 mb-4">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Score Distribution</p>
        <div className="space-y-2">
          {bandCounts.map(b => (
            <div key={b.label} className="flex items-center gap-2">
              <span className="text-xs text-gray-400 w-16 shrink-0">{b.label}</span>
              <div className="flex-1 h-4 bg-gray-700 rounded-full overflow-hidden">
                {b.count > 0 && (
                  <div
                    className={`h-full rounded-full ${b.cls}`}
                    style={{ width: `${(b.count / history.length) * 100}%` }}
                  />
                )}
              </div>
              <span className="text-xs text-gray-400 w-6 text-right tabular-nums shrink-0">{b.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mode breakdown */}
      {Object.keys(modeCounts).length > 0 && (
        <div className="bg-gray-800 rounded-2xl p-4 mb-4">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Modes Played</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(modeCounts).sort((a, b) => b[1] - a[1]).map(([mode, count]) => (
              <div key={mode} className="bg-gray-700 rounded-lg px-3 py-1.5 flex items-center gap-1.5">
                <span className="text-white font-bold text-sm">{MODE_LABEL[mode] || mode}</span>
                <span className="text-gray-400 text-xs">{count}×</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top formation */}
      {topFormation && (
        <div className="bg-gray-800 rounded-2xl p-4 mb-4">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-1">Favourite Formation</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-white font-extrabold text-2xl font-mono">{topFormation[0]}</span>
            <span className="text-gray-400 text-sm">{topFormation[1]} game{topFormation[1] !== 1 ? 's' : ''}</span>
          </div>
          {Object.entries(formationCounts).length > 1 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {Object.entries(formationCounts).sort((a, b) => b[1] - a[1]).slice(1, 5).map(([f, c]) => (
                <span key={f} className="text-xs text-gray-500 font-mono bg-gray-700 px-1.5 py-0.5 rounded">{f} ×{c}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Top nations */}
      {topNations.length > 0 && (
        <div className="bg-gray-800 rounded-2xl p-4 mb-4">
          <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Most Drafted Nations</p>
          <div className="space-y-2">
            {topNations.map(([nation, count], i) => (
              <div key={nation} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-4 tabular-nums">{i + 1}</span>
                <span className="flex-1 text-sm text-white font-medium truncate">{nation}</span>
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${(count / topNations[0][1]) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-6 text-right tabular-nums shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements summary */}
      <div className="bg-gray-800 rounded-2xl p-4">
        <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Achievements</p>
        <div className="flex items-center justify-between">
          <span className="text-white font-extrabold text-2xl">{unlocked.length}</span>
          <span className="text-gray-500 text-sm">/ {ALL_ACHIEVEMENTS.length} unlocked</span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden mt-2">
          <div
            className="h-full bg-yellow-400 rounded-full transition-all"
            style={{ width: `${(unlocked.length / ALL_ACHIEVEMENTS.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}

function StatTile({ label, value, accent = 'text-white' }) {
  return (
    <div className="bg-gray-800 rounded-2xl p-3 text-center">
      <div className={`font-extrabold text-2xl ${accent}`}>{value}</div>
      <div className="text-gray-500 text-xs mt-0.5 uppercase tracking-wider">{label}</div>
    </div>
  )
}
