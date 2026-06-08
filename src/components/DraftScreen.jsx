import { useState, useEffect, useMemo, useRef } from 'react'
import { seededShuffle } from '../lib/seededRandom'
import { calculateGroupScores, calculateTeamScore } from '../utils/scoring'
import wcNew from '../data/players_wc_new.json'
import wcOld from '../data/players_wc_old.json'
import euroA from '../data/players_euro_a.json'
import euroB from '../data/players_euro_b.json'
import plPlayers from '../data/players_pl.json'
import formations from '../data/formations.json'
import { getFitMultiplier, getPlayablePositions } from '../utils/compatibility'
import PitchView from './PitchView'
import { FlagImg, FLAG_EMOJI } from '../lib/flags'
import { playSpin, playTick, playPick, playPlace } from '../lib/sound'

const allPlayers = [...wcNew, ...wcOld, ...euroA, ...euroB, ...plPlayers]

// Re-export for components that import FLAG_MAP from here
export { FLAG_EMOJI as FLAG_MAP } from '../lib/flags'

// Players for the chosen competition: Premier League clubs, or World Cup +
// Euro nations. Keeps the two modes' draft pools fully separate.
function poolFor(competition) {
  return competition === 'pl'
    ? allPlayers.filter(p => p.tournament === 'PL')
    : allPlayers.filter(p => p.tournament === 'WC' || p.tournament === 'EURO')
}

// The spin reel cycles team×edition pairs (nation×year for WC, club×FIFA for PL).
function buildPairs(pool) {
  const seen = new Set()
  const pairs = []
  for (const p of pool) {
    const key = `${p.nation}|${p.year}|${p.tournament}`
    if (!seen.has(key)) { seen.add(key); pairs.push({ nation: p.nation, year: p.year, tournament: p.tournament }) }
  }
  return pairs
}

