import { useState, useEffect } from 'react'
import SetupScreen from './components/SetupScreen'
import DraftScreen from './components/DraftScreen'
import ResultScreen, { decodeSquad } from './components/ResultScreen'
import LeaderboardScreen from './components/LeaderboardScreen'
import formations from './data/formations.json'
import wcNew from './data/players_wc_new.json'
import wcOld from './data/players_wc_old.json'
import euroA from './data/players_euro_a.json'
import euroB from './data/players_euro_b.json'
import './index.css'

const allPlayers = [...wcNew, ...wcOld, ...euroA, ...euroB]

function buildPlayerLookup() {
  const map = {}
  for (const p of allPlayers) {
    map[`${p.name}|${p.nation}|${p.year}|${p.tournament}`] = p
  }
  return map
}

function squadFromHash(hash) {
  if (!hash.startsWith('#s=')) return null
  const data = decodeSquad(hash.slice(3))
  if (!data || !formations[data.f]) return null
  const lookup = buildPlayerLookup()
  const slots = formations[data.f].slots.map(slot => {
    const entry = data.s.find(s => s.i === slot.id)
    if (!entry) return { ...slot, player: null }
    return { ...slot, player: lookup[`${entry.n}|${entry.na}|${entry.y}|${entry.t}`] || null }
  })
  return { slots, formation: data.f, mode: data.m }
}

export default function App() {
  const [screen, setScreen] = useState('setup')
  const [config, setConfig] = useState(null)
  const [finalSlots, setFinalSlots] = useState(null)

  useEffect(() => {
    const shared = squadFromHash(window.location.hash)
    if (shared) {
      setFinalSlots(shared.slots)
      setConfig({ formation: shared.formation, mode: shared.mode })
      setScreen('result')
    }
  }, [])

  function handleSetupDone(cfg) {
    setConfig(cfg)
    setScreen('draft')
  }

  function handleDraftDone(slots) {
    setFinalSlots(slots)
    setScreen('result')
  }

  function handleRestart() {
    setConfig(null)
    setFinalSlots(null)
    window.location.hash = ''
    setScreen('setup')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {screen === 'setup' && (
        <SetupScreen onStart={handleSetupDone} onLeaderboard={() => setScreen('leaderboard')} />
      )}
      {screen === 'draft' && (
        <DraftScreen config={config} onComplete={handleDraftDone} />
      )}
      {screen === 'result' && (
        <ResultScreen
          slots={finalSlots}
          formation={config?.formation}
          mode={config?.mode}
          onRestart={handleRestart}
          onLeaderboard={() => setScreen('leaderboard')}
        />
      )}
      {screen === 'leaderboard' && (
        <LeaderboardScreen onBack={() => setScreen(finalSlots ? 'result' : 'setup')} />
      )}
    </div>
  )
}
