import { calculateGroupScores, calculateTeamScore } from '../utils/scoring'

export const ALL_ACHIEVEMENTS = [
  // ── Top squad ──────────────────────────────────────────────────────────────
  { id: 'golden_squad',    icon: '👑', label: 'Golden Squad',      desc: 'Team OVR 90+',                    category: 'squad' },
  { id: 'world_class',     icon: '🌟', label: 'World Class',       desc: 'Team OVR 85–89',                  category: 'squad' },
  { id: 'solid_side',      icon: '💪', label: 'Solid Side',        desc: 'Team OVR 80–84',                  category: 'squad' },
  // ── Department excellence ──────────────────────────────────────────────────
  { id: 'brick_wall',      icon: '🧤', label: 'Brick Wall',        desc: 'Goalkeeper rated 90+',            category: 'squad' },
  { id: 'iron_curtain',    icon: '🧱', label: 'Iron Curtain',      desc: 'Defence rated 90+',               category: 'squad' },
  { id: 'maestros',        icon: '🎩', label: 'Midfield Maestros', desc: 'Midfield rated 90+',              category: 'squad' },
  { id: 'clinical',        icon: '🎯', label: 'Clinical',          desc: 'Attack rated 90+',                category: 'squad' },
  // ── Bad squads ─────────────────────────────────────────────────────────────
  { id: 'group_exit',      icon: '😬', label: 'Going Home Early',  desc: 'Group Stage Exit',                category: 'funny' },
  { id: 'bus_parked',      icon: '🚌', label: 'Park the Bus',      desc: 'DEF 80+ but ATT below 65',        category: 'funny' },
  { id: 'leaky_defence',   icon: '🕳️', label: 'Leaky Defence',     desc: 'GK + DEF both below 65',          category: 'funny' },
  { id: 'pub_team',        icon: '🍺', label: 'Pub Team',          desc: 'Team OVR below 65',               category: 'funny' },
  { id: 'sunday_league',   icon: '⛅', label: 'Sunday League',     desc: 'Team OVR below 55',               category: 'funny' },
  // ── Diversity / collection ─────────────────────────────────────────────────
  { id: 'united_nations',  icon: '🌍', label: 'United Nations',    desc: '11 players from 11 different nations', category: 'collection' },
  { id: 'one_flag',        icon: '🏳️', label: 'One Flag',          desc: 'All 11 from the same nation',     category: 'collection' },
  { id: 'time_traveller',  icon: '⏳', label: 'Time Traveller',    desc: 'Players from 5+ different years', category: 'collection' },
  { id: 'vintage',         icon: '🏛️', label: 'Vintage',           desc: 'Has a player from 1986 or 1990',  category: 'collection' },
  { id: 'euro_only',       icon: '🇪🇺', label: 'Pure Euro',         desc: 'All 11 from EURO tournaments',    category: 'collection' },
  { id: 'wc_only',         icon: '🏆', label: 'World Cup Purist',  desc: 'All 11 from WC tournaments',      category: 'collection' },
  { id: 'mixed_bag',       icon: '🎲', label: 'Mixed Bag',         desc: 'At least one WC and one EURO player', category: 'collection' },
  { id: 'six_nations',     icon: '🗺️', label: 'Continental Draft', desc: 'Players from 6+ different nations', category: 'collection' },
  // ── Modes / challenges ─────────────────────────────────────────────────────
  { id: 'pure',            icon: '✨', label: 'Pure Draft',        desc: 'Completed with 0 skips (Classic/Expert)', category: 'challenge' },
  { id: 'hardcore_hero',   icon: '💀', label: 'Hardcore Hero',     desc: 'Finished Hardcore with OVR 80+',   category: 'challenge' },
  { id: 'hardcore_legend', icon: '☠️', label: 'Hardcore Legend',   desc: 'Finished Hardcore with OVR 88+',   category: 'challenge' },
  { id: 'daily_legend',    icon: '⭐', label: 'Daily Legend',      desc: 'Daily challenge with OVR 88+',     category: 'challenge' },
  { id: 'daily_winner',    icon: '🥇', label: 'Daily Winner',      desc: 'Daily challenge OVR 90+',          category: 'challenge' },
  // ── Leaderboard ────────────────────────────────────────────────────────────
  { id: 'top_10',          icon: '🏅', label: 'Top 10',            desc: 'Leaderboard position 1–10',        category: 'leaderboard' },
  { id: 'top_3',           icon: '🥉', label: 'Podium',            desc: 'Leaderboard position 1–3',         category: 'leaderboard' },
  { id: 'champion',        icon: '🎖️', label: 'Champion',          desc: '#1 on the leaderboard',            category: 'leaderboard' },
  // ── Streak ─────────────────────────────────────────────────────────────────
  { id: 'streak_3',        icon: '🔥', label: 'On Fire',           desc: '3-day daily streak',               category: 'streak' },
  { id: 'streak_7',        icon: '🔥🔥', label: 'Week Warrior',    desc: '7-day daily streak',               category: 'streak' },
  { id: 'streak_30',       icon: '🔥🔥🔥', label: 'Obsessed',      desc: '30-day daily streak',              category: 'streak' },
]

