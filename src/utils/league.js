import { makeRng } from '../lib/seededRandom'

// Premier League season simulation. The dream is 38-0-0 — win all 38 and go
// unbeaten as champions. Your squad strength drives every result, but any game
// can swing, so a perfect season is rare and earned. Deterministic for a given
// (seed, squad, score) so reveal / result / leaderboard all replay identically.

// Result tiers, best → worst. Reaching "Invincibles" requires a literal 38-0-0.
export const LEAGUE_TIER_META = {
  'Invincibles':       { label: 'Invincibles · 38-0-0', emoji: '🏆', desc: 'Won all 38. Unbeaten champions. Immortal.' },
  'Centurions':        { label: 'Centurions · 100 pts', emoji: '💯', desc: '100-point champions. Historically untouchable.' },
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
  const rng = makeRng(`${seedInput || ''}|${squadSeed}|league-v2`)
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
    const playerForm = Math.max(1, Math.min(99, S + (rng() - 0.5) * 10))
    const oppMatchStr = fx.opp.str + (rng() - 0.5) * 10
    const [gf, ga] = matchGoals(rng, playerForm + homeBoost, oppMatchStr)
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
    const base = (o.str - 62) * 3.1 + 24       // spreads rivals ~33 → ~89 pts
    const swing = (rng() - 0.5) * 22           // ±11 pts for realistic season variance
    const rivalPts = Math.max(16, Math.min(97, Math.round(base + swing)))
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
  if (won === 38)                      tier = 'Invincibles'
  else if (position === 1 && pts >= 100) tier = 'Centurions'
  else if (position === 1)             tier = 'Champions'
  else if (position === 2)             tier = 'Title Race'
  else if (position <= 4)              tier = 'Champions League'
  else if (position <= 7)              tier = 'Europa'
  else if (position <= 17)             tier = 'Mid-table'
  else                                 tier = 'Relegated'

  // Distribute match goals across the XI for awards. Runs after all
  // tier/table RNG so it never changes any existing result or standing.
  const { goldenBoot, playerOfSeason, playmaker, goldenGlove, matchScorers } = awardStats(slots, matches, rng, name => CLUB_PLAYERS[name] ?? [])
  matchScorers.forEach((s, i) => { if (matches[i]) matches[i].scorers = s })

  // Cup competitions — FA Cup, League Cup, Champions League.
  // Run with the same continuing RNG so the results are fully deterministic.
  // Only PL-qualification matters for UCL; all teams enter the domestic cups.
  const cups = simulateCups(S, position, rng)

  // Trophy label: Quadruple / Treble / Double (requires league title)
  let trophyLabel = null
  if (position === 1 || tier === 'Invincibles' || tier === 'Centurions') {
    if (cups.faCupWon && cups.uclWon && cups.leagueCupWon) trophyLabel = 'Quadruple 🏆🏆🏆🏆'
    else if (cups.faCupWon && cups.uclWon)                 trophyLabel = 'Treble 🏆🏆🏆'
    else if (cups.faCupWon && cups.leagueCupWon)           trophyLabel = 'Domestic Treble 🏆🏆🏆'
    else if (cups.faCupWon || cups.uclWon)                 trophyLabel = 'Double 🏆🏆'
  }

  return {
    tier,
    tierMeta: LEAGUE_TIER_META[tier],
    matches, position,
    points: pts, won, drawn, lost,
    goalsFor, goalsAgainst,
    perfect: won === 38,
    cleanSheets, biggestWin, biggestLoss, longestWinStreak,
    table,
    goldenBoot, playerOfSeason, playmaker, goldenGlove,
    ...cups,
    trophyLabel,
  }
}

