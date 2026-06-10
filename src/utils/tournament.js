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

// Two representative players per nation so opponent goals can be attributed
// to a real player for the Golden Boot / Player of the Tournament.
const WC_NATION_PLAYERS = {
  // Group-stage opponents
  'Australia':    [{ name: 'M. Leckie',      pos: 'RW'  }, { name: 'A. Hrustic',    pos: 'CM'  }],
  'Japan':        [{ name: 'A. Mitoma',      pos: 'LW'  }, { name: 'D. Ito',        pos: 'RW'  }],
  'South Korea':  [{ name: 'H. Son',         pos: 'LW'  }, { name: 'H. Hwang',      pos: 'ST'  }],
  'USA':          [{ name: 'C. Pulisic',     pos: 'LW'  }, { name: 'F. Weah',       pos: 'RW'  }],
  'Mexico':       [{ name: 'H. Lozano',      pos: 'RW'  }, { name: 'R. Jiménez',    pos: 'ST'  }],
  'Iceland':      [{ name: 'A. Sigurdsson',  pos: 'ST'  }, { name: 'G. Sigurdsson', pos: 'CAM' }],
  'Senegal':      [{ name: 'S. Mané',        pos: 'LW'  }, { name: 'I. Sarr',       pos: 'RW'  }],
  'Ghana':        [{ name: 'J. Ayew',        pos: 'ST'  }, { name: 'T. Partey',     pos: 'CDM' }],
  'Cameroon':     [{ name: 'V. Aboubakar',   pos: 'ST'  }, { name: 'B. Hongla',     pos: 'CM'  }],
  'Morocco':      [{ name: 'H. Ziyech',      pos: 'CAM' }, { name: 'Y. En-Nesyri',  pos: 'ST'  }],
  'Poland':       [{ name: 'R. Lewandowski', pos: 'ST'  }, { name: 'P. Zielinski',  pos: 'CAM' }],
  'Sweden':       [{ name: 'A. Isak',        pos: 'ST'  }, { name: 'D. Kulusevski', pos: 'RW'  }],
  'Switzerland':  [{ name: 'G. Xhaka',       pos: 'CM'  }, { name: 'B. Embolo',     pos: 'ST'  }],
  'Denmark':      [{ name: 'C. Eriksen',     pos: 'CAM' }, { name: 'M. Damsgaard',  pos: 'LW'  }],
  'Austria':      [{ name: 'M. Sabitzer',    pos: 'CM'  }, { name: 'C. Gregoritsch',pos: 'ST'  }],
  'Serbia':       [{ name: 'A. Mitrovic',    pos: 'ST'  }, { name: 'D. Tadic',      pos: 'CAM' }],
  'Chile':        [{ name: 'A. Sanchez',     pos: 'LW'  }, { name: 'B. Diaz',       pos: 'ST'  }],
  'Algeria':      [{ name: 'R. Mahrez',      pos: 'RW'  }, { name: 'Y. Benrahma',   pos: 'LW'  }],
  'Ukraine':      [{ name: 'A. Yarmolenko',  pos: 'RW'  }, { name: 'R. Yaremchuk',  pos: 'ST'  }],
  // Elite (knockout) opponents
  'Brazil':       [{ name: 'V. Jr.',         pos: 'LW'  }, { name: 'R. Firmino',    pos: 'ST'  }],
  'Argentina':    [{ name: 'J. Alvarez',     pos: 'ST'  }, { name: 'A. Mac Allister',pos: 'CM' }],
  'France':       [{ name: 'K. Mbappe',      pos: 'ST'  }, { name: 'A. Griezmann',  pos: 'CAM' }],
  'Germany':      [{ name: 'K. Havertz',     pos: 'ST'  }, { name: 'J. Musiala',    pos: 'CAM' }],
  'Spain':        [{ name: 'A. Yamal',       pos: 'RW'  }, { name: 'A. Morata',     pos: 'ST'  }],
  'Italy':        [{ name: 'G. Scamacca',    pos: 'ST'  }, { name: 'F. Chiesa',     pos: 'RW'  }],
  'Netherlands':  [{ name: 'C. Gakpo',       pos: 'LW'  }, { name: 'M. Depay',      pos: 'ST'  }],
  'Portugal':     [{ name: 'C. Ronaldo',     pos: 'ST'  }, { name: 'B. Silva',      pos: 'CAM' }],
  'England':      [{ name: 'H. Kane',        pos: 'ST'  }, { name: 'B. Saka',       pos: 'RW'  }],
  'Belgium':      [{ name: 'R. Lukaku',      pos: 'ST'  }, { name: 'K. De Bruyne',  pos: 'CAM' }],
  'Uruguay':      [{ name: 'D. Nunez',       pos: 'ST'  }, { name: 'F. Valverde',   pos: 'CM'  }],
  'Croatia':      [{ name: 'I. Perisic',     pos: 'LW'  }, { name: 'A. Kramanic',   pos: 'ST'  }],
  // Additional nations (Euro + extended WC pool)
  'Czech Republic':      [{ name: 'P. Schick',      pos: 'ST'  }, { name: 'T. Soucek',      pos: 'CM'  }],
  'Turkey':              [{ name: 'A. Guler',       pos: 'CAM' }, { name: 'B. Yilmaz',      pos: 'ST'  }],
  'Hungary':             [{ name: 'D. Szoboszlai',  pos: 'CAM' }, { name: 'M. Varga',       pos: 'ST'  }],
  'Romania':             [{ name: 'I. Hagi',        pos: 'CAM' }, { name: 'G. Puscas',      pos: 'ST'  }],
  'Slovakia':            [{ name: 'O. Duda',        pos: 'CM'  }, { name: 'D. Bozenik',     pos: 'ST'  }],
  'Albania':             [{ name: 'A. Broja',       pos: 'ST'  }, { name: 'E. Bajrami',     pos: 'CAM' }],
  'Georgia':             [{ name: 'K. Kvaratskhelia',pos: 'LW' }, { name: 'G. Mikautadze',  pos: 'ST'  }],
  'Slovenia':            [{ name: 'B. Sesko',       pos: 'ST'  }, { name: 'J. Bijol',       pos: 'CB'  }],
  'Scotland':            [{ name: 'L. McTominay',   pos: 'CM'  }, { name: 'C. Adams',       pos: 'ST'  }],
  'Norway':              [{ name: 'E. Haaland',     pos: 'ST'  }, { name: 'M. Odegaard',    pos: 'CAM' }],
  'Wales':               [{ name: 'G. Bale',        pos: 'LW'  }, { name: 'D. James',       pos: 'RW'  }],
  'Russia':              [{ name: 'A. Golovin',     pos: 'CAM' }, { name: 'A. Dzyuba',      pos: 'ST'  }],
  'Bosnia & Herzegovina':[{ name: 'E. Dzeko',       pos: 'ST'  }, { name: 'M. Pjanic',      pos: 'CM'  }],
  'North Macedonia':     [{ name: 'E. Elmas',       pos: 'CAM' }, { name: 'A. Trajkovski',  pos: 'RW'  }],
  'Finland':             [{ name: 'T. Pukki',       pos: 'ST'  }, { name: 'G. Kamara',      pos: 'CM'  }],
  'Greece':              [{ name: 'K. Mitroglu',    pos: 'ST'  }, { name: 'K. Fortounis',   pos: 'CAM' }],
  'Ireland':             [{ name: 'T. Parrott',     pos: 'ST'  }, { name: 'A. Browne',      pos: 'CM'  }],
  'Northern Ireland':    [{ name: 'J. Magennis',    pos: 'ST'  }, { name: 'S. Davis',       pos: 'CM'  }],
  'Colombia':            [{ name: 'L. Diaz',        pos: 'LW'  }, { name: 'R. Falcao',      pos: 'ST'  }],
  'Ecuador':             [{ name: 'E. Caicedo',     pos: 'CM'  }, { name: 'A. Delgado',     pos: 'ST'  }],
  'Tunisia':             [{ name: 'Y. Msakni',      pos: 'LW'  }, { name: 'W. Khazri',      pos: 'CAM' }],
  'Nigeria':             [{ name: 'V. Osimhen',     pos: 'ST'  }, { name: 'A. Lookman',     pos: 'LW'  }],
  'Egypt':               [{ name: 'M. Salah',       pos: 'RW'  }, { name: 'T. Mohamed',     pos: 'ST'  }],
  'Qatar':               [{ name: 'A. Al-Moez',     pos: 'ST'  }, { name: 'H. Al-Haydos',   pos: 'CAM' }],
  'Iran':                [{ name: 'M. Taremi',      pos: 'ST'  }, { name: 'A. Ansarifard',  pos: 'ST'  }],
  'Saudi Arabia':        [{ name: 'S. Al-Dawsari',  pos: 'LW'  }, { name: 'F. Al-Buraikan', pos: 'ST'  }],
  'Canada':              [{ name: 'A. Davies',      pos: 'LB'  }, { name: 'J. David',       pos: 'ST'  }],
  'Peru':                [{ name: 'P. Guerrero',    pos: 'ST'  }, { name: 'C. Cueva',       pos: 'CAM' }],
  'Panama':              [{ name: 'R. Torres',      pos: 'ST'  }, { name: 'A. Murillo',     pos: 'CB'  }],
  'Honduras':            [{ name: 'A. Lozano',      pos: 'LW'  }, { name: 'R. Quioto',      pos: 'RW'  }],
  'New Zealand':         [{ name: 'C. Wood',        pos: 'ST'  }, { name: 'R. De Vries',    pos: 'CM'  }],
  'Latvia':              [{ name: 'R. Ikaunieks',   pos: 'LW'  }, { name: 'M. Emsis',       pos: 'CM'  }],
}

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

  const { goldenBoot, playerOfTournament, playmaker, goldenGlove, matchScorers } = awardStats(slots, matches, rng, name => WC_NATION_PLAYERS[name] ?? [])
  matchScorers.forEach((s, i) => { if (matches[i]) matches[i].scorers = s })
  return { tier: tierLabel, tierMeta: TIER_META[tierLabel], matches, goalsFor, goalsAgainst, goldenBoot, playerOfTournament, playmaker, goldenGlove }
}
