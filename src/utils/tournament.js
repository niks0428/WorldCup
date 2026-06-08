import { makeRng } from '../lib/seededRandom'

// Stage names in tournament order. A winner plays all 7.
const STAGES = [
  'Group Match 1', 'Group Match 2', 'Group Match 3',
  'Round of 16', 'Quarter-final', 'Semi-final', 'Final',
]

// How far each tier got: number of matches played + whether the final was won.
const RUN = {
  'World Cup Winners': { matches: 7, wonFinal: true },
  'Finalists':         { matches: 7, wonFinal: false },
  'Semi-finalists':    { matches: 6, wonFinal: false },
  'Quarter-finalists': { matches: 5, wonFinal: false },
  'Round of 16':       { matches: 4, wonFinal: false },
  'Group Stage Exit':  { matches: 3, wonFinal: false },
}

// Opponent pools (only nations that have flags in lib/flags.jsx).
const GROUP_OPP = [
  'Australia', 'Japan', 'South Korea', 'USA', 'Mexico', 'Iceland', 'Senegal',
  'Ghana', 'Cameroon', 'Morocco', 'Poland', 'Sweden', 'Switzerland',
  'Denmark', 'Austria', 'Serbia', 'Chile', 'Algeria', 'Ukraine',
]
const ELITE_OPP = [
  'Brazil', 'Argentina', 'France', 'Germany', 'Spain', 'Italy',
  'Netherlands', 'Portugal', 'England', 'Belgium', 'Uruguay', 'Croatia',
]

function shuffle(arr, rng) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function pickOpponents(rng, n) {
  const g = shuffle(GROUP_OPP, rng)
  const e = shuffle(ELITE_OPP, rng)
  const out = []
  for (let i = 0; i < n; i++) out.push(i < 3 ? g[i] : e[i - 3])
  return out
}

// Rough Poisson-ish goal count from an expected-goals figure (0..6).
function goals(rng, lambda) {
  let g = 0
  for (let i = 0; i < 6; i++) if (rng() < lambda / 6) g++
  return g
}

// Build a scoreline that honours the required outcome.
function scoreFor(rng, str, outcome, pens) {
  const atk = 0.8 + str * 2.0  // our expected goals: 0.8..2.8
  const def = 1.8 - str * 1.3  // their expected goals: 1.8..0.5
  let f = goals(rng, atk)
  let a = goals(rng, def)

  if (pens) {
    // Drawn in regulation, decided on penalties — force a level score.
    const lvl = Math.min(Math.max(f, a), 2)
    return [lvl, lvl]
  }
  if (outcome === 'W' && f <= a) f = a + 1
  else if (outcome === 'L' && a <= f) a = f + 1
  else if (outcome === 'D') a = f
  return [f, a]
}

/**
 * Simulate the tournament run that produced this result.
 * Deterministic for a given squad, so it matches the team's score/tier.
 */
export function simulateTournament(slots, score, tier, seedInput) {
  const run = RUN[tier.label] || RUN['Group Stage Exit']
  const squadSeed = slots.filter(s => s.player).map(s => s.player.name).join('|')
  const rng = makeRng(`${seedInput || squadSeed}|${tier.label}`)
  const str = Math.max(0, Math.min(1, score / 100))
  const opponents = pickOpponents(rng, run.matches)

  const matches = []
  let goalsFor = 0
  let goalsAgainst = 0

  for (let i = 0; i < run.matches; i++) {
    const isLast = i === run.matches - 1
    const isKnockout = i >= 3
    const isGroupExit = run.matches === 3

    let outcome // 'W' | 'D' | 'L'
    let pens = null // 'W' | 'L' when decided on penalties

    if (isGroupExit) {
      outcome = rng() < 0.45 ? 'L' : 'D' // didn't do enough to advance
    } else if (isLast && run.wonFinal) {
      if (rng() < 0.3) { outcome = 'D'; pens = 'W' } else outcome = 'W'
    } else if (isLast) {
      // The match that knocked the team out.
      if (isKnockout && rng() < 0.4) { outcome = 'D'; pens = 'L' } else outcome = 'L'
    } else if (isKnockout && rng() < 0.25) {
      outcome = 'D'; pens = 'W' // advanced on penalties
    } else {
      outcome = 'W'
    }

    const [gf, ga] = scoreFor(rng, str, outcome, pens)
    goalsFor += gf
    goalsAgainst += ga

    matches.push({
      stage: STAGES[i],
      opponent: opponents[i],
      gf, ga,
      result: pens || outcome, // W/D/L for badge colour
      drawn: outcome === 'D',
      pens, // 'W'/'L' if penalties decided it
    })
  }

  return { matches, goalsFor, goalsAgainst }
}
