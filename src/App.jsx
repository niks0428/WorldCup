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
import { randomSeed } from './lib/seededRandom'
import './index.css'

const allPlayers = [...wcNew, ...wcOld, ...euroA, ...euroB]

function buildPlayerLookup() {
  const map = {}
  for (const p of allPlayers) map[`${p.name}|${p.nation}|${p.year}|${p.tournament}`] = p
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

function challengeFromHash(hash) {
  if (!hash.startsWith('#c=')) return null
  const payload = hash.slice(3)
  const pipe = payload.lastIndexOf('|')
  if (pipe === -1) return null
  const formation = payload.slice(0, pipe)
  const seed = payload.slice(pipe + 1)
  if (!formations[formation] || !seed) return null
  return { formation, seed, mode: 'classic', isChallenge: true }
}

export default function App() {
  const [screen, setScreen] = useState('setup')
  const [config, setConfig] = useState(null)
  const [finalSlots, setFinalSlots] = useState(null)
  const [leaderboardSeed, setLeaderboardSeed] = useState(null)

  useEffect(() => {
    const hash = window.location.hash
    const shared = squadFromHash(hash)
    if (shared) {
      setFinalSlots(shared.slots)
      setConfig({ formation: shared.formation, mode: shared.mode })
      setScreen('result')
      return
    }
    const challenge = challengeFromHash(hash)
    if (challenge) {
      setConfig(challenge)
      setScreen('draft')
    }
  }, [])

  function handleSetupDone(cfg) {
    // Attach a random seed to every game so challenge links always work
    const seed = cfg.seed || randomSeed()
    setConfig({ ...cfg, seed })
    setScreen('draft')
  }

  function handleDraftDone(slots) {
    setFinalSlots(slots)
    setScreen('result')
  }

  function handleRestart() {
    setConfig(null)
    setFinalSlots(null)
    setLeaderboardSeed(null)
    window.location.hash = ''
    setScreen('setup')
  }

  function handleLeaderboard(seed) {
    setLeaderboardSeed(seed || null)
    setScreen('leaderboard')
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {screen === 'setup' && (
        <SetupScreen onStart={handleSetupDone} onLeaderboard={() => handleLeaderboard(null)} />
      )}
      {screen === 'draft' && (
        <DraftScreen config={config} onComplete={handleDraftDone} />
      )}
      {screen === 'result' && (
        <ResultScreen
          slots={finalSlots}
          formation={config?.formation}
          mode={config?.mode}
          seed={config?.seed}
          onRestart={handleRestart}
          onLeaderboard={() => handleLeaderboard(config?.seed)}
        />
      )}
      {screen === 'leaderboard' && (
        <LeaderboardScreen
          onBack={() => setScreen(finalSlots ? 'result' : 'setup')}
          challengeSeed={leaderboardSeed}
        />
      )}
    </div>
  )
}
