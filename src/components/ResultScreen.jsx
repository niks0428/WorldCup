import { calculateTeamScore, getTier } from '../utils/scoring'
import PitchView from './PitchView'
import { useState, useEffect } from 'react'
import { submitScore, isConfigured } from '../lib/supabase'
import confetti from 'canvas-confetti'

function b64Encode(str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p) => String.fromCharCode(parseInt(p, 16))))
}
function b64Decode(str) {
  return decodeURIComponent(atob(str).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
}

export function encodeSquad(slots, formation, mode) {
  const data = {
    f: formation, m: mode || 'classic',
    s: slots.filter(s => s.player).map(s => ({
      i: s.id, n: s.player.name, na: s.player.nation,
      y: s.player.year, t: s.player.tournament,
    })),
  }
  return b64Encode(JSON.stringify(data))
}

export function decodeSquad(encoded) {
  try { return JSON.parse(b64Decode(encoded)) } catch { return null }
}

function buildSquadUrl(slots, formation, mode) {
  return `${window.location.href.split('#')[0]}#s=${encodeSquad(slots, formation, mode)}`
}

function buildChallengeUrl(formation, seed) {
  return `${window.location.href.split('#')[0]}#c=${formation}|${seed}`
}

function fireConfetti(score) {
  if (score >= 90) {
    confetti({ particleCount: 180, spread: 100, origin: { y: 0.55 }, colors: ['#FFD700', '#FFA500', '#fff'] })
    setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { x: 0.1, y: 0.6 }, colors: ['#FFD700', '#FFA500'] }), 300)
    setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { x: 0.9, y: 0.6 }, colors: ['#FFD700', '#FFA500'] }), 500)
  } else if (score >= 82) {
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#C0C0C0', '#A9A9A9', '#fff'] })
  } else if (score >= 74) {
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 }, colors: ['#CD7F32', '#B8860B', '#fff'] })
  }
}

export default function ResultScreen({ slots, formation, mode, seed, onRestart, onLeaderboard }) {
  const score = calculateTeamScore(slots)
  const tier = getTier(score)
  const [copyState, setCopyState] = useState('idle')
  const [name, setName] = useState('')
  const [submitState, setSubmitState] = useState('idle')
  const [challengeCopied, setChallengeCopied] = useState(false)
  const isDaily = mode === 'daily'

  useEffect(() => {
    const t = setTimeout(() => fireConfetti(score), 400)
    return () => clearTimeout(t)
  }, [])

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed || submitState !== 'idle') return
    setSubmitState('submitting')
    try {
      const squadUrl = buildSquadUrl(slots, formation, mode)
      const today = new Date().toISOString().split('T')[0]
      await submitScore({
        playerName: trimmed, score, tier: tier.label,
        formation, mode: mode || 'classic', squadUrl,
        seed: seed || null,
        challengeDate: isDaily ? today : null,
      })
      setSubmitState('done')
    } catch {
      setSubmitState('error')
      setTimeout(() => setSubmitState('idle'), 3000)
    }
  }

  function handleShareText() {
    const url = buildSquadUrl(slots, formation, mode)
    const text = `I built a World Cup XI that reached the ${tier.label}. ${tier.emoji} Lift the Trophy — ${url}`
    navigator.clipboard.writeText(text).then(() => {
      setCopyState('text'); setTimeout(() => setCopyState('idle'), 2500)
    })
  }

  function handleShareLink() {
    navigator.clipboard.writeText(buildSquadUrl(slots, formation, mode)).then(() => {
      setCopyState('link'); setTimeout(() => setCopyState('idle'), 2500)
    })
  }

  function handleChallenge() {
    const url = buildChallengeUrl(formation, seed)
    navigator.clipboard.writeText(url).then(() => {
      setChallengeCopied(true); setTimeout(() => setChallengeCopied(false), 2500)
    })
  }

  const starters = slots.filter(s => s.player)
  const avgOverall = starters.length
    ? Math.round(starters.reduce((a, s) => a + s.player.overall, 0) / starters.length) : 0

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <div className="lg:w-80 xl:w-96 bg-gray-900 flex flex-col p-6 gap-6 justify-between">
        <div>
          <div className="flex items-center gap-2 mb-6">
            <h1 className="text-xl font-extrabold text-white">🏆 Lift the Trophy</h1>
            {isDaily && (
              <span className="text-[10px] bg-yellow-400 text-gray-900 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">Daily</span>
            )}
          </div>

          <div className="text-center bg-gray-800 rounded-2xl p-6 mb-6">
            <div className="text-6xl mb-3">{tier.emoji}</div>
            <div className="text-2xl font-extrabold text-white mb-1">{tier.label}</div>
            <div className="text-gray-400 text-sm">
              Team Score: <span className="text-yellow-400 font-bold text-lg">{score}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard label="Avg Rating" value={avgOverall} />
            <StatCard label="Formation" value={formation} />
          </div>

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Your XI</p>
            {slots.map(slot => slot.player && (
              <div key={slot.id} className="flex items-center gap-3 bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500 w-8">{slot.position}</span>
                <span className="text-sm text-white flex-1 truncate">{slot.player.name}</span>
                <span className="text-yellow-400 font-bold text-sm">{slot.player.overall}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {/* Submit to leaderboard */}
          {isConfigured && submitState !== 'done' && (
            <div className="bg-gray-800 rounded-xl p-3 space-y-2">
              <p className="text-xs uppercase tracking-widest text-gray-500">
                {isDaily ? '⭐ Submit daily score' : 'Submit to leaderboard'}
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your name"
                  maxLength={20}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!name.trim() || submitState === 'submitting'}
                  className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-bold text-sm transition-colors shrink-0"
                >
                  {submitState === 'submitting' ? '…' : submitState === 'error' ? 'Retry' : 'Submit'}
                </button>
              </div>
              {submitState === 'error' && <p className="text-red-400 text-xs">Failed — check your connection.</p>}
            </div>
          )}

          {isConfigured && submitState === 'done' && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
              <div className="text-green-400 font-bold text-sm">✓ Score submitted!</div>
              <button onClick={onLeaderboard} className="text-xs text-green-400/70 hover:text-green-400 mt-1 transition-colors">
                View leaderboard →
              </button>
            </div>
          )}

          {/* Share */}
          <button onClick={handleShareText} className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold transition-colors">
            {copyState === 'text' ? '✓ Copied!' : '📋 Share Result'}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleShareLink} className="py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm transition-colors">
              {copyState === 'link' ? '✓ Copied!' : '🔗 Squad Link'}
            </button>
            {seed && (
              <button onClick={handleChallenge} className="py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm transition-colors">
                {challengeCopied ? '✓ Copied!' : '🤝 Challenge'}
              </button>
            )}
            {!seed && isConfigured && (
              <button onClick={onLeaderboard} className="py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm transition-colors">
                🏅 Leaderboard
              </button>
            )}
          </div>

          {seed && isConfigured && (
            <button onClick={onLeaderboard} className="w-full py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm transition-colors">
              🏅 Leaderboard
            </button>
          )}

          <button onClick={onRestart} className="w-full py-3 rounded-xl border-2 border-gray-700 hover:border-gray-500 text-gray-300 font-bold transition-colors">
            Play Again
          </button>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 bg-gray-950">
        <PitchView slots={slots} />
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="bg-gray-800 rounded-xl p-3 text-center">
      <div className="text-xs text-gray-500 mb-1 uppercase tracking-widest">{label}</div>
      <div className="text-white font-bold text-lg">{value}</div>
    </div>
  )
}
