import { makeRng } from '../lib/seededRandom'

// Premier League season simulation. The dream is 38-0-0 — win all 38 and go
// unbeaten as champions. Your squad strength drives every result, but any game
// can swing, so a perfect season is rare and earned. Deterministic for a given
// (seed, squad, score) so reveal / result / leaderboard all replay identically.

// Result tiers, best → worst. Reaching "Invincibles" requires a literal 38-0-0.
export const LEAGUE_TIER_META = {
  'Invincibles':       { label: 'Invincibles · 38-0-0', emoji: '🏆', desc: 'Won all 38. Unbeaten champions. Immortal.' },
  'Champions':         { label: 'Champions',             emoji: '🏆', desc: 'Premier League title.' },
  'Title Race':        { label: 'Runners-up',            emoji: '🥈', desc: 'So close — pipped to the title.' },
  'Champions League':  { label: 'Champions League',      emoji: '🔵', desc: "Top four. Europe's elite next season." },
  'Europa':            { label: 'Europa Places',         emoji: '🟢', desc: 'European qualification.' },
  'Mid-table':         { label: 'Mid-table',             emoji: '⚪', desc: 'Safe and steady.' },
  'Relegated':         { label: 'Relegated',             emoji: '🔻', desc: 'Down to the Championship.' },
}

// Your 19 opponents — the current Premier League clubs (2025/26, the closest
// knowable lineup to 2026/27). You're the 20th team. Strengths span a realistic
// PL spread (title contenders 83 → newly-promoted 65) so the balance holds.
const OPPONENTS = [
  { name: 'Liverpool',         str: 83 },
  { name: 'Arsenal',           str: 82 },
  { name: 'Manchester City',   str: 81 },
  { name: 'Chelsea',           str: 80 },
  { name: 'Newcastle United',  str: 79 },
  { name: 'Aston Villa',       str: 78 },
  { name: 'Tottenham Hotspur', str: 77 },
  { name: 'Manchester United', str: 76 },
  { name: 'Brighton',          str: 75 },
  { name: 'Bournemouth',       str: 74 },
  { name: 'Crystal Palace',    str: 73 },
  { name: 'Brentford',         str: 72 },
  { name: 'Fulham',            str: 71 },
  { name: 'Everton',           str: 70 },
  { name: 'Wolves',            str: 69 },
  { name: 'Nottingham Forest', str: 68 },
  { name: 'West Ham United',   str: 67 },
  { name: 'Leeds United',      str: 66 },
  { name: 'Sunderland',        str: 65 },
]

function shuffle(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// Binomial(8, lambda/8) goal count — Poisson-ish, capped at 8.
function goals(rng, lambda) {
  let g = 0
  for (let i = 0; i < 8; i++) if (rng() < lambda / 8) g++
  return g
}

// Expected goals from the strength gap, then a scoreline. Home side gets a
// boost. The gap is amplified so a truly elite XI is a heavy favourite every
// week — going 38-0-0 is rare but reachable for a 95+ squad, not luck-only.
function matchGoals(rng, S, opp) {
  const d = S - opp
  const our   = Math.max(0.25, Math.min(6, 1.5 * Math.exp(d * 0.058)))
  const their = Math.max(0.12, Math.min(5, 1.25 * Math.exp(-d * 0.074)))
  return [goals(rng, our), goals(rng, their)]
}

export function simulateLeague(slots, score, seedInput) {
  const squadSeed = slots.filter(s => s.player).map(s => s.player.name).join('|')
  const rng = makeRng(`${seedInput || ''}|${squadSeed}|league-v1`)
  const S = Math.max(1, Math.min(99, score))

  // Each opponent is played once home, once away (38 games), then the whole
  // calendar is shuffled so it's a realistic mixed fixture list. Each fixture
  // carries its matchday number so the display labels are accurate.
  const fixtures = []
  for (const opp of OPPONENTS) {
    fixtures.push({ opp, home: true })
    fixtures.push({ opp, home: false })
  }
  const schedule = shuffle(fixtures, rng).map((fx, idx) => ({ ...fx, md: idx + 1 }))

  const matches = []
  let pts = 0, won = 0, drawn = 0, lost = 0
  let goalsFor = 0, goalsAgainst = 0

  for (const fx of schedule) {
    const homeBoost = fx.home ? 3 : 0
    const [gf, ga] = matchGoals(rng, S + homeBoost, fx.opp.str)
    const result = gf > ga ? 'W' : gf < ga ? 'L' : 'D'
    if (result === 'W') { pts += 3; won++ }
    else if (result === 'D') { pts += 1; drawn++ }
    else lost++
    goalsFor += gf; goalsAgainst += ga
    matches.push({ opponent: fx.opp.name, home: fx.home, gf, ga, result, md: fx.md })
  }

  // Extra season stats.
  const cleanSheets = matches.filter(m => m.ga === 0).length
  let biggestWin = null, biggestLoss = null
  let longestWinStreak = 0, curStreak = 0
  for (const m of matches) {
    if (m.result === 'W') {
      curStreak++
      if (curStreak > longestWinStreak) longestWinStreak = curStreak
      if (!biggestWin || (m.gf - m.ga) > (biggestWin.gf - biggestWin.ga)) biggestWin = m
    } else {
      curStreak = 0
      if (m.result === 'L' && (!biggestLoss || (m.ga - m.gf) > (biggestLoss.ga - biggestLoss.gf))) biggestLoss = m
    }
  }

  // Build the full 20-team table. Rivals' points are seeded per opponent with a
  // tighter ±5 swing (down from ±8) so stronger clubs stay above weaker ones
  // more reliably. We also compute a plausible GD so the tiebreaker column
  // makes sense. Player's row is included and the table is sorted pts→GD.
  const tableOthers = OPPONENTS.map(o => {
    const base = (o.str - 64) * 3.9            // spreads rivals ~20 → ~74 pts
    const swing = (rng() - 0.5) * 10           // ±5 pts, down from ±8
    const rivalPts = Math.max(16, Math.min(97, Math.round(base + 18 + swing)))
    // GD scales with pts (positive = winning team) plus small noise.
    const rivalGD = Math.round((rivalPts - 45) * 0.85 + (rng() - 0.5) * 8)
    return { name: o.name, pts: rivalPts, gd: rivalGD }
  })

  const playerGD = goalsFor - goalsAgainst
  const myRow = { name: 'Your XI', pts, gd: playerGD, isPlayer: true }
  const table = [...tableOthers, myRow]
    .sort((a, b) => b.pts - a.pts || b.gd - a.gd)
    .map((r, i) => ({ ...r, pos: i + 1 }))

  const position = table.find(r => r.isPlayer)?.pos ?? 20

  let tier
  if (won === 38)            tier = 'Invincibles'
  else if (position === 1)   tier = 'Champions'
  else if (position === 2)   tier = 'Title Race'
  else if (position <= 4)    tier = 'Champions League'
  else if (position <= 7)    tier = 'Europa'
  else if (position <= 17)   tier = 'Mid-table'
  else                       tier = 'Relegated'

  return {
    tier,
    tierMeta: LEAGUE_TIER_META[tier],
    matches, position,
    points: pts, won, drawn, lost,
    goalsFor, goalsAgainst,
    perfect: won === 38,
    cleanSheets, biggestWin, biggestLoss, longestWinStreak,
    table,
  }
}
