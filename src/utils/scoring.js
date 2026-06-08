import { getFitMultiplier } from './compatibility'

const GROUP_WEIGHT = { GK: 0.08, DEF: 0.28, MID: 0.32, ATT: 0.32 }

const TIERS = [
  { min: 90, label: 'World Cup Winners',  emoji: '🏆', rounds: 7 },
  { min: 82, label: 'Finalists',          emoji: '🥈', rounds: 6 },
  { min: 74, label: 'Semi-finalists',     emoji: '🥉', rounds: 5 },
  { min: 66, label: 'Quarter-finalists',  emoji: '🎯', rounds: 4 },
  { min: 58, label: 'Round of 16',        emoji: '🔵', rounds: 3 },
  { min: 0,  label: 'Group Stage Exit',   emoji: '⚫', rounds: 1 },
]

export function calculateTeamScore(draftedSlots) {
  const groups = { GK: [], DEF: [], MID: [], ATT: [] }

  for (const slot of draftedSlots) {
    if (!slot.player) continue
    if (!groups[slot.group]) continue // ignore bench/SUB slots — XI only
    const mult = getFitMultiplier(slot.position, slot.player.positions)
    const weighted = slot.player.overall * mult
    groups[slot.group].push(weighted)
  }

  let score = 0
  for (const [group, weight] of Object.entries(GROUP_WEIGHT)) {
    const vals = groups[group]
    if (!vals.length) continue
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length
    score += avg * weight
  }

  return Math.round(Math.min(99, Math.max(0, score)))
}

export function calculateGroupScores(draftedSlots) {
  const groups = { GK: [], DEF: [], MID: [], ATT: [] }
  for (const slot of draftedSlots) {
    if (!slot.player) continue
    if (!groups[slot.group]) continue // ignore bench/SUB slots — XI only
    const mult = getFitMultiplier(slot.position, slot.player.positions)
    groups[slot.group].push(slot.player.overall * mult)
  }
  const out = {}
  for (const [g, vals] of Object.entries(groups)) {
    out[g] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null
  }
  return out
}

export function getTier(teamScore) {
  return TIERS.find(t => teamScore >= t.min) ?? TIERS[TIERS.length - 1]
}

export function buildShareText(tier, url = 'https://liftthetrophy.online') {
  return `I built a World Cup XI that reached the ${tier.label}. ${tier.emoji} Lift the Trophy — ${url}`
}
