import { useState, useEffect, useRef } from 'react'
import { getH2HSession, submitScore, isConfigured } from '../lib/supabase'
import { recordChallengeResult, setLastChallengeSeed } from '../lib/challengeStreak'

const NAME_KEY = 'ltt_player_name'
function getSavedName() { try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' } }

const STREAK_FLAG = seed => `ltt_h2h_streak_${seed}`

function getLocalData(seed) {
  try { return JSON.parse(localStorage.getItem(`ltt_h2h_${seed}`)) } catch { return null }
}

export default function H2HResultScreen({ seed, competition, onRestart }) {
  const [session, setSession] = useState(null)
  const [status, setStatus] = useState('loading')
  const streakRef = useRef(false)
  const myData = getLocalData(seed)

  useEffect(() => { load() }, [])

  async function load() {
    setStatus('loading')
    const s = await getH2HSession(seed)
    setSession(s)
    setStatus(s?.p2_score != null ? 'complete' : 'waiting')
  }

  // Record streak and submit to global leaderboard once when result is first seen.
  useEffect(() => {
    if (status !== 'complete' || !session || !myData || streakRef.current) return
    const alreadyRecorded = localStorage.getItem(STREAK_FLAG(seed))
    if (alreadyRecorded) return
    streakRef.current = true
    const opponentScore = myData.role === 'p1' ? session.p2_score : session.p1_score
    if (opponentScore == null) return
    const newStreak = recordChallengeResult(myData.score > opponentScore, competition)
    try { localStorage.setItem(STREAK_FLAG(seed), '1') } catch {}
    setLastChallengeSeed(seed)
    const playerName = getSavedName()
    if (isConfigured && playerName) {
      submitScore({
        playerName, score: myData.score, tier: myData.tier,
        formation: session.formation, mode: 'classic',
        squadUrl: myData.squadUrl, seed, competition,
        challengeStreak: newStreak.streak,
      }).catch(() => {})
    }
  }, [status, session])

  if (!myData) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="text-gray-400">No H2H data found. Have you played this challenge?</div>
          <button onClick={onRestart} className="py-2 px-6 rounded-xl bg-yellow-400 text-gray-900 font-bold">Home</button>
        </div>
      </div>
    )
  }

  const p1 = session ? { name: session.p1_name, score: session.p1_score, tier: session.p1_tier, squad: session.p1_squad_url } : null
  const p2 = session ? { name: session.p2_name, score: session.p2_score, tier: session.p2_tier, squad: session.p2_squad_url } : null
  const me   = myData.role === 'p1' ? p1 : p2
  const them = myData.role === 'p1' ? p2 : p1
  const won = me && them && me.score != null && them.score != null && me.score > them.score

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <h1 className="text-xl font-extrabold text-center text-white">⚔️ Head-to-Head</h1>

        {status === 'loading' && (
          <div className="text-center text-gray-400">Loading...</div>
        )}

        {status === 'waiting' && (
          <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-6 text-center space-y-3">
            <div className="text-4xl">⏳</div>
            <div className="text-yellow-300 font-extrabold">Waiting for opponent</div>
            <div className="text-gray-400 text-sm">
              Your score: <span className="text-yellow-400 font-bold">{myData.score}</span>
              <span className="text-gray-600"> · {myData.tier}</span>
            </div>
            <button
              onClick={load}
              className="text-sm text-yellow-400 border border-yellow-400/40 rounded-lg px-4 py-2 hover:bg-yellow-400/10 transition-colors"
            >
              ↻ Check again
            </button>
          </div>
        )}

        {status === 'complete' && me && them && (
          <>
            <div className={`rounded-2xl p-5 text-center border ${
              won ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="text-4xl mb-2">{won ? '🏆' : '😞'}</div>
              <div className={`text-xl font-extrabold ${won ? 'text-green-400' : 'text-red-400'}`}>
                {won ? 'You win!' : 'You lose.'}
              </div>
              <div className="text-gray-400 text-sm mt-1">
                {me.score} vs {them.score}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'You', data: me },
                { label: them.name || 'Opponent', data: them },
              ].map(({ label, data }) => (
                <div key={label} className="rounded-xl bg-gray-800 p-4 text-center space-y-1">
                  <div className="text-xs text-gray-400">{label}</div>
                  <div className="text-2xl font-extrabold text-white">{data.score}</div>
                  <div className="text-xs text-gray-500">{data.tier}</div>
                  {data.squad && (
                    <a
                      href={data.squad}
                      className="block mt-1 text-xs text-yellow-400 underline underline-offset-2"
                    >
                      View squad →
                    </a>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={onRestart}
          className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-bold transition-colors"
        >
          Play Again
        </button>
      </div>
    </div>
  )
}
