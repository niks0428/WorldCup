import { useState, useEffect } from 'react'
import { seededShuffle } from '../lib/seededRandom'
import wcNew from '../data/players_wc_new.json'
import wcOld from '../data/players_wc_old.json'
import euroA from '../data/players_euro_a.json'
import euroB from '../data/players_euro_b.json'
import formations from '../data/formations.json'
import { filterSquadForSlot, getFitMultiplier } from '../utils/compatibility'
import PitchView from './PitchView'

const allPlayers = [...wcNew, ...wcOld, ...euroA, ...euroB]

export const FLAG_MAP = {
  Brazil: '🇧🇷', Argentina: '🇦🇷', France: '🇫🇷', Germany: '🇩🇪',
  'West Germany': '🇩🇪', Spain: '🇪🇸', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Portugal: '🇵🇹',
  Italy: '🇮🇹', Netherlands: '🇳🇱', Croatia: '🇭🇷', Uruguay: '🇺🇾',
  Belgium: '🇧🇪', Mexico: '🇲🇽', Senegal: '🇸🇳', Japan: '🇯🇵',
  Morocco: '🇲🇦', Australia: '🇦🇺', USSR: '🇷🇺', Russia: '🇷🇺',
  Yugoslavia: '🇷🇸', Serbia: '🇷🇸', Denmark: '🇩🇰', Sweden: '🇸🇪',
  'Czech Republic': '🇨🇿', Czechia: '🇨🇿', Turkey: '🇹🇷', Greece: '🇬🇷',
  Romania: '🇷🇴', Bulgaria: '🇧🇬', 'South Korea': '🇰🇷', Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  Iceland: '🇮🇸', Switzerland: '🇨🇭', Ukraine: '🇺🇦', Austria: '🇦🇹',
  Slovakia: '🇸🇰', Colombia: '🇨🇴', Ghana: '🇬🇭', USA: '🇺🇸',
  Cameroon: '🇨🇲', Algeria: '🇩🇿', Chile: '🇨🇱', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  Ireland: '🇮🇪', Poland: '🇵🇱', Hungary: '🇭🇺', Albania: '🇦🇱',
  Slovenia: '🇸🇮', Georgia: '🇬🇪', 'North Macedonia': '🇲🇰',
}

function buildPairs() {
  const seen = new Set()
  const pairs = []
  for (const p of allPlayers) {
    const key = `${p.nation}|${p.year}|${p.tournament}`
    if (!seen.has(key)) { seen.add(key); pairs.push({ nation: p.nation, year: p.year, tournament: p.tournament }) }
  }
  return pairs
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

const ALL_PAIRS = buildPairs()
const ITEM_H = 60
const MAX_SKIPS = 3

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
            <span className="text-base shrink-0">{FLAG_MAP[player.nation] || '🏴'}</span>
            <span className="font-semibold text-white text-sm truncate">{player.name}</span>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {player.positions.join('/')}
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
  const flag = FLAG_MAP[pair.nation] || '🏴'
  const comp = pair.tournament === 'EURO' ? 'EURO' : 'WC'
  return (
    <div className="flex items-center justify-center gap-2 text-white font-bold select-none" style={{ height: ITEM_H }}>
      <span className="text-3xl">{flag}</span>
      <div className="text-center leading-tight">
        <div className="text-sm">{pair.nation}</div>
        <div className="text-xs font-normal text-yellow-400">{comp} {pair.year}</div>
      </div>
    </div>
  )
}

function SlotReel({ finalPair, onDone }) {
  const PRE = 28
  const [items] = useState(() => [...shuffle(ALL_PAIRS).slice(0, PRE), finalPair])
  const startY = ITEM_H
  const endY = -(PRE * ITEM_H) + ITEM_H
  const [y, setY] = useState(startY)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => { setRunning(true); setY(endY) })
    return () => cancelAnimationFrame(id)
  }, [])

  return (
    <div className="relative rounded-xl overflow-hidden border-2 border-yellow-400" style={{ height: ITEM_H * 3, background: '#111827' }}>
      <div className="absolute inset-x-0 top-0 z-10 pointer-events-none" style={{ height: ITEM_H, background: 'linear-gradient(to bottom, #111827 30%, transparent)' }} />
      <div className="absolute inset-x-0 bottom-0 z-10 pointer-events-none" style={{ height: ITEM_H, background: 'linear-gradient(to top, #111827 30%, transparent)' }} />
      <div className="absolute inset-x-0 z-0 pointer-events-none border-y border-yellow-400/40" style={{ top: ITEM_H, height: ITEM_H, background: 'rgba(250,204,21,0.06)' }} />
      <div
        style={{ transform: `translateY(${y}px)`, transition: running ? 'transform 2.4s cubic-bezier(0.05,0.9,0.15,1)' : 'none', willChange: 'transform' }}
        onTransitionEnd={onDone}
      >
        {items.map((item, i) => <ReelItem key={i} pair={item} />)}
      </div>
    </div>
  )
}

