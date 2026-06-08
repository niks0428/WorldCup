import { useState, useEffect } from 'react'
import { fetchTopStreaks, isConfigured } from '../lib/supabase'
import { getChallengeStreak, getLastChallengeSeed } from '../lib/challengeStreak'

const NAME_KEY = 'ltt_player_name'
function getSavedName() { try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' } }

export default function ChallengesScreen({ onBack, onViewResults }) {
  const [local] = useState(() => getChallengeStreak())
  const [lastSeed] = useState(() => getLastChallengeSeed())
  const [streaks, setStreaks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const myName = getSavedName()

  useEffect(() => {
    if (!isConfigured) { setLoading(false); return }
    setLoading(true); setError(null)
    fetchTopStreaks({ limit: 20 })
      .then(setStreaks)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 px-4 py-8 max-w-lg mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm">← Back</button>
        <h1 className="text-2xl font-extrabold text-white">🤝 Challenges</h1>
      </div>

      <p className="text-gray-400 text-sm mb-6">
        Beat the score on a mate's challenge link to extend your win streak. Lose one and it resets — your best ever stays.
      </p>

      {/* Your streak */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-800 rounded-2xl p-5 text-center">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Current streak</div>
          <div className="text-orange-400 font-extrabold text-3xl">{local.streak} 🔥</div>
        </div>
        <div className="bg-gray-800 rounded-2xl p-5 text-center">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-1">Best ever</div>
          <div className="text-yellow-400 font-extrabold text-3xl">{local.best}</div>
        </div>
      </div>

      {lastSeed && (
        <button
          onClick={() => onViewResults(lastSeed)}
          className="w-full mb-6 py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm transition-colors"
        >
          🏅 View last challenge results →
        </button>
      )}

      {/* Global streak leaderboard */}
      <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-500 mb-3">🏆 Top Win Streaks</h2>

      {!isConfigured && (
        <div className="text-center text-gray-500 py-12">Leaderboard not configured.</div>
      )}
      {isConfigured && loading && <div className="text-center text-gray-500 py-12">Loading…</div>}
      {isConfigured && error && <div className="text-center text-red-400 py-12 text-sm">{error}</div>}
      {isConfigured && !loading && !error && streaks.length === 0 && (
        <div className="text-center text-gray-500 py-12">No challenge wins yet — be the first!</div>
      )}

      {isConfigured && !loading && !error && streaks.length > 0 && (
        <div className="space-y-2">
          {streaks.map((s, i) => {
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
                <div className="text-orange-400 font-extrabold text-lg shrink-0">{s.challenge_streak} 🔥</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
