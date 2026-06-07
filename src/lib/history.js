const KEY = 'ltt_history'
const MAX = 10

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(KEY)) || [] }
  catch { return [] }
}

export function saveToHistory({ slots, formation, mode, score, tier, seed }) {
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    formation,
    mode,
    score,
    tier,
    seed: seed || null,
    players: slots.filter(s => s.player).map(s => ({
      slotId: s.id,
      position: s.position,
      group: s.group,
      x: s.x, y: s.y,
      player: s.player,
    })),
  }
  const history = getHistory()
  history.unshift(entry)
  localStorage.setItem(KEY, JSON.stringify(history.slice(0, MAX)))
  return entry
}