// Simulate FA Cup (6 rounds), League Cup (5 rounds), UCL (5 knockout rounds).
// Uses a continuation of the league RNG — never call before league sim finishes.
function simulateCups(S, position, rng) {
  function cupWin(rng, opponentStr) {
    const d = S - opponentStr
    const winP = Math.max(0.08, Math.min(0.92, 0.5 + d * 0.028))
    return rng() < winP
  }

  // FA Cup — 6 rounds (R3 → Final). Opponent strength ramps from mid-table to elite.
  const faRounds = [65, 68, 71, 76, 80, 84]
  let faCupWon = true
  let faCupRound = 0
  for (const opp of faRounds) {
    faCupRound++
    if (!cupWin(rng, opp)) { faCupWon = false; break }
  }

  // League Cup — 5 rounds (R4 → Final). Slightly softer field.
  const lcRounds = [63, 67, 72, 77, 81]
  let leagueCupWon = true
  let leagueCupRound = 0
  for (const opp of lcRounds) {
    leagueCupRound++
    if (!cupWin(rng, opp)) { leagueCupWon = false; break }
  }

  // UCL — 5 knockout rounds (R16 → Final). Only if top-4 finish.
  const uclRounds = [76, 80, 83, 86, 88]
  let uclWon = false
  let uclRound = 0
  if (position <= 4) {
    uclWon = true
    for (const opp of uclRounds) {
      uclRound++
      if (!cupWin(rng, opp)) { uclWon = false; break }
    }
  }

  return { faCupWon, faCupRound, leagueCupWon, leagueCupRound, uclWon, uclRound }
}

// Goal and assist probability weights by slot position. Attackers score, wide
// midfielders create, deep midfielders contribute a little of both.
const GOAL_W = {
  GK:0.2,  CB:0.8,  LCB:0.8, RCB:0.8,
  LB:1.5,  RB:1.5,  LWB:2.5, RWB:2.5,
  CDM:2.5, CM:5,    LCM:5,   RCM:5,
  CAM:8,   LM:7,    RM:7,
  LW:11,   RW:11,
  ST:22,   LST:22,  RST:22,  CF:16,
}
const ASSIST_W = {
  GK:0.3,  CB:0.8,  LCB:0.8, RCB:0.8,
  LB:3.5,  RB:3.5,  LWB:5,   RWB:5,
  CDM:4,   CM:9,    LCM:9,   RCM:9,
  CAM:13,  LM:11,   RM:11,
  LW:12,   RW:12,
  ST:4,    LST:4,   RST:4,   CF:6,
}

function pickWeighted(weights, rng, exclude = -1) {
  let tot = 0
  for (let i = 0; i < weights.length; i++) if (i !== exclude) tot += weights[i]
  let r = rng() * tot
  for (let i = 0; i < weights.length; i++) {
    if (i !== exclude) { r -= weights[i]; if (r <= 0) return i }
  }
  return weights.findIndex((_, i) => i !== exclude)
}

// Known star players per club (2 per side). Goals from each match are
// distributed to these players so the Golden Boot / Player of the Season
// can be won by an opponent — not just your own XI.
const CLUB_PLAYERS = {
  'Liverpool':          [{ name: 'M. Salah',          pos: 'RW'  }, { name: 'D. Núñez',        pos: 'ST'  }],
  'Arsenal':            [{ name: 'B. Saka',            pos: 'RW'  }, { name: 'K. Havertz',      pos: 'ST'  }],
  'Manchester City':    [{ name: 'E. Haaland',         pos: 'ST'  }, { name: 'K. De Bruyne',    pos: 'CAM' }],
  'Chelsea':            [{ name: 'C. Palmer',          pos: 'CAM' }, { name: 'N. Jackson',      pos: 'ST'  }],
  'Newcastle United':   [{ name: 'A. Isak',            pos: 'ST'  }, { name: 'J. Gordon',       pos: 'LW'  }],
  'Aston Villa':        [{ name: 'O. Watkins',         pos: 'ST'  }, { name: 'M. Buendía',      pos: 'CAM' }],
  'Tottenham Hotspur':  [{ name: 'H. Son',             pos: 'LW'  }, { name: 'D. Solanke',      pos: 'ST'  }],
  'Manchester United':  [{ name: 'R. Højlund',         pos: 'ST'  }, { name: 'B. Fernandes',    pos: 'CAM' }],
  'Brighton':           [{ name: 'J. Pedro',           pos: 'ST'  }, { name: 'S. Mitoma',       pos: 'LW'  }],
  'Bournemouth':        [{ name: 'E. Christie',        pos: 'ST'  }, { name: 'D. Semenyo',      pos: 'RW'  }],
  'Crystal Palace':     [{ name: 'J. Mateta',          pos: 'ST'  }, { name: 'E. Eze',          pos: 'CAM' }],
  'Brentford':          [{ name: 'B. Mbeumo',          pos: 'RW'  }, { name: 'Y. Wissa',        pos: 'ST'  }],
  'Fulham':             [{ name: 'R. Jiménez',         pos: 'ST'  }, { name: 'A. Pereira',      pos: 'CAM' }],
  'Everton':            [{ name: 'D. Calvert-Lewin',   pos: 'ST'  }, { name: 'B. McNeil',       pos: 'RW'  }],
  'Wolves':             [{ name: 'M. Cunha',           pos: 'CAM' }, { name: 'J. Strand Larsen',pos: 'ST'  }],
  'Nottingham Forest':  [{ name: 'C. Wood',            pos: 'ST'  }, { name: 'M. Gibbs-White',  pos: 'CAM' }],
  'West Ham United':    [{ name: 'M. Antonio',         pos: 'ST'  }, { name: 'J. Ward-Prowse',  pos: 'CAM' }],
  'Leeds United':       [{ name: 'P. Bamford',         pos: 'ST'  }, { name: 'C. Gnonto',       pos: 'LW'  }],
  'Sunderland':         [{ name: 'R. Stewart',         pos: 'CAM' }, { name: 'E. Embleton',     pos: 'CM'  }],
}