export default function DraftScreen({ config, onComplete }) {
  const isHardcore = config.mode === 'hardcore'
  const formationDef = formations[config.formation]
  const initialSlots = formationDef.slots.map(s => ({ ...s, player: null }))

  const [slots, setSlots] = useState(initialSlots)
  const [spinQueue] = useState(() =>
    config.seed ? seededShuffle(ALL_PAIRS, config.seed) : shuffle(ALL_PAIRS)
  )
  const [spinIndex, setSpinIndex] = useState(0)
  // phases: idle | spinning | picking | placing
  const [phase, setPhase] = useState('idle')
  const [currentPair, setCurrentPair] = useState(null)
  const [squad, setSquad] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [reelKey, setReelKey] = useState(0)
  const [skipsLeft, setSkipsLeft] = useState(MAX_SKIPS)
  // Hardcore: pre-assigned slot for this spin
  const [assignedSlot, setAssignedSlot] = useState(() =>
    isHardcore ? pickRandom(initialSlots) : null
  )

  const filledCount = slots.filter(s => s.player).length

  useEffect(() => {
    if (filledCount === 11) setTimeout(() => onComplete(slots), 600)
  }, [filledCount])

  function getEmptySlots(currentSlots = slots) {
    return currentSlots.filter(s => !s.player)
  }

  function doSpin() {
    if (phase !== 'idle' || spinIndex >= spinQueue.length) return
    if (isHardcore && !assignedSlot) return
    const pair = spinQueue[spinIndex]
    setCurrentPair(pair)
    setPhase('spinning')
    setReelKey(k => k + 1)
  }

  function handleSpinDone() {
    const pool = allPlayers.filter(
      p => p.nation === currentPair.nation &&
           p.year === currentPair.year &&
           p.tournament === currentPair.tournament
    )

    let available
    if (isHardcore) {
      // Show players that can play in the assigned position (0.85+), fall back to all if none
      const compatible = pool.filter(p => getFitMultiplier(assignedSlot.position, p.positions) >= 0.85)
      available = compatible.length > 0 ? compatible : pool
    } else if (config.mode === 'expert') {
      const empties = getEmptySlots()
      available = pool.filter(p => empties.some(s => getFitMultiplier(s.position, p.positions) >= 0.85))
    } else {
      const empties = getEmptySlots()
      available = pool.filter(p => empties.some(s => getFitMultiplier(s.position, p.positions) >= 0.85))
    }

    const blindMode = isHardcore || config.mode === 'expert'
    setSquad(available.sort((a, b) =>
      blindMode ? a.name.localeCompare(b.name) : b.overall - a.overall
    ))
    setPhase('picking')
  }

  function pickPlayer(player) {
    if (isHardcore) {
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
      setSelectedPlayer(player)
      setSquad([])
      setPhase('placing')
    }
  }

  function placePlayer(slotId) {
    const nextSlots = slots.map(s =>
      s.id === slotId ? { ...s, player: selectedPlayer } : s
    )
    setSlots(nextSlots)
    setSpinIndex(i => i + 1)
    setCurrentPair(null)
    setSelectedPlayer(null)
    setPhase('idle')
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

  const compatibleSlotIds = selectedPlayer
    ? slots.filter(s => !s.player && getFitMultiplier(s.position, selectedPlayer.positions) >= 0.85).map(s => s.id)
    : []

  const accentCls = isHardcore ? 'border-red-500 bg-red-500/10' : 'border-yellow-400 bg-yellow-400/10'
  const btnCls = isHardcore
    ? 'bg-red-500 hover:bg-red-400 text-white'
    : 'bg-yellow-400 hover:bg-yellow-300 text-gray-900'

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Sidebar */}
      <div className="lg:w-80 xl:w-96 bg-gray-900 flex flex-col p-4 gap-4">
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
            <span className="text-sm text-gray-400">{filledCount}/11</span>
          </div>
        </div>

        {/* Spin / reel panel */}
        <div className="bg-gray-800 rounded-xl p-4">
          {phase === 'idle' && (
            <>
              {isHardcore && assignedSlot && (
                <div className="text-center mb-3">
                  <span className="text-xs uppercase tracking-widest text-gray-500">Position assigned</span>
                  <div className={`inline-block ml-2 px-2 py-0.5 rounded text-sm font-extrabold text-red-400 border border-red-500/40 bg-red-500/10`}>
                    {assignedSlot.position}
                  </div>
                </div>
              )}
              <button
                onClick={doSpin}
                disabled={filledCount === 11}
                className={`w-full py-3 rounded-xl disabled:opacity-40 font-extrabold text-base transition-colors ${btnCls}`}
              >
                {isHardcore && assignedSlot
                  ? `Spin for ${assignedSlot.position} 💀`
                  : 'Spin ⚽'}
              </button>
            </>
          )}

          {phase === 'spinning' && currentPair && (
            <SlotReel key={reelKey} finalPair={currentPair} onDone={handleSpinDone} />
          )}

          {(phase === 'picking' || phase === 'placing') && currentPair && (
            <div className="text-center py-1">
              <div className="text-2xl">{FLAG_MAP[currentPair.nation] || '🏴'}</div>
              <div className="text-white font-bold text-sm">{currentPair.nation}</div>
              <div className="text-yellow-400 text-xs">
                {currentPair.tournament === 'EURO' ? 'EURO' : 'WC'} {currentPair.year}
              </div>
              {isHardcore && assignedSlot && (
                <div className="mt-1 text-xs text-red-400 font-bold">Must fill: {assignedSlot.position}</div>
              )}
            </div>
          )}
        </div>

        {/* Picking phase — squad list */}
        {phase === 'picking' && (
          <div className="flex-1 overflow-y-auto space-y-2">
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
                No eligible players from this squad.
                {!isHardcore && skipsLeft > 0 && (
                  <button onClick={skipSpin} className="block mx-auto mt-3 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs">
                    Skip ({skipsLeft} left)
                  </button>
                )}
              </div>
            )}

            {squad.map((player, i) => {
              const empties = getEmptySlots()
              const targetSlots = isHardcore ? [assignedSlot] : empties
              const bestFit = targetSlots.reduce((best, s) => {
                const m = getFitMultiplier(s.position, player.positions)
                return m > best.mult ? { mult: m, pos: s.position } : best
              }, { mult: 0, pos: '' })
              const fitCls = bestFit.mult === 1.0 ? 'text-green-400' : bestFit.mult >= 0.85 ? 'text-yellow-400' : 'text-orange-400'
              const fitLabel = bestFit.mult === 1.0 ? 'Natural' : bestFit.mult >= 0.85 ? 'Compatible' : 'Off-pos'
              return (
                <PlayerPickCard
                  key={i}
                  player={player}
                  fitLabel={fitLabel}
                  fitCls={fitCls}
                  onClick={() => pickPlayer(player)}
                  hideStats={isHardcore || config.mode === 'expert'}
                />
              )
            })}
          </div>
        )}

        {/* Placing phase */}
        {phase === 'placing' && selectedPlayer && (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-2 text-center">Tap a slot on the pitch</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg">{FLAG_MAP[selectedPlayer.nation] || '🏴'}</span>
                    <span className="text-white font-bold text-sm">{selectedPlayer.name}</span>
                  </div>
                  <div className="text-gray-400 text-xs mt-0.5">{selectedPlayer.positions.join(' / ')} · OVR {selectedPlayer.overall}</div>
                </div>
              </div>
              {compatibleSlotIds.length === 0 && (
                <p className="text-red-400 text-xs mt-2 text-center">No compatible empty slots remaining.</p>
              )}
            </div>
            <button
              onClick={skipSpin}
              disabled={skipsLeft <= 0}
              className="w-full py-2 rounded-xl border border-gray-700 hover:border-gray-500 disabled:opacity-30 disabled:cursor-not-allowed text-gray-400 hover:text-white text-sm transition-colors"
            >
              {skipsLeft > 0 ? `Cancel & skip (${skipsLeft} left)` : 'No skips left'}
            </button>
          </div>
        )}
      </div>

      {/* Pitch */}
      <div className="flex-1 flex items-center justify-center p-4 bg-gray-950">
        <PitchView
          slots={slots}
          phase={phase}
          compatibleSlotIds={compatibleSlotIds}
          assignedSlotId={isHardcore && phase === 'idle' ? assignedSlot?.id : null}
          onPlacePlayer={placePlayer}
        />
      </div>
    </div>
  )
}
