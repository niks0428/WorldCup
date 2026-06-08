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
  'Champions League':  { label: 'Champions League',      emoji: '🔵', desc: 'Top four. Europe’s elite next season.' },
  'Europa':            { label: 'Europa Places',         emoji: '🟢', desc: 'European qualification.' },
  'Mid-table':         { label: 'Mid-table',             emoji: '⚪', desc: 'Safe and steady.' },
  'Relegated':         { label: 'Relegated',             emoji: '🔻', desc: 'Down to the Championship.' },
}

// 19 opponent season identities — name + base strength. Strengths span a
// realistic PL spread (title contenders down to relegation fodder).
const OPPONENTS = [
  { name: 'Manchester City',   str: 83 },
  { name: 'Arsenal',           str: 82 },
  { name: 'Liverpool',         str: 81 },
  { name: 'Chelsea',           str: 80 },
  { name: 'Tottenham Hotspur', str: 79 },
  { name: 'Manchester United', str: 78 },
  { name: 'Newcastle United',  str: 77 },
  { name: 'Aston Villa',       str: 76 },
  { name: 'Brighton',          str: 75 },
  { name: 'West Ham United',   str: 74 },
  { name: 'Crystal Palace',    str: 73 },
  { name: 'Brentford',         str: 72 },
  { name: 'Fulham',            str: 71 },
  { name: 'Wolves',            str: 70 },
  { name: 'Everton',           str: 69 },
  { name: 'Nottingham Forest', str: 68 },
  { name: 'Bournemouth',       str: 67 },
  { name: 'Leicester City',    str: 66 },
  { name: 'Southampton',       str: 65 },
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

  // Fixture order — opponents shuffled, each played home (H) then away (A).
  const fixtures = []
  for (const opp of shuffle(OPPONENTS, rng)) {
    fixtures.push({ opp, home: true })
    fixtures.push({ opp, home: false })
  }

  const matches = []
  let pts = 0, won = 0, drawn = 0, lost = 0
  let goalsFor = 0, goalsAgainst = 0

  for (const fx of fixtures) {
    const homeBoost = fx.home ? 3 : 0
    const [gf, ga] = matchGoals(rng, S + homeBoost, fx.opp.str)
    const result = gf > ga ? 'W' : gf < ga ? 'L' : 'D'
    if (result === 'W') { pts += 3; won++ }
    else if (result === 'D') { pts += 1; drawn++ }
    else lost++
    goalsFor += gf; goalsAgainst += ga
    matches.push({
      opponent: fx.opp.name, home: fx.home, gf, ga, result,
      drawn: result === 'D',
    })
  }

  // Rank us in a 20-team table. Each opponent gets a seeded season points total
  // loosely tied to its base strength, then we slot in by points.
  const tableOthers = OPPONENTS.map(o => {
    const base = (o.str - 64) * 3.9            // spreads rivals ~20 → ~90 pts
    const swing = (rng() - 0.5) * 16
    return { name: o.name, pts: Math.max(16, Math.min(97, Math.round(base + 18 + swing))) }
  })
  const above = tableOthers.filter(t => t.pts > pts).length
  const position = above + 1                   // 1 = champions

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
  }
}
