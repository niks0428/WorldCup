import { useState, useEffect } from 'react'
import { fetchScores, isConfigured } from '../lib/supabase'

const MODE_LABEL = { classic: 'Classic', expert: 'Expert', hardcore: '💀 Hardcore' }
const TIER_EMOJI = {
  'World Cup Winners': '🏆', 'Finalists': '🥈', 'Semi-finalists': '🥉',
  'Quarter-finalists': '🎯', 'Round of 16': '🔵', 'Group Stage Exit': '⚫',
}

export default function LeaderboardScreen({ onBack }) {
  const [scores, setScores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return }
    fetchScores()
      .then(setScores)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all'
    ? scores
    : scores.filter(s => s.mode === filter)

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm">← Back</button>
        <h1 className="text-2xl font-extrabold text-white">🏆 Leaderboard</h1>
      </div>

      {!isConfigured && (
        <div className="bg-gray-800 rounded-2xl p-6 text-center space-y-3">
          <div className="text-4xl">⚙️</div>
          <div className="text-white font-bold">Leaderboard not set up yet</div>
          <div className="text-gray-400 text-sm leading-relaxed">
            Create a free Supabase project, run the setup SQL, then paste your project URL and anon key into{' '}
            <code className="text-yellow-400">src/lib/supabase.js</code>.
          </div>
        </div>
      )}

      {isConfigured && (
        <>
          {/* Filter tabs */}
          <div className="flex gap-2 mb-4">
            {[['all', 'All'], ['classic', 'Classic'], ['expert', 'Expert'], ['hardcore', '💀']].map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  filter === val
                    ? 'bg-yellow-400 text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {loading && (
            <div className="text-center text-gray-500 py-12">Loading…</div>
          )}
          {error && (
            <div className="text-center text-red-400 py-12 text-sm">{error}</div>
          )}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-center text-gray-500 py-12">No scores yet — be the first!</div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div className="space-y-2">
              {filtered.map((s, i) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                    i === 0 ? 'bg-yellow-400/10 border border-yellow-400/30' :
                    i === 1 ? 'bg-gray-400/5 border border-gray-400/20' :
                    i === 2 ? 'bg-orange-400/5 border border-orange-400/20' :
                    'bg-gray-800'
                  }`}
                >
                  <span className="text-lg w-7 text-center shrink-0">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-gray-500 text-sm font-bold">{i + 1}</span>}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-bold text-sm truncate">{s.player_name}</div>
                    <div className="text-gray-400 text-xs">
                      {TIER_EMOJI[s.tier] || ''} {s.tier} · {s.formation} · {MODE_LABEL[s.mode] || s.mode}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-yellow-400 font-extrabold text-lg">{s.score}</div>
                    {s.squad_url && (
                      <a
                        href={s.squad_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-500 hover:text-gray-300 text-[10px] transition-colors"
                      >
                        View squad →
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