function calcCheck(slots, config, g, score) {
  const players = slots.filter(s => s.player)
  const nations = new Set(players.map(s => s.player.nation))
  const years = new Set(players.map(s => s.player.year))
  const tournaments = new Set(players.map(s => s.player.tournament))

  const checks = {
    golden_squad:    () => score >= 90,
    world_class:     () => score >= 85 && score < 90,
    solid_side:      () => score >= 80 && score < 85,
    brick_wall:      () => (g.GK ?? 0) >= 90,
    iron_curtain:    () => (g.DEF ?? 0) >= 90,
    maestros:        () => (g.MID ?? 0) >= 90,
    clinical:        () => (g.ATT ?? 0) >= 90,
    group_exit:      () => score < 58,
    bus_parked:      () => (g.DEF ?? 0) >= 80 && (g.ATT ?? 99) < 65,
    leaky_defence:   () => (g.GK ?? 99) < 65 && (g.DEF ?? 99) < 65,
    pub_team:        () => score < 65 && score >= 55,
    sunday_league:   () => score < 55,
    united_nations:  () => players.length === 11 && nations.size === 11,
    one_flag:        () => players.length === 11 && nations.size === 1,
    time_traveller:  () => years.size >= 5,
    vintage:         () => players.some(s => s.player.year <= 1990),
    euro_only:       () => players.length === 11 && !players.some(s => s.player.tournament === 'WC'),
    wc_only:         () => players.length === 11 && !players.some(s => s.player.tournament === 'EURO'),
    mixed_bag:       () => tournaments.has('WC') && tournaments.has('EURO'),
    six_nations:     () => nations.size >= 6,
    pure:            () => (config?.skipsUsed ?? 0) === 0 && config?.mode !== 'hardcore',
    hardcore_hero:   () => config?.mode === 'hardcore' && score >= 80,
    hardcore_legend: () => config?.mode === 'hardcore' && score >= 88,
    daily_legend:    () => config?.mode === 'daily' && score >= 88,
    daily_winner:    () => config?.mode === 'daily' && score >= 90,
    streak_3:        () => (config?.streak ?? 0) >= 3,
    streak_7:        () => (config?.streak ?? 0) >= 7,
    streak_30:       () => (config?.streak ?? 0) >= 30,
    // leaderboard ones passed in via config
    top_10:          () => (config?.leaderboardPos ?? 999) <= 10,
    top_3:           () => (config?.leaderboardPos ?? 999) <= 3,
    champion:        () => (config?.leaderboardPos ?? 999) === 1,
  }

  return ALL_ACHIEVEMENTS.filter(a => {
    try { return checks[a.id]?.() ?? false } catch { return false }
  })
}

export function getAchievements(slots, config) {
  const g = calculateGroupScores(slots)
  const score = calculateTeamScore(slots)
  return calcCheck(slots, config, g, score)
}

// Load all unlocked achievements from localStorage
export function getUnlockedAchievements() {
  try { return JSON.parse(localStorage.getItem('ltt_achievements')) || [] }
  catch { return [] }
}

export function saveAchievements(newOnes) {
  const existing = new Set(getUnlockedAchievements())
  newOnes.forEach(a => existing.add(a.id))
  localStorage.setItem('ltt_achievements', JSON.stringify([...existing]))
}
