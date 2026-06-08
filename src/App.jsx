import { useState, useEffect } from 'react'
import SetupScreen from './components/SetupScreen'
import DraftScreen from './components/DraftScreen'
import ResultScreen, { decodeSquad } from './components/ResultScreen'
import LeaderboardScreen from './components/LeaderboardScreen'
import PrivacyScreen from './components/PrivacyScreen'
import HistoryScreen from './components/HistoryScreen'
import GroupScreen, { getSavedGroup } from './components/GroupScreen'
import RevealScreen from './components/RevealScreen'
import RunRevealScreen from './components/RunRevealScreen'
import HowItWorksScreen from './components/HowItWorksScreen'
import AchievementsScreen from './components/AchievementsScreen'
import formations from './data/formations.json'
import wcNew from './data/players_wc_new.json'
import wcOld from './data/players_wc_old.json'
import euroA from './data/players_euro_a.json'
import euroB from './data/players_euro_b.json'
import { randomSeed } from './lib/seededRandom'
import { getStreak, updateStreak } from './lib/streak'
import { markDailyDone } from './lib/daily'
import { saveToHistory } from './lib/history'
import { calculateTeamScore } from './utils/scoring'
import { simulateTournament } from './utils/tournament'
import { getAchievements, saveAchievements } from './lib/achievements'
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
  const [leaderboardGroup, setLeaderboardGroup] = useState(null)
  const [streak, setStreak] = useState(() => getStreak())
  const [currentGroup, setCurrentGroup] = useState(() => getSavedGroup())
  const [historyEntry, setHistoryEntry] = useState(null)
  const [skipsUsed, setSkipsUsed] = useState(0)

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
    if (challenge) { setConfig(challenge); setScreen('draft') }
  }, [])

  function handleSetupDone(cfg) {
    setConfig({ ...cfg, seed: cfg.seed || randomSeed() })
    setSkipsUsed(0)
    setScreen('draft')
  }

  function handleDraftDone(slots, skips = 0) {
    const isHardcore = config?.mode === 'hardcore'
    setFinalSlots(slots)
    setSkipsUsed(skips)

    // Save to history
    const score = calculateTeamScore(slots)
    const run = simulateTournament(slots, score, config.seed)
    saveToHistory({ slots, formation: config.formation, mode: config.mode, score, tier: run.tier, seed: config.seed })

    // Update streak for daily
    let updatedStreak = streak
    if (config?.mode === 'daily') {
      updatedStreak = updateStreak()
      setStreak(updatedStreak)
      markDailyDone()
    }

    // Save achievements
    const achievementConfig = { ...config, skipsUsed: skips, streak: updatedStreak.streak }
    const earned = getAchievements(slots, achievementConfig)
    saveAchievements(earned)

    // Hardcore reveals the squad first, then everyone watches the tournament run.
    if (isHardcore) {
      setScreen('reveal')
    } else {
      setScreen('run')
    }
  }

  function handleRestart() {
    setConfig(null); setFinalSlots(null)
    setLeaderboardSeed(null); setLeaderboardGroup(null)
    setHistoryEntry(null); setSkipsUsed(0)
    window.location.hash = ''
    setScreen('setup')
  }

  function handleLeaderboard(seed, groupCode) {
    setLeaderboardSeed(seed || null)
    setLeaderboardGroup(groupCode || null)
    setScreen('leaderboard')
  }

  function handleViewSquad(entry) {
    // Reconstruct slots from history entry
    const formationDef = formations[entry.formation]
    if (!formationDef) return
    const slots = formationDef.slots.map(slot => {
      const saved = entry.players.find(p => p.slotId === slot.id)
      return { ...slot, player: saved ? saved.player : null }
    })
    setFinalSlots(slots)
    setConfig({ formation: entry.formation, mode: entry.mode, seed: entry.seed })
    setHistoryEntry(entry)
    setScreen('result')
  }

  const configWithSkips = config ? { ...config, skipsUsed } : null

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {screen === 'setup' && (
        <SetupScreen
          onStart={handleSetupDone}
          onLeaderboard={() => handleLeaderboard(null, currentGroup?.code)}
          onPrivacy={() => setScreen('privacy')}
          onHistory={() => setScreen('history')}
          onGroup={() => setScreen('group')}
          onHowItWorks={() => setScreen('howto')}
          onAchievements={() => setScreen('achievements')}
          streak={streak}
          currentGroup={currentGroup}
        />
      )}
      {screen === 'draft' && (
        <DraftScreen config={config} onComplete={handleDraftDone} />
      )}
      {screen === 'reveal' && (
        <RevealScreen slots={finalSlots} onDone={() => setScreen('run')} />
      )}
      {screen === 'run' && (
        <RunRevealScreen slots={finalSlots} seed={config?.seed} onDone={() => setScreen('result')} />
      )}
      {screen === 'result' && (
        <ResultScreen
          slots={finalSlots}
          formation={config?.formation}
          mode={config?.mode}
          seed={config?.seed}
          config={configWithSkips}
          streak={streak.streak}
          groupCode={currentGroup?.code}
          onRestart={handleRestart}
          onLeaderboard={() => handleLeaderboard(config?.seed, currentGroup?.code)}
        />
      )}
      {screen === 'leaderboard' && (
        <LeaderboardScreen
          onBack={() => setScreen(finalSlots ? 'result' : 'setup')}
          challengeSeed={leaderboardSeed}
          groupCode={leaderboardGroup}
        />
      )}
      {screen === 'privacy' && <PrivacyScreen onBack={() => setScreen('setup')} />}
      {screen === 'history' && (
        <HistoryScreen onBack={() => setScreen('setup')} onViewSquad={handleViewSquad} />
      )}
      {screen === 'howto' && <HowItWorksScreen onBack={() => setScreen('setup')} />}
      {screen === 'achievements' && <AchievementsScreen onBack={() => setScreen('setup')} />}
      {screen === 'group' && (
        <GroupScreen
          onBack={() => setScreen('setup')}
          onGroupChange={g => setCurrentGroup(g)}
        />
      )}
    </div>
  )
}