export function awardStats(slots, matches, rng, getOpponentPlayers) {
  const filled = slots.filter(s => s.player)
  if (!filled.length) return { goldenBoot: null, playerOfSeason: null, playerOfTournament: null, playmaker: null, goldenGlove: null, matchScorers: matches.map(() => []) }
  const gw = filled.map(s => GOAL_W[s.position] ?? 3)
  const aw = filled.map(s => ASSIST_W[s.position] ?? 4)
  const pg = new Array(filled.length).fill(0)
  const pa = new Array(filled.length).fill(0)
  // Opponent goal totals accumulated across all matches, keyed by `name|team`
  const oppAcc = new Map()
  const matchScorers = []
  for (const m of matches) {
    // Your team's goals
    const scorers = []
    for (let g = 0; g < m.gf; g++) {
      const si = pickWeighted(gw, rng)
      pg[si]++
      scorers.push(filled[si].player.name)
      if (rng() < 0.78 && filled.length > 1) pa[pickWeighted(aw, rng, si)]++
    }
    matchScorers.push(scorers)
    // Opponent goals distributed to their known players
    if (m.ga > 0 && getOpponentPlayers) {
      const ops = getOpponentPlayers(m.opponent) || []
      if (ops.length) {
        const ow = ops.map(p => GOAL_W[p.pos] ?? 10)
        for (let g = 0; g < m.ga; g++) {
          const oi = pickWeighted(ow, rng)
          const op = ops[oi]
          const key = `${op.name}|${m.opponent}`
          if (!oppAcc.has(key)) oppAcc.set(key, { name: op.name, position: op.pos, team: m.opponent, goals: 0, assists: 0 })
          oppAcc.get(key).goals++
          if (rng() < 0.78 && ops.length > 1) {
            const ap = ops[pickWeighted(ow, rng, oi)]
            const akey = `${ap.name}|${m.opponent}`
            if (!oppAcc.has(akey)) oppAcc.set(akey, { name: ap.name, position: ap.pos, team: m.opponent, goals: 0, assists: 0 })
            oppAcc.get(akey).assists++
          }
        }
      }
    }
  }
  const yourStats = filled.map((s, i) => ({
    name: s.player.name, position: s.position, team: null, nation: s.player.nation ?? null,
    goals: pg[i], assists: pa[i], contributions: pg[i] + pa[i],
  }))
  const oppStats = [...oppAcc.values()].map(o => ({ ...o, contributions: o.goals + o.assists }))
  const allStats = [...yourStats, ...oppStats]
  const goldenBoot     = allStats.reduce((b, p) => p.goals         > b.goals         ? p : b, allStats[0])
  const playerOfSeason = allStats.reduce((b, p) => p.contributions > b.contributions ? p : b, allStats[0])
  const playmaker      = allStats.reduce((b, p) => p.assists       > b.assists       ? p : b, allStats[0])

  const cleanSheetsCount = matches.filter(m => m.ga === 0).length
  const gkFilled = filled.find(s => s.position === 'GK')
  const goldenGlove = gkFilled ? {
    name: gkFilled.player.name, position: 'GK', team: null,
    nation: gkFilled.player.nation ?? null, cleanSheets: cleanSheetsCount,
  } : null

  return { goldenBoot, playerOfSeason, playerOfTournament: playerOfSeason, playmaker, goldenGlove, matchScorers }
}
