import { calculateGroupScores, calculateTeamScore } from '../utils/scoring'

const DEFS = [
  {
    id: 'golden_squad',
    icon: '👑',
    label: 'Golden Squad',
    desc: 'Team OVR 90+',
    check: (_s, _c, _g, score) => score >= 90,
  },
  {
    id: 'iron_curtain',
    icon: '🧱',
    label: 'Iron Curtain',
    desc: 'Defence rated 90+',
    check: (_s, _c, g) => (g.DEF ?? 0) >= 90,
  },
  {
    id: 'brick_wall',
    icon: '🧤',
    label: 'Brick Wall',
    desc: 'Goalkeeper rated 90+',
    check: (_s, _c, g) => (g.GK ?? 0) >= 90,
  },
  {
    id: 'maestros',
    icon: '🎩',
    label: 'Midfield Maestros',
    desc: 'Midfield rated 90+',
    check: (_s, _c, g) => (g.MID ?? 0) >= 90,
  },
  {
    id: 'clinical',
    icon: '🎯',
    label: 'Clinical',
    desc: 'Attack rated 90+',
    check: (_s, _c, g) => (g.ATT ?? 0) >= 90,
  },
  {
    id: 'united_nations',
    icon: '🌍',
    label: 'United Nations',
    desc: '11 players from 11 different nations',
    check: (slots) => {
      const nations = slots.filter(s => s.player).map(s => s.player.nation)
      return new Set(nations).size === 11
    },
  },
  {
    id: 'one_flag',
    icon: '🏳️',
    label: 'One Flag',
    desc: 'All 11 from the same nation',
    check: (slots) => {
      const players = slots.filter(s => s.player)
      if (players.length < 11) return false
      return new Set(players.map(s => s.player.nation)).size === 1
    },
  },
  {
    id: 'time_traveller',
    icon: '⏳',
    label: 'Time Traveller',
    desc: 'Players from 5 or more different years',
    check: (slots) => {
      const years = slots.filter(s => s.player).map(s => s.player.year)
      return new Set(years).size >= 5
    },
  },
  {
    id: 'vintage',
    icon: '🏛️',
    label: 'Vintage',
    desc: 'Includes a player from 1986 or 1990',
    check: (slots) => slots.filter(s => s.player).some(s => s.player.year <= 1990),
  },
  {
    id: 'pure',
    icon: '✨',
    label: 'Pure Draft',
    desc: 'Completed without using any skips',
    check: (_s, config) => config.skipsUsed === 0 && config.mode !== 'hardcore',
  },
  {
    id: 'hardcore_hero',
    icon: '💀',
    label: 'Hardcore Hero',
    desc: 'Completed Hardcore with OVR 80+',
    check: (_s, config, _g, score) => config.mode === 'hardcore' && score >= 80,
  },
  {
    id: 'legend',
    icon: '⭐',
    label: 'Daily Legend',
    desc: 'Daily challenge with OVR 88+',
    check: (_s, config, _g, score) => config.mode === 'daily' && score >= 88,
  },
]

export function getAchievements(slots, config) {
  const g = calculateGroupScores(slots)
  const score = calculateTeamScore(slots)
  return DEFS.filter(a => {
    try { return a.check(slots, config, g, score) } catch { return false }
  })
}

export { DEFS as ALL_ACHIEVEMENTS }
