import { calculateTeamScore, getTier, calculateGroupScores } from '../utils/scoring'
import { simulateTournament } from '../utils/tournament'
import { getAchievements } from '../lib/achievements'
import PitchView from './PitchView'
import { useState, useEffect } from 'react'
import { submitScore, isConfigured } from '../lib/supabase'
import confetti from 'canvas-confetti'
import { FlagImg } from '../lib/flags'
import { playResult } from '../lib/sound'
import { buildShareImage } from '../lib/shareImage'
import { validateName } from '../lib/nameFilter'

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

const NAME_KEY = 'ltt_player_name'
function getSavedName() { try { return localStorage.getItem(NAME_KEY) || '' } catch { return '' } }
function saveName(n) { try { localStorage.setItem(NAME_KEY, n) } catch {} }

export default function ResultScreen({ slots, formation, mode, seed, config, streak, groupCode, onRestart, onLeaderboard }) {
  const score = calculateTeamScore(slots)
  const tier = getTier(score)
  const groups = calculateGroupScores(slots)
  const run = simulateTournament(slots, score, tier, seed)
  const achievements = getAchievements(slots, config || { mode })
  const [copyState, setCopyState] = useState('idle')
  const [name, setName] = useState(getSavedName)
  const [submitState, setSubmitState] = useState('idle')
  const [autoSubmitted, setAutoSubmitted] = useState(false)
  const [challengeCopied, setChallengeCopied] = useState(false)
  const [imgState, setImgState] = useState('idle')
  const [nameError, setNameError] = useState('')
  const isDaily = mode === 'daily'
  const inGroup = Boolean(groupCode)

  async function doSubmit(playerName) {
    const squadUrl = buildSquadUrl(slots, formation, mode)
    const today = new Date().toISOString().split('T')[0]
    await submitScore({
      playerName, score, tier: tier.label,
      formation, mode: mode || 'classic', squadUrl,
      seed: seed || null,
      challengeDate: isDaily ? today : null,
      groupCode: groupCode || null,
      streak: streak || null,
    })
  }

  useEffect(() => {
    const t = setTimeout(() => { fireConfetti(score); playResult(score) }, 400)
    return () => clearTimeout(t)
  }, [])

  // Auto-submit to global (+ group) whenever a saved name exists
  useEffect(() => {
    if (!isConfigured || autoSubmitted) return
    const savedName = getSavedName()
    if (!savedName) return // first time — wait for manual entry
    setSubmitState('submitting')
    doSubmit(savedName)
      .then(() => { setSubmitState('done'); setAutoSubmitted(true) })
      .catch(() => setSubmitState('idle'))
  }, [])

  async function handleSubmit() {
    const trimmed = name.trim()
    if (!trimmed || submitState !== 'idle') return
    const check = validateName(trimmed)
    if (!check.ok) {
      setNameError(check.reason)
      return
    }
    setNameError('')
    saveName(trimmed)
    setSubmitState('submitting')
    try {
      await doSubmit(trimmed)
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

  async function handleShareImage() {
    setImgState('working')
    try {
      const blob = await buildShareImage({ slots, formation, mode, score, tier, groups, run })
      const file = new File([blob], 'lift-the-trophy.png', { type: 'image/png' })
      // Prefer native share sheet (mobile), else download
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Lift the Trophy',
          text: `${tier.emoji} ${tier.label} — score ${score}`,
        })
        setImgState('idle')
      } else {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = 'lift-the-trophy.png'
        a.click()
        URL.revokeObjectURL(a.href)
        setImgState('done')
        setTimeout(() => setImgState('idle'), 2500)
      }
    } catch {
      setImgState('idle')
    }
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

          {/* Group breakdown */}
          <div className="bg-gray-800 rounded-2xl p-4 mb-6">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Team Breakdown</p>
            <div className="space-y-2">
              {[
                { key: 'GK',  label: 'Goalkeeper' },
                { key: 'DEF', label: 'Defence' },
                { key: 'MID', label: 'Midfield' },
                { key: 'ATT', label: 'Attack' },
              ].map(({ key, label }) => {
                const val = groups[key]
                const textCls = val > 80 ? 'text-green-400' : val <= 50 ? 'text-red-500' : 'text-yellow-400'
                const barCls  = val > 80 ? 'bg-green-400'  : val <= 50 ? 'bg-red-500'  : 'bg-yellow-400'
                return (
                  <div key={key} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-20 shrink-0">{label}</span>
                    <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                      {val != null && (
                        <div className={`h-full rounded-full ${barCls}`} style={{ width: `${val}%` }} />
                      )}
                    </div>
                    <span className={`text-sm font-extrabold w-7 text-right tabular-nums shrink-0 ${val != null ? textCls : 'text-gray-600'}`}>
                      {val ?? '—'}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-2">
              <span className="text-xs text-gray-400 w-20 shrink-0">Overall</span>
              <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${score > 80 ? 'bg-green-400' : score <= 50 ? 'bg-red-500' : 'bg-yellow-400'}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className={`text-sm font-extrabold w-7 text-right tabular-nums shrink-0 ${score > 80 ? 'text-green-400' : score <= 50 ? 'text-red-500' : 'text-yellow-400'}`}>
                {score}
              </span>
            </div>
          </div>

          {/* Tournament run — match by match */}
          <div className="bg-gray-800 rounded-2xl p-4 mb-6">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Tournament Run</p>
            <div className="space-y-1.5">
              {run.matches.map((m, i) => {
                const chipCls = m.result === 'W'
                  ? 'bg-green-500/20 text-green-400'
                  : m.result === 'L'
                    ? 'bg-red-500/20 text-red-400'
                    : 'bg-yellow-400/20 text-yellow-400'
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-[10px] text-gray-500 w-[5.5rem] shrink-0 leading-tight">{m.stage}</span>
                    <span className="w-5 h-3.5 rounded-sm overflow-hidden inline-flex shrink-0 shadow-sm">
                      <FlagImg nation={m.opponent} className="w-full h-full object-cover" />
                    </span>
                    <span className="text-gray-300 flex-1 truncate">{m.opponent}</span>
                    <span className="text-white font-bold tabular-nums shrink-0">{m.gf}–{m.ga}</span>
                    <span className={`text-[10px] font-extrabold rounded px-1.5 py-0.5 w-6 text-center shrink-0 ${chipCls}`}>
                      {m.result}
                    </span>
                  </div>
                )
              })}
            </div>
            {run.matches.some(m => m.pens) && (
              <p className="text-[10px] text-gray-500 mt-2">
                {run.matches.filter(m => m.pens).map(m => `${m.stage} decided on penalties`).join(' · ')}
              </p>
            )}
            <div className="mt-3 pt-3 border-t border-gray-700 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-green-400 font-extrabold text-lg tabular-nums">{run.goalsFor}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Scored</div>
              </div>
              <div>
                <div className="text-red-400 font-extrabold text-lg tabular-nums">{run.goalsAgainst}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Conceded</div>
              </div>
              <div>
                <div className="text-white font-extrabold text-lg tabular-nums">
                  {run.goalsFor - run.goalsAgainst >= 0 ? '+' : ''}{run.goalsFor - run.goalsAgainst}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Diff</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard label="Avg Rating" value={avgOverall} />
            <StatCard label="Formation" value={formation} />
          </div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="mb-6">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Achievements</p>
              <div className="flex flex-wrap gap-2">
                {achievements.map(a => (
                  <div key={a.id} className="flex items-center gap-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-lg px-2.5 py-1.5" title={a.desc}>
                    <span className="text-base">{a.icon}</span>
                    <span className="text-yellow-400 text-xs font-bold">{a.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">Your XI</p>
            {slots.map(slot => slot.player && (
              <div key={slot.id} className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2">
                <span className="text-xs text-gray-500 w-8 shrink-0">{slot.position}</span>
                <span className="w-6 h-4 rounded-sm overflow-hidden inline-flex shrink-0 shadow-sm"><FlagImg nation={slot.player.nation} className="w-full h-full object-cover" /></span>
                <span className="text-sm text-white flex-1 truncate">{slot.player.name}</span>
                <span className="text-yellow-400 font-bold text-sm shrink-0">{slot.player.overall}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {/* Submit panel */}
          {isConfigured && submitState === 'submitting' && (
            <div className="bg-gray-800 rounded-xl p-3 text-center text-gray-400 text-sm animate-pulse">
              Submitting to leaderboard…
            </div>
          )}

          {isConfigured && submitState !== 'done' && submitState !== 'submitting' && (
            <div className={`rounded-xl p-3 space-y-2 ${getSavedName() ? 'bg-gray-800' : 'bg-yellow-400/10 border border-yellow-400/30'}`}>
              {!getSavedName() ? (
                <>
                  <p className="text-yellow-400 font-bold text-sm">🏅 Set your leaderboard name</p>
                  <p className="text-gray-400 text-xs">Enter once — every future game posts automatically to the global leaderboard{inGroup ? ' and your group' : ''}.</p>
                </>
              ) : (
                <p className="text-xs uppercase tracking-widest text-gray-500">
                  {inGroup ? '👥 Update name or resubmit' : 'Update name or resubmit'}
                </p>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Your name"
                  maxLength={20}
                  value={name}
                  onChange={e => { setName(e.target.value); if (nameError) setNameError('') }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  autoFocus={!getSavedName()}
                  className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                />
                <button
                  onClick={handleSubmit}
                  disabled={!name.trim()}
                  className="px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-bold text-sm transition-colors shrink-0"
                >
                  {submitState === 'error' ? 'Retry' : getSavedName() ? 'Update' : 'Save'}
                </button>
              </div>
              {nameError && <p className="text-red-400 text-xs">{nameError}</p>}
              {submitState === 'error' && <p className="text-red-400 text-xs">Failed — check your connection.</p>}
            </div>
          )}

          {isConfigured && submitState === 'done' && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 text-center">
              <div className="text-green-400 font-bold text-sm">
                ✓ On the leaderboard{inGroup ? ' & group' : ''}!
              </div>
              <div className="text-green-400/60 text-xs mt-0.5">as {getSavedName()}</div>
              <button onClick={onLeaderboard} className="text-xs text-green-400/70 hover:text-green-400 mt-1 transition-colors">
                View leaderboard →
              </button>
            </div>
          )}

          {/* Share */}
          <button onClick={handleShareImage} disabled={imgState === 'working'} className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-gray-900 font-bold transition-colors">
            {imgState === 'working' ? 'Generating…' : imgState === 'done' ? '✓ Image saved!' : '📸 Share Image'}
          </button>
          <button onClick={handleShareText} className="w-full py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold text-sm transition-colors">
            {copyState === 'text' ? '✓ Copied!' : '📋 Copy Result + Link'}
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
