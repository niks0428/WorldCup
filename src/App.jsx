import { useState, useEffect } from 'react'
import HomeScreen from './components/HomeScreen'
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
import ChallengesScreen from './components/ChallengesScreen'
import formations from './data/formations.json'
import wcNew from './data/players_wc_new.json'
import wcOld from './data/players_wc_old.json'
import euroA from './data/players_euro_a.json'
import euroB from './data/players_euro_b.json'
import plPlayers from './data/players_pl.json'
import { randomSeed } from './lib/seededRandom'
import { getStreak, updateStreak } from './lib/streak'
import { setLastChallengeSeed } from './lib/challengeStreak'
import { markDailyDone } from './lib/daily'
import { saveToHistory } from './lib/history'
import { calculateTeamScore } from './utils/scoring'
import { simulateTournament } from './utils/tournament'
import { simulateLeague } from './utils/league'
import { getAchievements, saveAchievements } from './lib/achievements'
import './index.css'

const allPlayers = [...wcNew, ...wcOld, ...euroA, ...euroB, ...plPlayers]

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
  // formation|seed[|challengerScore|challengerName|competition]. Neither
  // formation nor seed contains '|', and the name is URI-encoded, so a plain
  // split is safe. Everything after seed is optional — legacy links
  // (formation|seed) and pre-competition links still work (default 'wc').
  const [formation, seed, scoreStr, nameEnc, compStr] = hash.slice(3).split('|')
  if (!formations[formation] || !seed) return null
  const parsedScore = parseInt(scoreStr, 10)
  return {
    formation, seed, mode: 'classic', isChallenge: true,
    competition: compStr === 'pl' ? 'pl' : 'wc',
    challengerScore: Number.isFinite(parsedScore) ? parsedScore : undefined,
    challengerName: nameEnc ? decodeURIComponent(nameEnc) : undefined,
  }
}

export default function App() {
  const [screen, setScreen] = useState('home')
  const [competition, setCompetition] = useState('wc')
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
      // A PL squad stores the club name in `nation`; detect it so the result
      // screen runs the league sim instead of the cup.
      const comp = shared.slots.some(s => s.player?.tournament === 'PL') ? 'pl' : 'wc'
      setCompetition(comp)
      setFinalSlots(shared.slots)
      setConfig({ formation: shared.formation, mode: shared.mode, competition: comp })
      setScreen('result')
      return
    }
    const challenge = challengeFromHash(hash)
    if (challenge) {
      setLastChallengeSeed(challenge.seed)
      setCompetition(challenge.competition)
      setConfig(challenge)
      setScreen('draft')
    }
  }, [])

  // The daily streak is per competition — show the active one's.
  useEffect(() => { setStreak(getStreak(competition)) }, [competition])

  function handleSelectCompetition(comp) {
    setCompetition(comp)
    setScreen('setup')
  }

  function handleSetupDone(cfg) {
    setConfig({ ...cfg, competition, seed: cfg.seed || randomSeed() })
    setSkipsUsed(0)
    setScreen('draft')
  }

  function handleDraftDone(slots, skips = 0) {
    // Daily challenges run at a rotating difficulty; the hardcore reveal flow
    // keys off the effective difficulty, not the 'daily' tracking mode.
    const isHardcore = (config?.difficulty || config?.mode) === 'hardcore'
    setFinalSlots(slots)
    setSkipsUsed(skips)

    // Save to history. Premier League is a 38-game season; World Cup is a cup.
    const score = calculateTeamScore(slots)
    const isPL = config.competition === 'pl'
    const run = isPL
      ? simulateLeague(slots, score, config.seed)
      : simulateTournament(slots, score, config.seed)
    saveToHistory({ slots, formation: config.formation, mode: config.mode, score, tier: run.tier, seed: config.seed, competition: config.competition })

    // Update streak for daily
    let updatedStreak = streak
    if (config?.mode === 'daily') {
      updatedStreak = updateStreak(config.competition)
      setStreak(updatedStreak)
      markDailyDone(config.competition)
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
    setScreen('home')
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
    const comp = entry.competition || (slots.some(s => s.player?.tournament === 'PL') ? 'pl' : 'wc')
    setCompetition(comp)
    setFinalSlots(slots)
    setConfig({ formation: entry.formation, mode: entry.mode, seed: entry.seed, competition: comp })
    setHistoryEntry(entry)
    setScreen('result')
  }

  const configWithSkips = config ? { ...config, skipsUsed } : null

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {screen === 'home' && (
        <HomeScreen onSelect={handleSelectCompetition} />
      )}
      {screen === 'setup' && (
        <SetupScreen
          competition={competition}
          onStart={handleSetupDone}
          onBack={() => setScreen('home')}
          onLeaderboard={() => handleLeaderboard(null, currentGroup?.code)}
          onPrivacy={() => setScreen('privacy')}
          onHistory={() => setScreen('history')}
          onGroup={() => setScreen('group')}
          onHowItWorks={() => setScreen('howto')}
          onAchievements={() => setScreen('achievements')}
          onChallenges={() => setScreen('challenges')}
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
        <RunRevealScreen slots={finalSlots} seed={config?.seed} competition={competition} onDone={() => setScreen('result')} />
      )}
      {screen === 'result' && (
        <ResultScreen
          slots={finalSlots}
          formation={config?.formation}
          mode={config?.mode}
          seed={config?.seed}
          competition={competition}
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
          competition={competition}
        />
      )}
      {screen === 'privacy' && <PrivacyScreen onBack={() => setScreen('setup')} />}
      {screen === 'history' && (
        <HistoryScreen onBack={() => setScreen('setup')} onViewSquad={handleViewSquad} />
      )}
      {screen === 'howto' && <HowItWorksScreen onBack={() => setScreen('setup')} />}
      {screen === 'achievements' && <AchievementsScreen onBack={() => setScreen('setup')} />}
      {screen === 'challenges' && (
        <ChallengesScreen
          onBack={() => setScreen('setup')}
          onViewResults={seed => handleLeaderboard(seed, null)}
          competition={competition}
        />
      )}
      {screen === 'group' && (
        <GroupScreen
          onBack={() => setScreen('setup')}
          onGroupChange={g => setCurrentGroup(g)}
        />
      )}
    </div>
  )
}
