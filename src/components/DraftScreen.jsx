import { useState, useEffect, useRef } from 'react'
import wcNew from '../data/players_wc_new.json'
import wcOld from '../data/players_wc_old.json'
import euroA from '../data/players_euro_a.json'
import euroB from '../data/players_euro_b.json'
import formations from '../data/formations.json'

const allPlayers = [...wcNew, ...wcOld, ...euroA, ...euroB]
import { filterSquadForSlot, getFitMultiplier } from '../utils/compatibility'
import PitchView from './PitchView'

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
  Ireland: '🇮🇪', 'Northern Ireland': '🇬🇧', Poland: '🇵🇱', Hungary: '🇭🇺',
  Finland: '🇫🇮', Albania: '🇦🇱', Slovenia: '🇸🇮', Georgia: '🇬🇪',
  'North Macedonia': '🇲🇰',
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

export default function DraftScreen({ config, onComplete }) {
  const formationDef = formations[config.formation]
  const [slots, setSlots] = useState(
    formationDef.slots.map(s => ({ ...s, player: null }))
  )
  const [spinQueue] = useState(() => shuffle(buildPairs()))
  const [spinIndex, setSpinIndex] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [currentPair, setCurrentPair] = useState(null)
  const [squad, setSquad] = useState([])
  const [spinLabel, setSpinLabel] = useState(null)
  const intervalRef = useRef(null)
  const allPairsRef = useRef(buildPairs())

  const filledCount = slots.filter(s => s.player).length
  const nextEmptySlot = slots.find(s => !s.player)

  useEffect(() => {
    if (filledCount === 11) {
      setTimeout(() => onComplete(slots), 600)
    }
  }, [filledCount])

  function pairLabel(pair) {
    const flag = FLAG_MAP[pair.nation] || '🏴'
    const comp = pair.tournament === 'EURO' ? 'EURO' : 'WC'
    return `${flag} ${pair.nation} ${comp} ${pair.year}`
  }

  function doSpin() {
    if (spinning || !nextEmptySlot || spinIndex >= spinQueue.length) return
    setSpinning(true)
    setSquad([])

    let ticks = 0
    const total = 18
    const allPairs = allPairsRef.current
    intervalRef.current = setInterval(() => {
      const rnd = allPairs[Math.floor(Math.random() * allPairs.length)]
      setSpinLabel(pairLabel(rnd))
      ticks++
      if (ticks >= total) {
        clearInterval(intervalRef.current)
        const pair = spinQueue[spinIndex]
        setCurrentPair(pair)
        setSpinLabel(pairLabel(pair))

        const pool = allPlayers.filter(
          p => p.nation === pair.nation && p.year === pair.year && p.tournament === pair.tournament
        )
        const available = config.mode === 'expert'
          ? filterSquadForSlot(pool, nextEmptySlot.position)
          : pool.filter(p => getFitMultiplier(nextEmptySlot.position, p.positions) >= 0.6)

        setSquad(available.sort((a, b) => b.overall - a.overall))
        setSpinning(false)
      }
    }, 65)
  }

  function pickPlayer(player) {
    setSlots(prev => {
      const updated = [...prev]
      const idx = updated.findIndex(s => !s.player)
      if (idx !== -1) updated[idx] = { ...updated[idx], player }
      return updated
    })
    setSpinIndex(i => i + 1)
    setCurrentPair(null)
    setSquad([])
    setSpinLabel(null)
  }

  function fitLabel(player) {
    const mult = getFitMultiplier(nextEmptySlot?.position, player.positions)
    if (mult === 1.0) return { text: 'Natural', cls: 'text-green-400' }
    if (mult === 0.85) return { text: 'Compatible', cls: 'text-yellow-400' }
    return { text: 'Off-pos', cls: 'text-red-400' }
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <div className="lg:w-80 xl:w-96 bg-gray-900 flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-white">🏆 Lift the Trophy</h1>
          <span className="text-sm text-gray-400">{filledCount}/11</span>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">
            Filling: <span className="text-white font-bold">{nextEmptySlot?.position ?? 'Done!'}</span>
          </div>

          {!currentPair && !spinning && (
            <button
              onClick={doSpin}
              disabled={!nextEmptySlot}
              className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-extrabold text-base transition-colors"
            >
              {nextEmptySlot ? 'Spin ⚽' : 'All Done!'}
            </button>
          )}

          {(spinning || spinLabel) && (
            <div className={`text-xl font-bold py-2 ${spinning ? 'animate-pulse text-gray-400' : 'text-white'}`}>
              {spinLabel}
            </div>
          )}
        </div>

        {squad.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-2">
            <p className="text-xs uppercase tracking-widest text-gray-500">Pick one player</p>
            {squad.map((player, i) => {
              const fit = fitLabel(player)
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
                    <span className={fit.cls}>• {fit.text}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center p-4 bg-gray-950">
        <PitchView slots={slots} />
      </div>
    </div>
  )
}
