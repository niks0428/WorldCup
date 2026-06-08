// Where a player can play, keyed by the player's natural position.
// Every slot a player is eligible for counts as natural (1.0) — no penalty
// for alternative positions. Anything not listed falls through to
// INCOMPATIBLE (0.6) and can't be selected.
const PLAYER_CAN_PLAY = {
  GK:  { GK: 1.0 },
  CB:  { CB: 1.0 },
  RB:  { RB: 1.0, RWB: 1.0 },
  LB:  { LB: 1.0, LWB: 1.0 },
  CDM: { CDM: 1.0, CM: 1.0, CB: 1.0 },
  CM:  { CM: 1.0, CAM: 1.0, CDM: 1.0 },
  CAM: { CAM: 1.0, CF: 1.0, CM: 1.0 },
  RM:  { RM: 1.0, RW: 1.0 },
  LM:  { LM: 1.0, LW: 1.0 },
  RW:  { RW: 1.0, RM: 1.0 },
  LW:  { LW: 1.0, LM: 1.0 },
  CF:  { CF: 1.0, ST: 1.0, CAM: 1.0 },
  ST:  { ST: 1.0, CF: 1.0 },
}

const INCOMPATIBLE = 0.6

export function getFitMultiplier(slotPosition, playerPositions) {
  let best = INCOMPATIBLE
  for (const pos of playerPositions) {
    const score = PLAYER_CAN_PLAY[pos]?.[slotPosition] ?? INCOMPATIBLE
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

// Every real slot position a player can be placed in, natural position(s) first.
// Derived from PLAYER_CAN_PLAY so it matches the eligibility rules exactly. CF is
// omitted because no formation actually has a CF slot (the CF map row is inert).
export function getPlayablePositions(playerPositions) {
  const out = []
  for (const pos of playerPositions) {
    if (!out.includes(pos)) out.push(pos) // natural first
    for (const slot of Object.keys(PLAYER_CAN_PLAY[pos] || {})) {
      if (!out.includes(slot)) out.push(slot)
    }
  }
  return out.filter(p => p !== 'CF')
}
