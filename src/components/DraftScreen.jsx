import { useState, useEffect } from 'react'
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
    if (!seen.has(key)) {
      seen.add(key)
      pairs.push({ nation: p.nation, year: p.year, tournament: p.tournament })
    }
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

const ALL_PAIRS = buildPairs()
const ITEM_H = 60

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
  const formationDef = formations[config.formation]
  const [slots, setSlots] = useState(formationDef.slots.map(s => ({ ...s, player: null })))
  const [spinQueue] = useState(() => shuffle(ALL_PAIRS))
  const [spinIndex, setSpinIndex] = useState(0)
  // phases: idle | spinning | picking | placing
  const [phase, setPhase] = useState('idle')
  const [currentPair, setCurrentPair] = useState(null)
  const [squad, setSquad] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [reelKey, setReelKey] = useState(0)

  const filledCount = slots.filter(s => s.player).length

  useEffect(() => {
    if (filledCount === 11) setTimeout(() => onComplete(slots), 600)
  }, [filledCount])

  function doSpin() {
    if (phase !== 'idle' || spinIndex >= spinQueue.length) return
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
    const emptySlots = slots.filter(s => !s.player)
    const available = pool.filter(p =>
      emptySlots.some(s => getFitMultiplier(s.position, p.positions) >= 0.6)
    )
    setSquad(available.sort((a, b) => b.overall - a.overall))
    setPhase('picking')
  }

  function pickPlayer(player) {
    setSelectedPlayer(player)
    setSquad([])
    setPhase('placing')
  }

  function placePlayer(slotId) {
    setSlots(prev => {
      const updated = [...prev]
      const idx = updated.findIndex(s => s.id === slotId)
      if (idx !== -1) updated[idx] = { ...updated[idx], player: selectedPlayer }
      return updated
    })
    setSpinIndex(i => i + 1)
    setCurrentPair(null)
    setSelectedPlayer(null)
    setPhase('idle')
  }

  function skipSpin() {
    setSpinIndex(i => i + 1)
    setCurrentPair(null)
    setSquad([])
    setSelectedPlayer(null)
    setPhase('idle')
  }

  // Which empty slots are compatible with the selected player
  const compatibleSlotIds = selectedPlayer
    ? slots.filter(s => !s.player && getFitMultiplier(s.position, selectedPlayer.positions) >= 0.6).map(s => s.id)
    : []

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Sidebar */}
      <div className="lg:w-80 xl:w-96 bg-gray-900 flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-white">🏆 Lift the Trophy</h1>
          <span className="text-sm text-gray-400">{filledCount}/11</span>
        </div>

        {/* Spin / Reel area */}
        <div className="bg-gray-800 rounded-xl p-4">
          {phase === 'idle' && (
            <button
              onClick={doSpin}
              disabled={filledCount === 11}
              className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-extrabold text-base transition-colors"
            >
              Spin ⚽
            </button>
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
            </div>
          )}
        </div>

        {/* Picking phase — squad list */}
        {phase === 'picking' && (
          <div className="flex-1 overflow-y-auto space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-gray-500">Pick a player</p>
              <button onClick={skipSpin} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Skip →</button>
            </div>
            {squad.length === 0 && (
              <div className="bg-gray-800 rounded-xl p-4 text-center text-gray-400 text-sm">
                No eligible players from this squad.
                <button onClick={skipSpin} className="block mx-auto mt-3 px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-xs">
                  Spin Again
                </button>
              </div>
            )}
            {squad.map((player, i) => {
              const emptySlots = slots.filter(s => !s.player)
              const bestFit = emptySlots.reduce((best, s) => {
                const m = getFitMultiplier(s.position, player.positions)
                return m > best.mult ? { mult: m, pos: s.position } : best
              }, { mult: 0, pos: '' })
              const fitCls = bestFit.mult === 1.0 ? 'text-green-400' : bestFit.mult >= 0.85 ? 'text-yellow-400' : 'text-orange-400'
              const fitLabel = bestFit.mult === 1.0 ? 'Natural' : bestFit.mult >= 0.85 ? 'Compatible' : 'Off-pos'
              return (
                <button
                  key={i}
                  onClick={() => pickPlayer(player)}
                  className="w-full text-left bg-gray-800 hover:bg-gray-700 rounded-xl p-3 transition-colors"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-white text-sm">{player.name}</span>
                    <span className="text-yellow-400 font-bold text-sm">{player.overall}</span>
                  </div>
                  <div className="flex gap-2 mt-1 text-xs text-gray-400">
                    <span>{player.positions.join('/')}</span>
                    <span className={fitCls}>• {fitLabel} ({bestFit.pos})</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Placing phase — instruction + selected player */}
        {phase === 'placing' && selectedPlayer && (
          <div className="space-y-3">
            <div className="bg-gray-800 rounded-xl p-4">
              <p className="text-xs uppercase tracking-widest text-gray-500 mb-2 text-center">Now tap a slot on the pitch</p>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-bold text-sm">{selectedPlayer.name}</div>
                  <div className="text-gray-400 text-xs">{selectedPlayer.positions.join(' / ')} · OVR {selectedPlayer.overall}</div>
                </div>
                <div className="text-2xl">{FLAG_MAP[currentPair?.nation] || '⚽'}</div>
              </div>
              {compatibleSlotIds.length === 0 && (
                <p className="text-red-400 text-xs mt-2 text-center">No compatible empty slots — all positions taken.</p>
              )}
            </div>
            <button onClick={skipSpin} className="w-full py-2 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm transition-colors">
              Cancel &amp; spin again
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
          onPlacePlayer={placePlayer}
        />
      </div>
    </div>
  )
}