// Reel/label text for a team×edition pair. PL shows the real-world season the
// FIFA edition represents (FIFA 07 → 2006/07); WC/Euro shows tournament + year.
function periodLabel(pair) {
  if (pair.tournament === 'PL') return `${pair.year - 1}/${String(pair.year).slice(-2)}`
  return `${pair.tournament === 'EURO' ? 'EURO' : 'WC'} ${pair.year}`
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const ITEM_H = 60
// Per-mode allowances. Classic is the most forgiving; expert is leaner (fewer
// skips, no bench); hardcore has neither.
const SKIPS_BY_MODE = { classic: 3, expert: 1, hardcore: 0 }
const SUBS_BY_MODE  = { classic: 3, expert: 0, hardcore: 0 }

// A bench/SUB slot accepts any player; a pitch slot needs a compatible position.
function isBench(slot) {
  return slot.group === 'SUB'
}
function eligible(slot, player) {
  if (!player) return false
  return isBench(slot) ? true : getFitMultiplier(slot.position, player.positions) >= 0.85
}

function statColor(v) {
  if (v > 80) return 'text-green-400'
  if (v <= 50) return 'text-red-500'
  return 'text-yellow-400'
}
function barColor(v) {
  if (v > 80) return 'bg-green-400'
  if (v <= 50) return 'bg-red-500'
  return 'bg-yellow-400'
}

function PlayerPickCard({ player, fitLabel, fitCls, onClick, hideStats }) {
  const stats = [
    ['PAC', player.pac], ['SHO', player.sho], ['PAS', player.pas],
    ['DRI', player.dri], ['DEF', player.def], ['PHY', player.phy],
  ]
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-xl p-3 transition-colors"
    >
      <div className="flex justify-between items-start" style={{ marginBottom: hideStats ? 0 : '0.5rem' }}>
        <div className="min-w-0 pr-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="shrink-0 w-6 h-4 rounded-sm overflow-hidden inline-flex"><FlagImg nation={player.nation} className="w-full h-full object-cover" /></span>
            <span className="font-semibold text-white text-sm truncate">{player.name}</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {getPlayablePositions(player.positions).join('/')}
            {fitLabel && <span className={`ml-1 ${fitCls}`}>· {fitLabel}</span>}
          </div>
        </div>
        {!hideStats && (
          <div className={`text-2xl font-extrabold shrink-0 ${statColor(player.overall)}`}>
            {player.overall}
          </div>
        )}
      </div>

      {!hideStats && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {stats.map(([label, val]) => (
            <div key={label} className="flex items-center gap-1">
              <span className="text-[9px] font-bold text-gray-500 w-5 shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor(val)}`} style={{ width: `${val}%` }} />
              </div>
              <span className={`text-[10px] font-bold w-5 text-right tabular-nums ${statColor(val)}`}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

function ReelItem({ pair }) {
  const isPL = pair.tournament === 'PL'
  return (
    <div className="flex items-center justify-center gap-2 text-white font-bold select-none" style={{ height: ITEM_H }}>
      {isPL
        ? <span className="w-9 h-9 inline-flex shrink-0"><FlagImg nation={pair.nation} className="w-full h-full" /></span>
        : <span className="text-3xl">{FLAG_EMOJI[pair.nation] || '🏴'}</span>}
      <div className="text-center leading-tight">
        <div className="text-sm">{pair.nation}</div>
        <div className="text-xs font-normal text-yellow-400">{periodLabel(pair)}</div>
      </div>
    </div>
  )
}

function SlotReel({ finalPair, allPairs, onDone }) {
  const PRE = 28
  const [items] = useState(() => [...shuffle(allPairs).slice(0, PRE), finalPair])
  const startY = ITEM_H
  const endY = -(PRE * ITEM_H) + ITEM_H
  const [y, setY] = useState(startY)
  const [running, setRunning] = useState(false)
  const doneRef = useRef(false)

  // Guard so onDone only ever fires once (transitionend OR fallback timer)
  function finish() {
    if (doneRef.current) return
    doneRef.current = true
    onDone()
  }

  useEffect(() => {
    const id = requestAnimationFrame(() => { setRunning(true); setY(endY) })
    // Decelerating tick sounds matching the ease-out curve (~2.4s)
    const timers = []
    let t = 0.05
    let gap = 0.045
    while (t < 2.3) {
      timers.push(setTimeout(playTick, t * 1000))
      gap *= 1.16        // slow down over time
      t += gap
    }
    // Fail-safe: if transitionend never fires (mobile tap, tab switch,
    // composite glitch) force completion just after the animation ends.
    const fallback = setTimeout(finish, 2900)
    return () => { cancelAnimationFrame(id); timers.forEach(clearTimeout); clearTimeout(fallback) }
  }, [])

  return (
    <div className="relative rounded-xl overflow-hidden border-2 border-yellow-400" style={{ height: ITEM_H * 3, background: '#111827' }}>
      <div className="absolute inset-x-0 top-0 z-10 pointer-events-none" style={{ height: ITEM_H, background: 'linear-gradient(to bottom, #111827 30%, transparent)' }} />
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none" style={{ height: ITEM_H, background: 'linear-gradient(to top, #111827 30%, transparent)' }} />
      <div className="absolute inset-x-0 z-0 pointer-events-none border-y border-yellow-400/40" style={{ top: ITEM_H, height: ITEM_H, background: 'rgba(250,204,21,0.06)' }} />
      <div
        style={{ transform: `translateY(${y}px)`, transition: running ? 'transform 2.4s cubic-bezier(0.05,0.9,0.15,1)' : 'none', willChange: 'transform' }}
        onTransitionEnd={e => { if (e.propertyName === 'transform') finish() }}
      >
        {items.map((item, i) => <ReelItem key={i} pair={item} />)}
      </div>
    </div>
  )
}

const GROUP_META = [
  { key: 'GK',  label: 'GK' },
  { key: 'DEF', label: 'DEF' },
  { key: 'MID', label: 'MID' },
  { key: 'ATT', label: 'ATT' },
]

function LiveBreakdown({ slots, filledCount }) {
  const groups = useMemo(() => calculateGroupScores(slots), [slots])
  const overall = useMemo(() => calculateTeamScore(slots), [slots])

  function barCls(v) {
    if (v == null) return 'bg-gray-700'
    if (v > 80) return 'bg-green-400'
    if (v <= 50) return 'bg-red-500'
    return 'bg-yellow-400'
  }
  function textCls(v) {
    if (v == null) return 'text-gray-600'
    if (v > 80) return 'text-green-400'
    if (v <= 50) return 'text-red-500'
    return 'text-yellow-400'
  }

  return (
    <div className="bg-gray-800 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs uppercase tracking-widest text-gray-500">Live Ratings</p>
        <span className={`text-xs font-extrabold ${textCls(overall)}`}>{filledCount === 11 ? overall : `${filledCount}/11`}</span>
      </div>
      <div className="space-y-1.5">
        {GROUP_META.map(({ key, label }) => {
          const val = groups[key]
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-gray-500 w-6 shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barCls(val)}`}
                  style={{ width: val != null ? `${val}%` : '0%' }}
                />
              </div>
              <span className={`text-[10px] font-bold w-5 text-right tabular-nums shrink-0 ${textCls(val)}`}>
                {val ?? '—'}
              </span>
            </div>
          )
        })}
        {/* Overall */}
        <div className="flex items-center gap-2 pt-1 border-t border-gray-700">
          <span className="text-[10px] font-bold text-gray-400 w-6 shrink-0">OVR</span>
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${barCls(filledCount > 0 ? overall : null)}`}
              style={{ width: filledCount > 0 ? `${overall}%` : '0%' }}
            />
          </div>
          <span className={`text-[10px] font-bold w-5 text-right tabular-nums shrink-0 ${textCls(filledCount > 0 ? overall : null)}`}>
            {filledCount > 0 ? overall : '—'}
          </span>
        </div>
      </div>
    </div>
  )
}

// Substitutes bench — 5 slots shown in the sidebar. Reuses the same place /
// pick-up / move-swap interaction model as the pitch, driven by the shared
// target-id arrays from DraftScreen.
function BenchPanel({
  benchSlots, phase, compatibleSlotIds, moveTargetIds, swapMoveTargetIds,
  movingSlotId, canMove, onPlace, onSelectForMove, onMoveTo,
}) {
  const filled = benchSlots.filter(s => s.player).length
  const isPlacing = phase === 'placing'
  const isIdle = phase === 'idle'
  const moving = movingSlotId != null

  return (
    <div className="bg-gray-800 rounded-xl p-3">
      <p className="text-xs uppercase tracking-widest text-gray-500 mb-2">
        Substitutes <span className="text-gray-600">{filled}/{benchSlots.length}</span>
      </p>
      <div className="grid grid-cols-5 gap-2">
        {benchSlots.map(slot => {
          if (!slot.player) {
            const placeable = isPlacing && compatibleSlotIds.includes(slot.id)
            const moveable = isIdle && moving && moveTargetIds.includes(slot.id)
            const clickable = placeable || moveable
            return (
              <button
                key={slot.id}
                disabled={!clickable}
                onClick={() => { if (placeable) onPlace?.(slot.id); else if (moveable) onMoveTo?.(slot.id) }}
                className={`aspect-square rounded-full border-2 border-dashed flex items-center justify-center text-[9px] font-extrabold transition-all ${
                  clickable
                    ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400 animate-pulse'
                    : 'border-white/20 text-white/40'
                }`}
              >
                SUB
              </button>
            )
          }
          const isMovingSelf = isIdle && slot.id === movingSlotId
          const selectable = isIdle && canMove && !moving
          const swapTarget = isIdle && moving && !isMovingSelf && swapMoveTargetIds.includes(slot.id)
          const clickable = isMovingSelf || selectable || swapTarget
          const dimmed = moving && !isMovingSelf && !swapTarget
          return (
            <button
              key={slot.id}
              disabled={!clickable}
              onClick={() => { if (swapTarget) onMoveTo?.(slot.id); else if (isMovingSelf || selectable) onSelectForMove?.(slot.id) }}
              title={slot.player.name}
              className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all ${
                isMovingSelf ? 'border-yellow-400 ring-2 ring-yellow-400/60 animate-pulse'
                  : swapTarget ? 'border-cyan-400 ring-2 ring-cyan-400/60 animate-pulse'
                    : dimmed ? 'border-white/40 opacity-40'
                      : 'border-white'
              }`}
            >
              <FlagImg nation={slot.player.nation} className="w-full h-full object-cover" />
              <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] font-bold leading-tight truncate text-center px-0.5">
                {slot.player.name.split(' ').pop()}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function DraftScreen({ config, onComplete }) {
  // Daily challenges carry a `difficulty` (classic/expert/hardcore) that drives
  // the draft rules, while config.mode stays 'daily' for leaderboard/streak.
  const mode = config.difficulty || config.mode
  const competition = config.competition || 'wc'
  const pool = useMemo(() => poolFor(competition), [competition])
  const pairs = useMemo(() => buildPairs(pool), [pool])
  const isHardcore = mode === 'hardcore'
  const isClassic = mode === 'classic'
  const maxSkips = SKIPS_BY_MODE[mode] ?? 3
  const subCount = SUBS_BY_MODE[mode] ?? 0
  const formationDef = formations[config.formation]
  // Substitutes bench — count varies by mode (expert/hardcore have none).
  const benchTemplate = Array.from({ length: subCount }, (_, i) => ({
    id: `SUB${i + 1}`, position: 'SUB', group: 'SUB',
  }))
  const initialSlots = [
    ...formationDef.slots.map(s => ({ ...s, player: null })),
    ...benchTemplate.map(s => ({ ...s, player: null })),
  ]

  const [slots, setSlots] = useState(initialSlots)
  const [spinQueue] = useState(() =>
    config.seed ? seededShuffle(pairs, config.seed) : shuffle(pairs)
  )
  const [spinIndex, setSpinIndex] = useState(0)
  // phases: idle | spinning | picking | placing
  const [phase, setPhase] = useState('idle')
  const [currentPair, setCurrentPair] = useState(null)
  const [squad, setSquad] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [reelKey, setReelKey] = useState(0)
  const [skipsLeft, setSkipsLeft] = useState(maxSkips)
  // Idle-phase free rearrange: slot id of the placed player picked up to move.
  const [movingSlotId, setMovingSlotId] = useState(null)
  // Hardcore: pre-assigned slot for this spin
  const [assignedSlot, setAssignedSlot] = useState(() =>
    isHardcore ? pickRandom(initialSlots) : null
  )

  const starterSlots = slots.filter(s => !isBench(s))
  const benchSlots = slots.filter(isBench)
  const startersFilled = starterSlots.filter(s => s.player).length
  const benchFilled = benchSlots.filter(s => s.player).length
  const xiComplete = startersFilled === 11
  const allFull = slots.every(s => s.player)

  // Hardcore keeps the original auto-start; classic/expert wait for the
  // "Play the Cup" confirm button so the player can add subs / rearrange first.
  useEffect(() => {
    if (isHardcore && startersFilled === 11) {
      setTimeout(() => onComplete(slots, maxSkips - skipsLeft), 600)
    }
  }, [startersFilled])

  function confirmAndPlay() {
    if (!xiComplete) return
    // The cup is played by the starting XI only — bench is never passed on.
    onComplete(starterSlots, maxSkips - skipsLeft)
  }

  function getEmptySlots(currentSlots = slots) {
    return currentSlots.filter(s => !s.player)
  }
  function getEmptyPitchSlots(currentSlots = slots) {
    return currentSlots.filter(s => !s.player && !isBench(s))
  }

  // Names already on the pitch — used to prevent duplicate players
  const placedNames = new Set(slots.filter(s => s.player).map(s => s.player.name))

  function doSpin() {
    if (phase !== 'idle') return
    if (isHardcore && !assignedSlot) return
    setMovingSlotId(null)
    playSpin()
    const pair = spinQueue[spinIndex % spinQueue.length]
    setCurrentPair(pair)
    setPhase('spinning')
    setReelKey(k => k + 1)
  }

  function handleSpinDone() {
    if (!currentPair || phase === 'picking') return  // already resolved
    const squadPool = pool.filter(
      p => p.nation === currentPair.nation &&
           p.year === currentPair.year &&
           p.tournament === currentPair.tournament &&
           !placedNames.has(p.name)   // no duplicate players across eras
    )

    let available
    if (isHardcore) {
      // Show players that can play in the assigned position (0.85+), fall back to all if none
      const compatible = squadPool.filter(p => getFitMultiplier(assignedSlot.position, p.positions) >= 0.85)
      available = compatible.length > 0 ? compatible : squadPool
    } else if (benchSlots.some(s => !s.player)) {
      // While any substitute slot is open, every player is pickable — anyone
      // can take a bench spot regardless of position.
      available = squadPool
    } else {
      const emptyPitch = getEmptyPitchSlots()
      available = squadPool.filter(p =>
        emptyPitch.some(s => getFitMultiplier(s.position, p.positions) >= 0.85) ||
        // Classic: also offer players who fit a taken slot whose occupant can move.
        (isClassic && slots.some(s => s.player
          && getFitMultiplier(s.position, p.positions) >= 0.85
          && relocationSlotFor(s.player, s.id))),
      )
    }

    const blindMode = isHardcore || mode === 'expert'
    setSquad(available.sort((a, b) =>
      blindMode ? a.name.localeCompare(b.name) : b.overall - a.overall
    ))
    setPhase('picking')
  }

  function pickPlayer(player) {
    if (phase !== 'picking') return  // guard against stray double-tap
    if (isHardcore) {
      playPlace()
      // Auto-place in assigned slot, pick next assigned slot
      const nextSlots = slots.map(s =>
        s.id === assignedSlot.id ? { ...s, player } : s
      )
      setSlots(nextSlots)
      setSpinIndex(i => i + 1)
      setCurrentPair(null)
      setSquad([])
      const empties = getEmptySlots(nextSlots)
      setAssignedSlot(empties.length > 0 ? pickRandom(empties) : null)
      setPhase('idle')
    } else {
      playPick()
      setSelectedPlayer(player)
      // keep squad so the user can go back and pick someone else for free
      setPhase('placing')
    }
  }

  function backToPicking() {
    setSelectedPlayer(null)
    setPhase('picking')
  }

  function placePlayer(slotId) {
    if (phase !== 'placing' || !selectedPlayer) return  // guard double-tap
    const target = slots.find(s => s.id === slotId)
    if (!target || target.player) return  // slot already filled
    playPlace()
    const nextSlots = slots.map(s =>
      s.id === slotId ? { ...s, player: selectedPlayer } : s
    )
    setSlots(nextSlots)
    setSpinIndex(i => i + 1)
    setCurrentPair(null)
    setSquad([])
    setSelectedPlayer(null)
    setPhase('idle')
  }

  // Best empty slot an existing player could move to (Classic swap feature).
  function relocationSlotFor(player, excludeId, currentSlots = slots) {
    return currentSlots
      .filter(s => !s.player && s.id !== excludeId && getFitMultiplier(s.position, player.positions) >= 0.85)
      .sort((a, b) => getFitMultiplier(b.position, player.positions) - getFitMultiplier(a.position, player.positions))[0] || null
  }

  // Classic only: place the spun player into an already-filled slot, moving the
  // current occupant to another position they can play. Consumes the spin like a
  // normal placement (no free re-roll).
  function swapIntoSlot(slotId) {
    if (phase !== 'placing' || !selectedPlayer || !isClassic) return
    const target = slots.find(s => s.id === slotId)
    if (!target || !target.player) return
    if (getFitMultiplier(target.position, selectedPlayer.positions) < 0.85) return
    const dest = relocationSlotFor(target.player, target.id)
    if (!dest) return
    playPlace()
    const occupant = target.player
    const nextSlots = slots.map(s => {
      if (s.id === target.id) return { ...s, player: selectedPlayer }
      if (s.id === dest.id) return { ...s, player: occupant }
      return s
    })
    setSlots(nextSlots)
    setSpinIndex(i => i + 1)
    setCurrentPair(null)
    setSquad([])
    setSelectedPlayer(null)
    setPhase('idle')
  }

  // Idle-phase rearrange. Tapping a placed player picks it up; tapping it again
  // (or Cancel) puts it back down. No spin/hardcore.
  function selectForMove(slotId) {
    if (phase !== 'idle' || isHardcore) return
    const target = slots.find(s => s.id === slotId)
    if (!target || !target.player) return
    setMovingSlotId(prev => (prev === slotId ? null : slotId))
  }

  function cancelMove() {
    setMovingSlotId(null)
  }

  // Move/swap the picked-up player. Tapping an empty slot moves them there;
  // tapping another placed player swaps the two (each must be eligible for the
  // other's slot). Pure rearrangement — never consumes a skip, idle phase only.
  function moveToSlot(destId) {
    if (phase !== 'idle' || !movingSlotId) return
    const src = slots.find(s => s.id === movingSlotId)
    const dest = slots.find(s => s.id === destId)
    if (!src || !src.player || !dest || dest.id === src.id) return

    if (!dest.player) {
      // Move into an empty slot.
      if (!eligible(dest, src.player)) return
      playPlace()
      const player = src.player
      setSlots(prev => prev.map(s => {
        if (s.id === src.id) return { ...s, player: null }
        if (s.id === dest.id) return { ...s, player }
        return s
      }))
    } else {
      // Swap two placed players — both must fit the other's slot.
      if (!eligible(dest, src.player) || !eligible(src, dest.player)) return
      playPlace()
      const a = src.player, b = dest.player
      setSlots(prev => prev.map(s => {
        if (s.id === src.id) return { ...s, player: b }
        if (s.id === dest.id) return { ...s, player: a }
        return s
      }))
    }
    setMovingSlotId(null)
  }

  // Removing a player to spin again is a re-roll, so it still costs a skip —
  // otherwise you could place, remove, and re-spin indefinitely, bypassing the
  // skip limit. No removal in hardcore.
  function removeMovingPlayer() {
    if (phase !== 'idle' || !movingSlotId || isHardcore || skipsLeft <= 0) return
    const id = movingSlotId
    setMovingSlotId(null)
    setSkipsLeft(n => n - 1)
    setSlots(prev => prev.map(s => s.id === id ? { ...s, player: null } : s))
  }

  function skipSpin() {
    if (isHardcore || skipsLeft <= 0) return
    setSkipsLeft(n => n - 1)
    setSpinIndex(i => i + 1)
    setCurrentPair(null)
    setSquad([])
    setSelectedPlayer(null)
    setPhase('idle')
  }

  // Free re-spin when a spun squad has no eligible player — not a voluntary
  // skip, so it never costs a skip and is always available (prevents soft-lock).
  function reSpinFree() {
    setSpinIndex(i => i + 1)
    setCurrentPair(null)
    setSquad([])
    setSelectedPlayer(null)
    setPhase('idle')
  }

  const compatibleSlotIds = selectedPlayer
    ? slots.filter(s => !s.player && eligible(s, selectedPlayer)).map(s => s.id)
    : []

  // Idle rearrange: the picked-up player, the open slots it can move to, and the
  // placed players it can swap with (each must fit the other's slot).
  const movingSlot = movingSlotId ? slots.find(s => s.id === movingSlotId) : null
  const movingPlayer = movingSlot?.player || null
  const moveTargetIds = movingPlayer
    ? slots.filter(s => !s.player && eligible(s, movingPlayer)).map(s => s.id)
    : []
  const swapMoveTargetIds = movingPlayer
    ? slots.filter(s => s.player && s.id !== movingSlotId
        && eligible(s, movingPlayer) && eligible(movingSlot, s.player)).map(s => s.id)
    : []
  const canMove = phase === 'idle' && !isHardcore

  // Filled slots the spun player can take, where the current occupant can move
  // to another position they play (Classic mode only).
  const swapSlotIds = (isClassic && phase === 'placing' && selectedPlayer)
    ? slots.filter(s => s.player
        && getFitMultiplier(s.position, selectedPlayer.positions) >= 0.85
        && relocationSlotFor(s.player, s.id)
      ).map(s => s.id)
    : []

  const btnCls = isHardcore
    ? 'bg-red-500 hover:bg-red-400 text-white'
    : 'bg-yellow-400 hover:bg-yellow-300 text-gray-900'

  return (
    <div className="flex flex-col lg:flex-row min-h-screen lg:h-screen lg:overflow-hidden">
      {/* Sidebar */}
      <div className="order-2 lg:order-1 lg:w-80 xl:w-96 bg-gray-900 flex flex-col p-4 gap-4 lg:overflow-y-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-white">🏆 Lift the Trophy</h1>
          <div className="flex items-center gap-2">
            {!isHardcore && (
              <span className="text-xs text-gray-500">
                {skipsLeft > 0
                  ? `${skipsLeft} skip${skipsLeft !== 1 ? 's' : ''} left`
                  : 'No skips left'}
              </span>
            )}
            {isHardcore && <span className="text-xs text-red-400 font-bold">💀 HARDCORE</span>}
            <span className="text-sm text-gray-400">
              {startersFilled}/11{benchSlots.length > 0 && benchFilled > 0 && <span className="text-gray-600"> · {benchFilled} sub{benchFilled !== 1 ? 's' : ''}</span>}
            </span>
          </div>
        </div>

        {/* Spin / reel panel */}
        <div className="bg-gray-800 rounded-xl p-4">
          {phase === 'idle' && !movingSlotId && (
            <>
              {isHardcore && assignedSlot && (
                <div className="text-center mb-3">
                  <span className="text-xs uppercase tracking-widest text-gray-500">Position assigned</span>
                  <div className={`inline-block ml-2 px-2 py-0.5 rounded text-sm font-extrabold text-red-400 border border-red-500/40 bg-red-500/10`}>
                    {assignedSlot.position}
                  </div>
                </div>
              )}
              {!allFull && (
                <button
                  onClick={doSpin}
                  className={`w-full py-3 rounded-xl disabled:opacity-40 font-extrabold text-base transition-colors ${btnCls}`}
                >
                  {isHardcore && assignedSlot
                    ? `Spin for ${assignedSlot.position} 💀`
                    : xiComplete ? 'Spin ⚽ — add a sub' : 'Spin ⚽'}
                </button>
              )}
              {!isHardcore && xiComplete && (
                <button
                  onClick={confirmAndPlay}
                  className="w-full mt-2 py-3 rounded-xl font-extrabold text-base bg-green-500 hover:bg-green-400 text-white transition-colors"
                >
                  ▶ Play the Cup
                </button>
              )}
              {!isHardcore && startersFilled > 0 && (
                <p className="text-center text-gray-500 text-xs mt-2">
                  {xiComplete
                    ? 'Tap a player to swap, or add subs before kick-off'
                    : 'Tap a player on the pitch to move or swap them'}
                </p>
              )}
            </>
          )}

          {phase === 'idle' && movingSlotId && movingPlayer && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-gray-500 text-center">Move player</p>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <span className="w-7 h-5 rounded overflow-hidden inline-flex shadow shrink-0"><FlagImg nation={movingPlayer.nation} className="w-full h-full object-cover" /></span>
                  <span className="text-white font-bold text-sm">{movingPlayer.name}</span>
                </div>
                <div className="text-gray-400 text-xs mt-0.5">{getPlayablePositions(movingPlayer.positions).join(' / ')} · OVR {movingPlayer.overall}</div>
              </div>
              {moveTargetIds.length > 0 || swapMoveTargetIds.length > 0 ? (
                <p className="text-yellow-400 text-xs text-center">
                  Tap an open slot to move, or a highlighted player to swap — free, no skip.
                </p>
              ) : (
                <p className="text-red-400 text-xs text-center">No slots or players this one can move to.</p>
              )}
              <div className="flex gap-2">
                {!isHardcore && skipsLeft > 0 && (
                  <button
                    onClick={removeMovingPlayer}
                    className="flex-1 py-2 rounded-lg border border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs font-bold transition-colors"
                  >
                    Remove (1 skip)
                  </button>
                )}
                <button
                  onClick={cancelMove}
                  className="flex-1 py-2 rounded-lg border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-xs transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {phase === 'spinning' && currentPair && (
            <SlotReel key={reelKey} finalPair={currentPair} allPairs={pairs} onDone={handleSpinDone} />
          )}

          {(phase === 'picking' || phase === 'placing') && currentPair && (
            <div className="text-center py-1">
              <div className="flex justify-center"><span className="w-10 h-7 rounded overflow-hidden inline-flex shadow"><FlagImg nation={currentPair.nation} className="w-full h-full object-cover" /></span></div>
              <div className="text-white font-bold text-sm">{currentPair.nation}</div>
              <div className="text-yellow-400 text-xs">
                {periodLabel(currentPair)}
              </div>
              {isHardcore && assignedSlot && (
                <div className="mt-1 text-xs text-red-400 font-bold">Must fill: {assignedSlot.position}</div>
              )}
            </div>
          )}
        </div>

        {/* Picking phase — squad list */}
        {phase === 'picking' && (
          <div className="flex-1 overflow-y-auto lg:min-h-0 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-gray-500">
                {isHardcore ? `Pick for ${assignedSlot?.position}` : 'Pick a player'}
              </p>
              {!isHardcore && skipsLeft > 0 && (
                <button
                  onClick={skipSpin}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Skip ({skipsLeft} left) →
                </button>
              )}
              {!isHardcore && skipsLeft === 0 && (
                <span className="text-xs text-gray-600">No skips left</span>
              )}
            </div>

            {squad.length === 0 && (
              <div className="bg-gray-800 rounded-xl p-4 text-center text-gray-400 text-sm">
                No eligible players from this squad for your remaining {isHardcore ? 'position' : 'slots'}.
                <button onClick={reSpinFree} className="block mx-auto mt-3 px-4 py-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold text-xs">
                  Spin again (free) ⚽
                </button>
                <p className="text-gray-600 text-[10px] mt-2">Free re-spin — doesn't use a skip</p>
              </div>
            )}

            {squad.map((player, i) => {
              const targetSlots = isHardcore ? [assignedSlot] : getEmptyPitchSlots()
              const bestFit = targetSlots.reduce((best, s) => {
                const m = getFitMultiplier(s.position, player.positions)
                return m > best.mult ? { mult: m, pos: s.position } : best
              }, { mult: 0, pos: '' })
              // No eligible empty pitch slot → this player can only be a sub.
              const benchOnly = !isHardcore && bestFit.mult < 0.85
              const fitCls = benchOnly ? 'text-green-400' : bestFit.mult === 1.0 ? 'text-green-400' : bestFit.mult >= 0.85 ? 'text-yellow-400' : 'text-orange-400'
              const fitLabel = benchOnly ? 'Sub' : bestFit.mult === 1.0 ? 'Natural' : bestFit.mult >= 0.85 ? 'Compatible' : 'Off-pos'
              return (
                <PlayerPickCard
                  key={i}
                  player={player}
                  fitLabel={fitLabel}
                  fitCls={fitCls}
                  onClick={() => pickPlayer(player)}
                  hideStats={isHardcore || mode === 'expert'}
                />
              )
            })}
          </div>
        )}

        {/* Placing phase */}
        {phase === 'placing' && selectedPlayer && (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-2 text-center">
                {getEmptyPitchSlots().length === 0 ? 'Tap a sub slot to bench' : 'Tap a slot on the pitch'}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-7 h-5 rounded overflow-hidden inline-flex shadow shrink-0"><FlagImg nation={selectedPlayer.nation} className="w-full h-full object-cover" /></span>
                    <span className="text-white font-bold text-sm">{selectedPlayer.name}</span>
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5">{getPlayablePositions(selectedPlayer.positions).join(' / ')} · OVR {selectedPlayer.overall}</div>
                </div>
              </div>
              {compatibleSlotIds.length === 0 && (
                <p className="text-red-400 text-xs mt-2 text-center">No compatible empty slots remaining.</p>
              )}
            </div>
            <button
              onClick={backToPicking}
              className="w-full py-2 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm transition-colors"
            >
              ← Back to players
            </button>
          </div>
        )}

        {/* Substitutes bench */}
        {benchSlots.length > 0 && (
          <BenchPanel
            benchSlots={benchSlots}
            phase={phase}
            compatibleSlotIds={compatibleSlotIds}
            moveTargetIds={moveTargetIds}
            swapMoveTargetIds={swapMoveTargetIds}
            movingSlotId={movingSlotId}
            canMove={canMove}
            onPlace={placePlayer}
            onSelectForMove={selectForMove}
            onMoveTo={moveToSlot}
          />
        )}

        {/* Live team breakdown */}
        {startersFilled > 0 && phase !== 'spinning' && (
          <LiveBreakdown slots={starterSlots} filledCount={startersFilled} />
        )}
      </div>

      {/* Pitch */}
      <div className="order-1 lg:order-2 sticky top-0 z-20 self-start w-full h-[44vh] lg:h-auto lg:static lg:self-auto lg:flex-1 flex items-center justify-center p-3 lg:p-4 bg-gray-950">
        <PitchView
          slots={starterSlots}
          phase={phase}
          compatibleSlotIds={compatibleSlotIds}
          assignedSlotId={isHardcore && phase === 'idle' ? assignedSlot?.id : null}
          onPlacePlayer={placePlayer}
          swapSlotIds={swapSlotIds}
          onSwap={swapIntoSlot}
          canMove={canMove}
          movingSlotId={movingSlotId}
          moveTargetIds={moveTargetIds}
          swapMoveTargetIds={swapMoveTargetIds}
          onSelectForMove={selectForMove}
          onMoveTo={moveToSlot}
        />
      </div>
    </div>
  )
}
