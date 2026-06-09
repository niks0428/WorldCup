import { calculateTeamScore, calculateGroupScores } from '../utils/scoring'
import { simulateTournament } from '../utils/tournament'
import { simulateLeague } from '../utils/league'
import { getAchievements } from '../lib/achievements'
import PitchView from './PitchView'
import { useState, useEffect, useRef } from 'react'
import { submitScore, isConfigured } from '../lib/supabase'
import confetti from 'canvas-confetti'
import { FlagImg } from '../lib/flags'
import { playResult } from '../lib/sound'
import { buildShareImage } from '../lib/shareImage'
import { validateName } from '../lib/nameFilter'
import { recordChallengeResult, getChallengeStreak } from '../lib/challengeStreak'

function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd'], v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

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

function buildChallengeUrl(formation, seed, score, name, competition) {
  const base = `${window.location.href.split('#')[0]}#c=${formation}|${seed}`
  // Embed the challenger's score (+ name + competition) so the opponent plays the
  // right mode and their result is a direct win/loss. Older links without these
  // still work (no win judged, default World Cup).
  if (score == null) return base
  return `${base}|${score}|${encodeURIComponent(name || '')}|${competition === 'pl' ? 'pl' : 'wc'}`
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

export default function ResultScreen({ slots, formation, mode, seed, competition = 'wc', config, streak, groupCode, onRestart, onLeaderboard }) {
  const isPL = competition === 'pl'
  const score = calculateTeamScore(slots)
  const groups = calculateGroupScores(slots)
  const run = isPL ? simulateLeague(slots, score, seed) : simulateTournament(slots, score, seed)
  const tier = run.tierMeta
  const achievements = getAchievements(slots, config || { mode })
  const [copyState, setCopyState] = useState('idle')
  const [name, setName] = useState(getSavedName)
  const [submitState, setSubmitState] = useState('idle')
  const [autoSubmitted, setAutoSubmitted] = useState(false)
  const [challengeCopied, setChallengeCopied] = useState(false)
  const [imgState, setImgState] = useState('idle')
  const [nameError, setNameError] = useState('')
  const [showAllMatches, setShowAllMatches] = useState(false)
  const [showTable, setShowTable] = useState(false)
  const isDaily = mode === 'daily'
  const inGroup = Boolean(groupCode)

  // Head-to-head challenge: the link carried the challenger's score (+ name), so
  // this result is a direct win/loss that drives the challenge win streak.
  const challengerScore = config?.challengerScore
  const challengerName = config?.challengerName || 'your mate'
  const isChallenge = config?.isChallenge && challengerScore != null
  const won = isChallenge && score > challengerScore
  const [challengeStreak, setChallengeStreak] = useState(null)
  const challengeRecorded = useRef(false)

  // Record the challenge outcome once (win → streak +1, loss → reset to 0).
  // Runs before the auto-submit effect so the new streak is persisted in time
  // for doSubmit to read it back from localStorage. The ref guards against
  // StrictMode's double-invoke (which would otherwise double-count a win).
  useEffect(() => {
    if (!isChallenge || challengeRecorded.current) return
    challengeRecorded.current = true
    setChallengeStreak(recordChallengeResult(won, competition))
  }, [])

  async function doSubmit(playerName) {
    const squadUrl = buildSquadUrl(slots, formation, mode)
    const today = new Date().toISOString().split('T')[0]
    await submitScore({
      playerName, score, tier: tier.label,
      formation, mode: mode || 'classic', squadUrl,
      seed: seed || null,
      challengeDate: isDaily ? today : null,
      groupCode: groupCode || null,
      competition,
      streak: streak || null,
      // The recording effect runs first and persists the new streak, so read it
      // straight from localStorage rather than racing React state.
      challengeStreak: isChallenge ? getChallengeStreak(competition).streak : null,
    })
  }

  useEffect(() => {
    // Celebrate based on the result reached, not raw squad score (an underdog
    // that lifts the trophy still earns the gold confetti).
    const cel = {
      'World Cup Winners': 95, 'Finalists': 84, 'Semi-finalists': 76,
      'Invincibles': 99, 'Centurions': 97, 'Champions': 95, 'Title Race': 84, 'Champions League': 76,
    }[run.tier] ?? 60
    const t = setTimeout(() => { fireConfetti(cel); playResult(cel) }, 400)
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
    let text
    if (isPL) {
      const cups = [run.faCupWon && 'FA Cup', run.leagueCupWon && 'League Cup', run.uclWon && 'Champions League'].filter(Boolean)
      const cupsStr = cups.length ? ` + ${cups.join(' + ')}` : ''
      if (run.perfect) text = `38-0-0. I built a Premier League XI and went UNBEATEN${cupsStr}. INVINCIBLES. 🏆 Lift the Trophy — ${url}`
      else if (run.trophyLabel) text = `I won the ${run.trophyLabel} with my Premier League XI! ${tier.emoji} (${run.won}W ${run.drawn}D ${run.lost}L) Lift the Trophy — ${url}`
      else text = `I built a Premier League XI and finished ${tier.label} (${run.won}W ${run.drawn}D ${run.lost}L)${cupsStr}. ${tier.emoji} Lift the Trophy — ${url}`
    } else {
      text = `I built a World Cup XI that reached the ${tier.label}. ${tier.emoji} Lift the Trophy — ${url}`
    }
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
    const url = buildChallengeUrl(formation, seed, score, getSavedName(), competition)
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

            {/* Cup trophies — PL only */}
            {isPL && (run.faCupWon || run.uclWon || run.leagueCupWon) && (
              <div className="mt-3 flex flex-wrap gap-1.5 justify-center">
                {run.faCupWon      && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">🏆 FA Cup</span>}
                {run.leagueCupWon  && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">🏆 League Cup</span>}
                {run.uclWon        && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">⭐ Champions League</span>}
              </div>
            )}
            {isPL && run.trophyLabel && (
              <div className="mt-2 text-yellow-400 font-extrabold text-base">{run.trophyLabel}</div>
            )}
          </div>

          {/* H2H — played via h2h link (no challenger score yet) */}
          {config?.isH2H && !isChallenge && (
            <div className="rounded-2xl p-4 mb-6 text-center border border-yellow-400/30 bg-yellow-400/5">
              <div className="text-2xl mb-1">⚔️</div>
              <div className="font-extrabold text-yellow-300 text-sm mb-1">Head-to-Head · Your score: {score}</div>
              <div className="text-gray-400 text-xs mb-3">Share your result with your opponent to compare!</div>
            </div>
          )}

          {/* Challenge head-to-head result */}
          {isChallenge && (
            <div className={`rounded-2xl p-4 mb-6 text-center border ${
              won ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
            }`}>
              <div className="text-2xl mb-1">{won ? '🏆' : '😞'}</div>
              <div className={`font-extrabold text-sm ${won ? 'text-green-400' : 'text-red-400'}`}>
                {won
                  ? `You beat ${challengerName} (${challengerScore})!`
                  : `${challengerName} (${challengerScore}) held you off.`}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {won ? (
                  <>Challenge win streak: <span className="text-orange-400 font-bold">{(challengeStreak?.streak ?? getChallengeStreak(competition).streak)} 🔥</span></>
                ) : (
                  <>Win streak reset to 0</>
                )}
              </div>
            </div>
          )}

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

          {/* Run — Premier League season or World Cup cup run */}
          <div className="bg-gray-800 rounded-2xl p-4 mb-6">
            <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">{isPL ? 'The Season' : 'Tournament Run'}</p>

            {isPL && (() => {
              const sortedByMD = [...run.matches].sort((a, b) => a.md - b.md)
              // Pick highlight matches: opener, finale, biggest win, biggest loss, vs strongest
              const highlightMDs = new Set([
                sortedByMD[0]?.md,
                sortedByMD[37]?.md,
                run.biggestWin?.md,
                run.biggestLoss?.md,
                run.matches.find(m => m.opponent === 'Liverpool')?.md,
                run.matches.find(m => m.opponent === 'Arsenal')?.md,
              ].filter(m => m != null))
              const highlights = sortedByMD.filter(m => highlightMDs.has(m.md))
              const displayMatches = showAllMatches ? sortedByMD : highlights

              return (
                <>
                  {/* Primary stats row */}
                  <div className="grid grid-cols-4 gap-2 text-center mb-3">
                    <div>
                      <div className="text-white font-extrabold text-lg tabular-nums">{ordinal(run.position)}</div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500">Finish</div>
                    </div>
                    <div>
                      <div className="text-yellow-400 font-extrabold text-lg tabular-nums">{run.points}</div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500">Points</div>
                    </div>
                    <div>
                      <div className="font-extrabold text-base tabular-nums text-white leading-tight">
                        <span className="text-green-400">{run.won}</span><span className="text-gray-600">-</span><span className="text-yellow-400">{run.drawn}</span><span className="text-gray-600">-</span><span className="text-red-400">{run.lost}</span>
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500">W-D-L</div>
                    </div>
                    <div>
                      <div className="text-white font-extrabold text-lg tabular-nums">
                        {run.goalsFor - run.goalsAgainst >= 0 ? '+' : ''}{run.goalsFor - run.goalsAgainst}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500">GD</div>
                    </div>
                  </div>

                  {/* Secondary stats row */}
                  <div className="grid grid-cols-3 gap-2 text-center mb-3 pb-3 border-b border-gray-700">
                    <div>
                      <div className="text-sky-400 font-extrabold text-base tabular-nums">{run.cleanSheets}</div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500">Clean Sheets</div>
                    </div>
                    <div>
                      <div className="text-green-400 font-extrabold text-base tabular-nums">
                        {run.biggestWin ? `${run.biggestWin.gf}–${run.biggestWin.ga}` : '—'}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500">Best Win</div>
                    </div>
                    <div>
                      <div className="text-red-400 font-extrabold text-base tabular-nums">
                        {run.biggestLoss ? `${run.biggestLoss.gf}–${run.biggestLoss.ga}` : '—'}
                      </div>
                      <div className="text-[9px] uppercase tracking-wider text-gray-500">Worst Loss</div>
                    </div>
                  </div>

                  {/* Form strip — last 10 games */}
                  <div className="mb-3">
                    <div className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">Recent Form (last 10)</div>
                    <div className="flex gap-1">
                      {sortedByMD.slice(-10).map((m, i) => (
                        <span key={i} className={`flex-1 h-5 rounded text-[8px] font-extrabold flex items-center justify-center ${
                          m.result === 'W' ? 'bg-green-500/30 text-green-400' :
                          m.result === 'L' ? 'bg-red-500/30 text-red-400' :
                          'bg-yellow-400/20 text-yellow-400'
                        }`}>{m.result}</span>
                      ))}
                    </div>
                  </div>

                  {/* Match list — highlights by default, full season on toggle */}
                  <div className="space-y-1.5">
                    {displayMatches.map((m, i) => {
                      const chipCls = m.result === 'W'
                        ? 'bg-green-500/20 text-green-400'
                        : m.result === 'L'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-400/20 text-yellow-400'
                      const isBigWin = run.biggestWin?.md === m.md
                      const isBigLoss = run.biggestLoss?.md === m.md
                      return (
                        <div key={m.md} className="flex items-center gap-2 text-sm">
                          <span className="text-[10px] text-gray-500 w-[5.5rem] shrink-0 leading-tight">
                            MD {m.md} · {m.home ? 'H' : 'A'}
                          </span>
                          <span className="w-5 h-3.5 inline-flex shrink-0 rounded-sm overflow-hidden">
                            <FlagImg nation={m.opponent} className="w-full h-full" />
                          </span>
                          <span className="text-gray-300 flex-1 truncate">{m.opponent}</span>
                          <span className="text-white font-bold tabular-nums shrink-0">{m.gf}–{m.ga}</span>
                          <span className={`text-[10px] font-extrabold rounded px-1.5 py-0.5 w-6 text-center shrink-0 ${chipCls}`}>
                            {m.result}
                          </span>
                          {(isBigWin || isBigLoss) && (
                            <span className="text-[9px] text-gray-500 shrink-0" title={isBigWin ? 'Biggest win' : 'Biggest loss'}>
                              {isBigWin ? '⭐' : '💔'}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  <button
                    onClick={() => setShowAllMatches(v => !v)}
                    className="mt-2 w-full text-[10px] text-gray-500 hover:text-gray-300 transition-colors py-1"
                  >
                    {showAllMatches ? '▲ Show highlights only' : `▼ Show all 38 games`}
                  </button>
                </>
              )
            })()}

            {!isPL && (
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
                      <span className="w-5 h-3.5 inline-flex shrink-0">
                        <FlagImg nation={m.opponent} className="w-full h-full" />
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
            )}

            {!isPL && run.matches.some(m => m.pens) && (
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

          {/* League table — PL only */}
          {isPL && (
            <div className="bg-gray-800 rounded-2xl p-4 mb-6">
              <button
                onClick={() => setShowTable(v => !v)}
                className="w-full flex items-center justify-between text-xs uppercase tracking-widest text-gray-500 hover:text-gray-300 transition-colors mb-0"
              >
                <span>League Table</span>
                <span>{showTable ? '▲' : '▼'}</span>
              </button>
              {showTable && (
                <div className="mt-3 space-y-0.5">
                  {/* Header */}
                  <div className="flex items-center gap-2 text-[9px] uppercase tracking-wider text-gray-600 px-1 pb-1 border-b border-gray-700">
                    <span className="w-4 text-right shrink-0">#</span>
                    <span className="w-4 shrink-0" />
                    <span className="flex-1">Club</span>
                    <span className="w-7 text-right tabular-nums">Pts</span>
                    <span className="w-8 text-right tabular-nums">GD</span>
                  </div>
                  {run.table.map(row => {
                    const zoneCls = row.pos <= 4 ? 'text-sky-400'
                      : row.pos === 5 ? 'text-orange-400'
                      : row.pos <= 7 ? 'text-violet-400'
                      : row.pos >= 18 ? 'text-red-400'
                      : 'text-gray-500'
                    const borderCls = row.pos <= 4 ? 'border-l-2 border-sky-400'
                      : row.pos === 5 ? 'border-l-2 border-orange-400'
                      : row.pos <= 7 ? 'border-l-2 border-violet-400'
                      : row.pos >= 18 ? 'border-l-2 border-red-400'
                      : 'border-l-2 border-transparent'
                    return (
                    <div
                      key={row.name}
                      className={`flex items-center gap-2 text-xs rounded px-1 py-1 ${borderCls} ${
                        row.isPlayer ? 'bg-yellow-400/10 border-yellow-400/40' : ''
                      }`}
                    >
                      <span className={`w-4 text-right shrink-0 tabular-nums ${zoneCls}`}>{row.pos}</span>
                      <span className="w-4 h-3 inline-flex shrink-0 rounded-sm overflow-hidden">
                        {!row.isPlayer && <FlagImg nation={row.name} className="w-full h-full" />}
                      </span>
                      <span className={`flex-1 truncate ${row.isPlayer ? 'text-yellow-400 font-bold' : 'text-gray-300'}`}>
                        {row.isPlayer ? 'Your XI' : row.name}
                      </span>
                      <span className={`w-7 text-right tabular-nums font-bold ${row.isPlayer ? 'text-yellow-400' : 'text-white'}`}>
                        {row.pts}
                      </span>
                      <span className={`w-8 text-right tabular-nums text-[10px] ${
                        row.gd > 0 ? 'text-green-400' : row.gd < 0 ? 'text-red-400' : 'text-gray-500'
                      }`}>
                        {row.gd >= 0 ? '+' : ''}{row.gd}
                      </span>
                    </div>
                  )})}
                  <p className="text-[9px] text-gray-600 pt-1 leading-relaxed">
                    🔵 UCL · 🟠 UEL · 🟣 UECL · 🔴 relegated
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Awards — Player of the Season/Tournament + Golden Boot */}
          {(run.playerOfSeason || run.playerOfTournament || run.goldenBoot) && (
            <div className="bg-gray-800 rounded-2xl p-4 mb-6">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-3">Awards</p>
              <div className="grid grid-cols-2 gap-3">
                {(isPL ? run.playerOfSeason : run.playerOfTournament) && (() => {
                  const p = isPL ? run.playerOfSeason : run.playerOfTournament
                  return (
                    <div className="bg-gray-700/60 rounded-xl p-3">
                      <div className="text-[9px] uppercase tracking-wider text-yellow-400 mb-1.5">
                        {isPL ? '🏅 Player of the Season' : '🌟 Player of the Tournament'}
                      </div>
                      <div className="text-white font-bold text-xs leading-tight truncate">{p.name}</div>
                      {(p.team || (!isPL && p.nation)) && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{p.team ?? p.nation}</div>}
                      <div className="text-[10px] mt-1 flex gap-1.5 flex-wrap">
                        <span className="text-gray-500">{p.position}</span>
                        <span className="text-green-400 font-bold">{p.goals}G</span>
                        <span className="text-sky-400 font-bold">{p.assists}A</span>
                      </div>
                    </div>
                  )
                })()}
                {run.goldenBoot && (
                  <div className="bg-gray-700/60 rounded-xl p-3">
                    <div className="text-[9px] uppercase tracking-wider text-yellow-400 mb-1.5">🥾 Golden Boot</div>
                    <div className="text-white font-bold text-xs leading-tight truncate">{run.goldenBoot.name}</div>
                    {(run.goldenBoot.team || (!isPL && run.goldenBoot.nation)) && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{run.goldenBoot.team ?? run.goldenBoot.nation}</div>}
                    <div className="text-[10px] mt-1 flex gap-1.5 flex-wrap">
                      <span className="text-gray-500">{run.goldenBoot.position}</span>
                      <span className="text-green-400 font-bold">{run.goldenBoot.goals} goals</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

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

          {/* H2H: show send-your-score CTA prominently before anything else */}
          {config?.isH2H && seed && (
            <button onClick={handleChallenge} className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-extrabold transition-colors">
              {challengeCopied ? '✓ Copied!' : '⚔️ Send My Score to Opponent'}
            </button>
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
            {seed && !config?.isH2H && (
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
