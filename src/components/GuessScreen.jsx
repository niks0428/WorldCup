import { useState } from 'react'
import { seededShuffle, todaySeed, randomSeed } from '../lib/seededRandom'
import { FlagImg } from '../lib/flags.jsx'
import wcNew from '../data/players_wc_new.json'
import wcOld from '../data/players_wc_old.json'
import euroA from '../data/players_euro_a.json'
import euroB from '../data/players_euro_b.json'
import plPlayers from '../data/players_pl.json'

// ── Constants ──────────────────────────────────────────────────────────────────

const ROUNDS = 10

// Score earned when correct, indexed by hints used (0–3)
const HINT_SCORES = [1.0, 0.75, 0.5, 0.25]

const STAT_LABELS = [
  { key: 'pac', label: 'PAC' },
  { key: 'sho', label: 'SHO' },
  { key: 'pas', label: 'PAS' },
  { key: 'dri', label: 'DRI' },
  { key: 'def', label: 'DEF' },
  { key: 'phy', label: 'PHY' },
]

const GRADES = [
  { min: 9.5, label: 'Perfect',       emoji: '🌟', desc: 'Absolutely elite football brain' },
  { min: 8.0, label: 'Elite Scout',   emoji: '🏆', desc: 'Exceptional football knowledge' },
  { min: 6.0, label: 'Sharp Eye',     emoji: '🎯', desc: 'You know your players' },
  { min: 4.0, label: 'Decent',        emoji: '👍', desc: 'Not bad — keep watching football' },
  { min: 2.0, label: 'Needs Work',    emoji: '📚', desc: 'Time to study some squad pages' },
  { min: 0,   label: 'Just Guessing', emoji: '🎲', desc: 'Random chance might outperform you' },
]

// ── Pools ──────────────────────────────────────────────────────────────────────

function dedupeByName(arr) {
  const map = new Map()
  for (const p of arr) {
    if (!map.has(p.name) || p.overall > map.get(p.name).overall) map.set(p.name, p)
  }
  return [...map.values()]
}

const WC_ALL = [...wcNew, ...wcOld, ...euroA, ...euroB].filter(p => p.overall >= 70)
const PL_ALL = plPlayers.filter(p => p.overall >= 75)

const WC_YEARS = [...new Set(WC_ALL.map(p => p.year))].sort((a, b) => a - b)
const PL_YEARS = [...new Set(PL_ALL.map(p => p.year))].sort((a, b) => a - b)

// ── Helpers ────────────────────────────────────────────────────────────────────

function posGroup(positions) {
  if (!positions?.length) return 'MID'
  const p = positions[0]
  if (p === 'GK') return 'GK'
  if (['CB', 'LB', 'RB', 'LWB', 'RWB', 'SW'].includes(p)) return 'DEF'
  if (['ST', 'CF', 'LW', 'RW', 'LS', 'RS', 'SS'].includes(p)) return 'ATT'
  return 'MID'
}

function plSeason(year) {
  return `${year - 1}/${String(year).slice(-2)}`
}

function tournamentLabel(player) {
  if (player.tournament === 'PL')   return 'Premier League'
  if (player.tournament === 'EURO') return 'Euro'
  return 'World Cup'
}

function getGrade(score) {
  return GRADES.find(g => score >= g.min) ?? GRADES[GRADES.length - 1]
}

function fmtScore(n) {
  return n % 1 === 0 ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
}

function applyEra(pool, minYear, maxYear) {
  if (!minYear && !maxYear) return pool
  return pool.filter(p =>
    (!minYear || p.year >= minYear) && (!maxYear || p.year <= maxYear)
  )
}

// ── Question builder ───────────────────────────────────────────────────────────

function buildQuestions(pool, seed) {
  // Dedupe after era filter so we don't pick stale representatives
  const deduped = dedupeByName(pool)
  const subjects = seededShuffle(deduped, `subj|${seed}`).slice(0, ROUNDS)
  return subjects.map((player, qi) => {
    const group = posGroup(player.positions)
    // Prefer same-era distractors; fall back to broader pool if needed
    let candidates = deduped.filter(p =>
      p.name !== player.name && posGroup(p.positions) === group && Math.abs(p.overall - player.overall) <= 12
    )
    if (candidates.length < 6)
      candidates = deduped.filter(p => p.name !== player.name && posGroup(p.positions) === group)
    if (candidates.length < 3)
      candidates = deduped.filter(p => p.name !== player.name && Math.abs(p.overall - player.overall) <= 20)

    const top = [...candidates]
      .sort((a, b) => Math.abs(a.overall - player.overall) - Math.abs(b.overall - player.overall))
      .slice(0, 20)
    const distractors = seededShuffle(top, `d|${seed}|${qi}`).slice(0, 3)
    const options = seededShuffle([player, ...distractors], `o|${seed}|${qi}`)
    return { player, options, correctIdx: options.findIndex(o => o.name === player.name) }
  })
}

