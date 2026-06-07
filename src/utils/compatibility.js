const COMPATIBLE_MAP = {
  GK:  { GK: 1.0 },
  CB:  { CB: 1.0, CDM: 0.85, RB: 0.85, LB: 0.85, RWB: 0.85, LWB: 0.85 },
  RB:  { RB: 1.0, RWB: 1.0, RM: 0.85, CB: 0.85 },
  LB:  { LB: 1.0, LWB: 1.0, LM: 0.85, CB: 0.85 },
  RWB: { RWB: 1.0, RB: 1.0, RM: 0.85 },
  LWB: { LWB: 1.0, LB: 1.0, LM: 0.85 },
  CDM: { CDM: 1.0, CM: 0.85, CB: 0.85 },
  CM:  { CM: 1.0, CDM: 0.85, CAM: 0.85, RM: 0.85, LM: 0.85 },
  CAM: { CAM: 1.0, CM: 0.85, RW: 0.85, LW: 0.85, ST: 0.85 },
  RM:  { RM: 1.0, RW: 1.0, CM: 0.85, RB: 0.85 },
  LM:  { LM: 1.0, LW: 1.0, CM: 0.85, LB: 0.85 },
  RW:  { RW: 1.0, RM: 1.0, LW: 0.85, CAM: 0.85, ST: 0.85 },
  LW:  { LW: 1.0, LM: 1.0, RW: 0.85, CAM: 0.85, ST: 0.85 },
  ST:  { ST: 1.0, LW: 0.85, RW: 0.85, CAM: 0.85 },
}

export function getFitMultiplier(slotPosition, playerPositions) {
  const map = COMPATIBLE_MAP[slotPosition] || {}
  let best = 0.6
  for (const pos of playerPositions) {
    const score = map[pos] ?? 0.6
    if (score > best) best = score
  }
  return best
}

export function canPlayInSlot(slotPosition, playerPositions) {
  return getFitMultiplier(slotPosition, playerPositions) >= 0.85
}

export function filterSquadForSlot(players, slotPosition) {
  return players.filter(p => canPlayInSlot(slotPosition, p.positions))
}
