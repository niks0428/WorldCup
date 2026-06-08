import { makeRng } from '../lib/seededRandom'
import { awardStats } from './league'

// Stage names in tournament order. A winner plays all 7.
const STAGES = [
  'Group Match 1', 'Group Match 2', 'Group Match 3',
  'Round of 16', 'Quarter-final', 'Semi-final', 'Final',
]

// Result tiers + which one you land on if you LOSE at knockout stage i (R16..Final).
export const TIER_META = {
  'World Cup Winners': { label: 'World Cup Winners', emoji: '🏆' },
  'Finalists':         { label: 'Finalists',         emoji: '🥈' },
  'Semi-finalists':    { label: 'Semi-finalists',    emoji: '🥉' },
  'Quarter-finalists': { label: 'Quarter-finalists', emoji: '🎯' },
  'Round of 16':       { label: 'Round of 16',       emoji: '🔵' },
  'Group Stage Exit':  { label: 'Group Stage Exit',  emoji: '⚫' },
}
const KO_EXIT_TIER = ['Round of 16', 'Quarter-finalists', 'Semi-finalists', 'Finalists']

// Opponent strength per stage (group games then R16/QF/SF/Final). The field gets
// progressively stronger, so going all the way is hard — but never impossible.
const GROUP_STR = [60, 64, 68]
const KO_STR = [72, 75, 78, 81]

// Opponent name pools (only nations that have flags in lib/flags.jsx).
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

// Binomial(8, lambda/8) goal count — Poisson-ish, capped at 8.
function goals(rng, lambda) {
  let g = 0
  for (let i = 0; i < 8; i++) if (rng() < lambda / 8) g++
  return g
}

// Expected goals from the strength gap, then a scoreline. Stronger sides score
// more and concede less, but any match can swing (the magic of the cup).
function matchGoals(rng, S, opp) {
  const d = S - opp
  const our   = Math.max(0.25, Math.min(4.5, 1.35 * Math.exp(d * 0.030)))
  const their = Math.max(0.25, Math.min(4.5, 1.35 * Math.exp(-d * 0.030)))
  return [goals(rng, our), goals(rng, their)]
}

/**
 * Play the tournament. The result TIER is the outcome of the simulation, so a
 * great squad usually goes far and a weak one usually exits early — but upsets
 * happen. Deterministic for a given (seed, squad, score) so the reveal, result
 * screen and leaderboard replay all agree.
 */
export function simulateTournament(slots, score, seedInput) {
  const squadSeed = slots.filter(s => s.player).map(s => s.player.name).join('|')
  const rng = makeRng(`${seedInput || ''}|${squadSeed}|v2`)
  const S = Math.max(1, Math.min(99, score))

  const groupNames = shuffle(GROUP_OPP, rng).slice(0, 3)
  const eliteNames = shuffle(ELITE_OPP, rng).slice(0, 4)

  const matches = []
  let goalsFor = 0
  let goalsAgainst = 0

  // ── Group stage: 3 matches, advance on points (top two) ───────────────────
  let pts = 0
  for (let i = 0; i < 3; i++) {
    const [gf, ga] = matchGoals(rng, S, GROUP_STR[i])
    const result = gf > ga ? 'W' : gf < ga ? 'L' : 'D'
    pts += result === 'W' ? 3 : result === 'D' ? 1 : 0
    goalsFor += gf; goalsAgainst += ga
    matches.push({ stage: STAGES[i], opponent: groupNames[i], gf, ga, result, drawn: result === 'D', pens: null })
  }
  const advanced = pts >= 4 || (pts === 3 && rng() < 0.5)

  let tierLabel = 'World Cup Winners'
  if (!advanced) {
    tierLabel = 'Group Stage Exit'
  } else {
    // ── Knockouts: lose and you're out at that stage; win the final to lift it ─
    for (let i = 0; i < 4; i++) {
      const [gf, ga] = matchGoals(rng, S, KO_STR[i])
      let result, pens = null
      if (gf > ga) result = 'W'
      else if (gf < ga) result = 'L'
      else {
        const p = Math.max(0.3, Math.min(0.7, 0.5 + (S - KO_STR[i]) * 0.011))
        const win = rng() < p
        result = win ? 'W' : 'L'
        pens = win ? 'W' : 'L'
      }
      goalsFor += gf; goalsAgainst += ga
      matches.push({
        stage: STAGES[3 + i], opponent: eliteNames[i], gf, ga,
        result, drawn: gf === ga, pens,
      })
      if (result === 'L') { tierLabel = KO_EXIT_TIER[i]; break }
    }
  }

  const { goldenBoot, playerOfTournament } = awardStats(slots, matches, rng)
  return { tier: tierLabel, tierMeta: TIER_META[tierLabel], matches, goalsFor, goalsAgainst, goldenBoot, playerOfTournament }
}