// ── Era Selector component ─────────────────────────────────────────────────────

function EraSelector({ years, minYear, maxYear, onMin, onMax }) {
  const first = years[0]
  const last  = years[years.length - 1]
  const displayMin = minYear || first
  const displayMax = maxYear || last

  const labelMin = years.includes(displayMin) ? displayMin : first
  const labelMax = years.includes(displayMax) ? displayMax : last

  function handleMinSlide(e) {
    const val = Number(e.target.value)
    if (val >= (maxYear || last)) return
    onMin(val === first ? null : val)
  }

  function handleMaxSlide(e) {
    const val = Number(e.target.value)
    if (val <= (minYear || first)) return
    onMax(val === last ? null : val)
  }

  const isFiltered = Boolean(minYear || maxYear)

  return (
    <div className="bg-gray-800/60 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Era Filter</span>
        {isFiltered && (
          <button
            onClick={() => { onMin(null); onMax(null) }}
            className="text-[10px] text-gray-500 hover:text-white transition-colors border border-gray-700 rounded px-2 py-0.5"
          >
            Reset
          </button>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-extrabold ${isFiltered ? 'text-yellow-400' : 'text-gray-400'}`}>
          {labelMin}{labelMin !== labelMax ? ` – ${labelMax}` : ''}
        </span>
        <span className="text-xs text-gray-600">
          {isFiltered
            ? `${years.filter(y => y >= (minYear || first) && y <= (maxYear || last)).length} editions`
            : `All ${years.length} editions`}
        </span>
      </div>

      {/* From slider */}
      <div className="space-y-1 mb-2">
        <label className="text-[10px] text-gray-600 uppercase tracking-wider">From</label>
        <input
          type="range"
          min={first}
          max={last}
          step={1}
          value={displayMin}
          onChange={handleMinSlide}
          className="w-full accent-yellow-400 h-1"
        />
        <div className="flex justify-between text-[10px] text-gray-700">
          <span>{first}</span><span>{last}</span>
        </div>
      </div>

      {/* To slider */}
      <div className="space-y-1">
        <label className="text-[10px] text-gray-600 uppercase tracking-wider">To</label>
        <input
          type="range"
          min={first}
          max={last}
          step={1}
          value={displayMax}
          onChange={handleMaxSlide}
          className="w-full accent-yellow-400 h-1"
        />
      </div>

      {/* Quick-era presets */}
      <EraPresets years={years} first={first} last={last} minYear={minYear} maxYear={maxYear} onMin={onMin} onMax={onMax} />
    </div>
  )
}

function EraPresets({ years, first, last, minYear, maxYear, onMin, onMax }) {
  // Build meaningful era buckets from the actual year list
  const mid  = years[Math.floor(years.length / 2)]
  const q1   = years[Math.floor(years.length / 4)]
  const q3   = years[Math.floor((years.length * 3) / 4)]

  const presets = [
    { label: 'All',    min: null, max: null },
    { label: `${first}s`, min: null, max: q1 },
    { label: `${mid}`, min: q1, max: q3 },
    { label: `${q3}+`, min: q3, max: null },
  ]

  return (
    <div className="flex gap-1.5 mt-3 flex-wrap">
      {presets.map(p => {
        const active = p.min === minYear && p.max === maxYear
        return (
          <button
            key={p.label}
            onClick={() => { onMin(p.min); onMax(p.max) }}
            className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-colors ${
              active
                ? 'bg-yellow-400 text-gray-900'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function GuessScreen({ onBack }) {
  const [comp, setComp]           = useState(null)
  const [isDaily, setIsDaily]     = useState(false)
  const [questions, setQuestions] = useState(null)
  const [current, setCurrent]     = useState(0)
  const [selected, setSelected]   = useState(null)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [score, setScore]         = useState(0)
  const [history, setHistory]     = useState([])
  const [copied, setCopied]       = useState(false)

  // Era filter — separate state for WC and PL so switching modes remembers last choice
  const [wcMinYear, setWcMinYear] = useState(null)
  const [wcMaxYear, setWcMaxYear] = useState(null)
  const [plMinYear, setPlMinYear] = useState(null)
  const [plMaxYear, setPlMaxYear] = useState(null)

  // Which era selector is expanded in the mode picker
  const [eraOpen, setEraOpen] = useState(null)  // 'wc' | 'pl' | null

  function startGame(competition, daily = false) {
    const raw = competition === 'pl' ? PL_ALL : WC_ALL
    const mn  = competition === 'pl' ? plMinYear : wcMinYear
    const mx  = competition === 'pl' ? plMaxYear : wcMaxYear
    const pool = applyEra(raw, mn, mx)

    if (pool.length < ROUNDS * 2) {
      // Guard: if era filter leaves too few players, fall back to full pool
      const fallback = dedupeByName(raw)
      if (fallback.length < ROUNDS) return
    }

    const seed = daily ? `daily|${competition}|${todaySeed()}` : randomSeed()
    setComp(competition)
    setIsDaily(daily)
    setQuestions(buildQuestions(pool, seed))
    setCurrent(0)
    setSelected(null)
    setHintsUsed(0)
    setScore(0)
    setHistory([])
    setCopied(false)
  }

  function handleHint() {
    if (selected !== null || hintsUsed >= 3) return
    setHintsUsed(h => h + 1)
  }

  function handlePick(idx) {
    if (selected !== null) return
    const { correctIdx } = questions[current]
    const correct = idx === correctIdx
    const pts = correct ? (HINT_SCORES[hintsUsed] ?? 0.25) : 0
    setSelected(idx)
    setScore(s => s + pts)
    setHistory(h => [...h, {
      player: questions[current].player,
      picked: questions[current].options[idx].name,
      correct,
      hints: hintsUsed,
      pts,
    }])
  }

  function handleNext() {
    const nextQ = current + 1
    if (nextQ >= ROUNDS) {
      setCurrent(ROUNDS)
    } else {
      setCurrent(nextQ)
      setSelected(null)
      setHintsUsed(0)
    }
  }

  // ── Mode picker ─────────────────────────────────────────────────────────────
  if (!comp) {
    const wcActive = eraOpen === 'wc'
    const plActive = eraOpen === 'pl'

    return (
      <div className="flex flex-col items-center min-h-screen bg-gray-950 px-4 py-10">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-400 hover:text-white text-sm transition-colors">← Back</button>

        <div className="text-center mb-6 mt-6">
          <div className="text-5xl mb-3">🧠</div>
          <h1 className="text-3xl font-extrabold text-white mb-2">Guess the Player</h1>
          <p className="text-gray-400 text-sm max-w-xs mx-auto">
            See the stats — name the player. {ROUNDS} rounds.<br/>
            <span className="text-gray-600">Use hints to reveal clues — each costs ¼ point.</span>
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3">

          {/* WC / Euro card */}
          <div className="rounded-2xl border-2 border-yellow-400/60 bg-yellow-400/10 overflow-hidden">
            <button
              onClick={() => startGame('wc')}
              className="w-full p-5 text-left hover:bg-yellow-400/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">🌍</span>
                <div className="flex-1">
                  <div className="text-yellow-400 font-extrabold text-lg flex items-center gap-2">
                    World Cup / Euro
                    {(wcMinYear || wcMaxYear) && (
                      <span className="text-[10px] bg-yellow-400 text-gray-900 font-extrabold px-1.5 py-0.5 rounded">
                        {wcMinYear || WC_YEARS[0]}–{wcMaxYear || WC_YEARS[WC_YEARS.length - 1]}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm mt-0.5">International legends · WC &amp; Euro history</div>
                </div>
                <span className="text-yellow-400 text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
            <div className="border-t border-yellow-400/20 px-4 pb-3 pt-2 flex items-center justify-between">
              <button
                onClick={e => { e.stopPropagation(); setEraOpen(wcActive ? null : 'wc') }}
                className="text-xs text-yellow-400/70 hover:text-yellow-400 flex items-center gap-1 transition-colors"
              >
                🗓 Era filter {wcActive ? '▲' : '▼'}
              </button>
              <button
                onClick={() => startGame('wc', true)}
                className="text-xs bg-yellow-400/10 border border-yellow-400/40 text-yellow-300 hover:bg-yellow-400/20 px-3 py-1 rounded-lg font-bold transition-colors"
              >
                ⭐ Daily
              </button>
            </div>
            {wcActive && (
              <div className="px-4 pb-4">
                <EraSelector
                  years={WC_YEARS}
                  minYear={wcMinYear}
                  maxYear={wcMaxYear}
                  onMin={setWcMinYear}
                  onMax={setWcMaxYear}
                />
              </div>
            )}
          </div>

          {/* Premier League card */}
          <div className="rounded-2xl border-2 border-sky-400/60 bg-sky-400/10 overflow-hidden">
            <button
              onClick={() => startGame('pl')}
              className="w-full p-5 text-left hover:bg-sky-400/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <span className="text-4xl">🦁</span>
                <div className="flex-1">
                  <div className="text-sky-400 font-extrabold text-lg flex items-center gap-2">
                    Premier League
                    {(plMinYear || plMaxYear) && (
                      <span className="text-[10px] bg-sky-400 text-gray-900 font-extrabold px-1.5 py-0.5 rounded">
                        {plMinYear || PL_YEARS[0]}–{plMaxYear || PL_YEARS[PL_YEARS.length - 1]}
                      </span>
                    )}
                  </div>
                  <div className="text-gray-400 text-sm mt-0.5">FIFA-rated PL players across all editions</div>
                </div>
                <span className="text-sky-400 text-2xl group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
            <div className="border-t border-sky-400/20 px-4 pb-3 pt-2 flex items-center justify-between">
              <button
                onClick={e => { e.stopPropagation(); setEraOpen(plActive ? null : 'pl') }}
                className="text-xs text-sky-400/70 hover:text-sky-400 flex items-center gap-1 transition-colors"
              >
                🗓 Era filter {plActive ? '▲' : '▼'}
              </button>
              <button
                onClick={() => startGame('pl', true)}
                className="text-xs bg-sky-400/10 border border-sky-400/40 text-sky-300 hover:bg-sky-400/20 px-3 py-1 rounded-lg font-bold transition-colors"
              >
                ⭐ Daily
              </button>
            </div>
            {plActive && (
              <div className="px-4 pb-4">
                <EraSelector
                  years={PL_YEARS}
                  minYear={plMinYear}
                  maxYear={plMaxYear}
                  onMin={setPlMinYear}
                  onMax={setPlMaxYear}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Final screen ─────────────────────────────────────────────────────────────
  if (current >= ROUNDS) {
    const grade = getGrade(score)
    const isPL = comp === 'pl'
    const modeLabel = isPL ? 'Premier League' : 'World Cup / Euro'
    const emojiStrip = history.map(h => h.correct ? (h.hints > 0 ? '🟨' : '🟩') : '🟥').join('')
    const shareText = `🧠 Guess the Player — ${modeLabel}\n${emojiStrip}\n${fmtScore(score)} / 10 · ${grade.label} ${grade.emoji}\nliftthetrophy.online`
    const totalHints = history.reduce((a, h) => a + h.hints, 0)

    function copyShare() {
      navigator.clipboard.writeText(shareText)
        .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) })
        .catch(() => {})
    }

    return (
      <div className="flex flex-col min-h-screen bg-gray-950 px-4 py-8 max-w-md mx-auto">
        <div className="text-center mb-5">
          <div className="text-6xl mb-2">{grade.emoji}</div>
          <h2 className="text-3xl font-extrabold text-white mb-1">{grade.label}</h2>
          <p className="text-gray-400 text-sm mb-4">{grade.desc}</p>
          <div className="inline-flex items-baseline gap-1">
            <span className="text-yellow-400 font-extrabold text-5xl">{fmtScore(score)}</span>
            <span className="text-gray-500 text-2xl"> / 10</span>
          </div>
          {totalHints > 0 && (
            <div className="text-gray-500 text-xs mt-1">💡 {totalHints} hint{totalHints !== 1 ? 's' : ''} used</div>
          )}
          {isDaily && (
            <div className="mt-2">
              <span className="text-[10px] bg-yellow-400 text-gray-900 font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">Daily</span>
            </div>
          )}
        </div>

        {/* Emoji strip */}
        <div className="flex gap-1 justify-center mb-5">
          {history.map((h, i) => (
            <span key={i} className="text-xl" title={h.player.name}>
              {h.correct ? (h.hints > 0 ? '🟨' : '🟩') : '🟥'}
            </span>
          ))}
        </div>

        {/* Answer summary */}
        <div className="space-y-1.5 mb-6 overflow-y-auto">
          {history.map((h, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 ${
                h.correct ? 'bg-green-500/10 border border-green-500/20' : 'bg-gray-800 border border-gray-700'
              }`}
            >
              <span className="text-base shrink-0">{h.correct ? '✅' : '❌'}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-bold truncate ${h.correct ? 'text-green-400' : 'text-white'}`}>
                  {h.player.name}
                </div>
                {!h.correct && (
                  <div className="text-xs text-gray-500 truncate">You said: <span className="text-red-400">{h.picked}</span></div>
                )}
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                {h.hints > 0 && <div className="text-[10px] text-amber-400/80">{'💡'.repeat(h.hints)}</div>}
                <div className="text-xs">
                  {h.correct
                    ? <span className="text-yellow-400 font-bold">+{fmtScore(h.pts)}</span>
                    : <span className="text-gray-600">+0</span>
                  }
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-3 mt-auto">
          <button
            onClick={copyShare}
            className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-extrabold transition-colors"
          >
            {copied ? '✓ Copied!' : '📋 Share Result'}
          </button>
          <button
            onClick={() => startGame(comp, isDaily)}
            className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors"
          >
            {isDaily ? 'Replay Daily' : 'Play Again →'}
          </button>
          <button
            onClick={() => { setComp(null); setQuestions(null) }}
            className="w-full py-2.5 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm font-bold transition-colors"
          >
            Change Mode
          </button>
        </div>
      </div>
    )
  }

  // ── Question screen ───────────────────────────────────────────────────────────
  const { player, options, correctIdx } = questions[current]
  const isPL = comp === 'pl'
  const hasStats = STAT_LABELS.some(s => player[s.key] != null)
  const accentCls  = isPL ? 'text-sky-400' : 'text-yellow-400'
  const nextBtnCls = isPL ? 'bg-sky-400 hover:bg-sky-300' : 'bg-yellow-400 hover:bg-yellow-300'

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 max-w-md mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm transition-colors">← Back</button>
        <div className="flex items-center gap-3">
          {isDaily && <span className="text-[10px] bg-yellow-400 text-gray-900 font-extrabold px-1.5 py-0.5 rounded uppercase">Daily</span>}
          <span className="text-gray-400 text-sm font-mono">{current + 1}/{ROUNDS}</span>
          <span className={`font-extrabold ${accentCls}`}>{fmtScore(score)} pts</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full rounded-full transition-all duration-300 ${isPL ? 'bg-sky-400' : 'bg-yellow-400'}`}
          style={{ width: `${(current / ROUNDS) * 100}%` }}
        />
      </div>

      {/* Player card */}
      <div className="bg-gray-800 rounded-2xl p-5 mb-4 flex-shrink-0">

        {/* Top row: position / OVR */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="text-gray-500 text-[10px] uppercase tracking-widest mb-1.5">Who is this?</div>
            <span className="text-xs font-bold bg-gray-700 text-gray-300 rounded px-2 py-0.5">
              {player.positions?.[0] || '?'}
            </span>
          </div>
          <div className="text-right ml-4 shrink-0">
            <div className={`font-extrabold text-4xl leading-none ${accentCls}`}>{player.overall}</div>
            <div className="text-gray-500 text-[10px] uppercase tracking-wider mt-0.5">OVR</div>
          </div>
        </div>

        {/* Stats */}
        {hasStats ? (
          <div className="space-y-2">
            {STAT_LABELS.map(({ key, label }) => {
              const val = player[key]
              if (val == null) return null
              const barCls  = val >= 80 ? 'bg-green-400'  : val >= 60 ? 'bg-yellow-400'  : 'bg-red-400'
              const textCls = val >= 80 ? 'text-green-400' : val >= 60 ? 'text-yellow-400' : 'text-red-400'
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-500 w-7 shrink-0">{label}</span>
                  <div className="flex-1 h-2.5 bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${barCls}`} style={{ width: `${val}%` }} />
                  </div>
                  <span className={`text-sm font-extrabold w-7 text-right tabular-nums shrink-0 ${textCls}`}>{val}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-gray-600 text-xs text-center py-2">Stats not available for this edition</div>
        )}

        {/* Hint reveals */}
        {hintsUsed > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-700 space-y-1.5">
            {hintsUsed >= 1 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-400 w-3">💡</span>
                <FlagImg nation={player.nation} className="w-6 h-4 object-cover rounded-sm shrink-0" />
                <span className="text-sm text-white font-medium">{player.nation}</span>
              </div>
            )}
            {hintsUsed >= 2 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-400 w-3">💡</span>
                <span className="text-gray-400 text-xs w-6 text-center shrink-0">📅</span>
                <span className="text-sm text-white font-medium">
                  {isPL ? plSeason(player.year) + ' season' : player.year}
                </span>
              </div>
            )}
            {hintsUsed >= 3 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-amber-400 w-3">💡</span>
                <span className="text-gray-400 text-xs w-6 text-center shrink-0">🏆</span>
                <span className="text-sm text-white font-medium">{tournamentLabel(player)}</span>
              </div>
            )}
          </div>
        )}

        {/* Hint button */}
        {selected === null && (
          <button
            onClick={handleHint}
            disabled={hintsUsed >= 3}
            className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              hintsUsed >= 3
                ? 'bg-gray-700/40 text-gray-600 cursor-not-allowed'
                : 'bg-amber-400/15 border border-amber-400/40 text-amber-300 hover:bg-amber-400/25'
            }`}
          >
            {hintsUsed >= 3 ? (
              'No more hints'
            ) : (
              <>
                💡 {hintsUsed === 0 ? 'Hint' : hintsUsed === 1 ? '2nd Hint' : 'Last Hint'}
                <span className="text-amber-400/50">−¼ pt · max {fmtScore(HINT_SCORES[hintsUsed + 1] ?? 0.25)} pts</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Options */}
      <div className="space-y-2 flex-1">
        {options.map((opt, i) => {
          let cls = `border-gray-700 bg-gray-800 text-white ${selected === null ? 'hover:border-gray-500 active:scale-[0.99]' : ''}`
          if (selected !== null) {
            if (i === correctIdx)    cls = 'border-green-500 bg-green-500/20 text-green-300'
            else if (i === selected) cls = 'border-red-500 bg-red-500/15 text-red-400'
            else                     cls = 'border-gray-800 bg-gray-900 text-gray-600'
          }
          return (
            <button
              key={i}
              onClick={() => handlePick(i)}
              disabled={selected !== null}
              className={`w-full py-3.5 px-4 rounded-xl border-2 font-bold text-left transition-all ${cls}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm leading-tight">{opt.name}</span>
                {selected !== null && i === correctIdx   && <span className="text-green-400 text-base shrink-0">✓</span>}
                {selected !== null && i === selected && i !== correctIdx && <span className="text-red-400 text-base shrink-0">✗</span>}
              </div>
            </button>
          )
        })}
      </div>

      {/* Reveal + Next */}
      {selected !== null && (
        <div className="mt-4 space-y-3">
          <div className={`rounded-xl px-4 py-3 text-sm ${
            selected === correctIdx ? 'bg-green-500/10 border border-green-500/25' : 'bg-gray-800 border border-gray-700'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="font-extrabold text-white">{player.name}</span>
                <span className="text-gray-400"> · </span>
                <span className="text-gray-300">{player.nation}</span>
                {isPL
                  ? <span className="text-gray-500"> · {plSeason(player.year)}</span>
                  : <span className="text-gray-500"> · {player.tournament} {player.year}</span>
                }
              </div>
              {selected === correctIdx && hintsUsed > 0 && (
                <span className="text-amber-400 text-xs shrink-0 ml-2">{'💡'.repeat(hintsUsed)}</span>
              )}
            </div>
            {selected === correctIdx && (
              <div className="text-xs mt-1">
                <span className={hintsUsed === 0 ? 'text-green-400 font-bold' : 'text-amber-400 font-bold'}>
                  +{fmtScore(HINT_SCORES[hintsUsed] ?? 0.25)} pt{HINT_SCORES[hintsUsed] !== 1 ? 's' : ''}
                </span>
                {hintsUsed > 0 && <span className="text-gray-500"> (hints used: {hintsUsed})</span>}
              </div>
            )}
          </div>

          <button
            onClick={handleNext}
            className={`w-full py-3.5 rounded-xl font-extrabold transition-colors text-gray-900 ${nextBtnCls}`}
          >
            {current + 1 >= ROUNDS ? 'See Results →' : 'Next →'}
          </button>
        </div>
      )}
    </div>
  )
}
