const KEY = 'ltt_streak'

export function getStreak() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { streak: 0, last: '' }
  } catch { return { streak: 0, last: '' } }
}

export function updateStreak() {
  const today = new Date().toISOString().split('T')[0]
  const data = getStreak()
  if (data.last === today) return data  // already played today, don't double-count

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]

  // One missed day is forgiven — streak continues if last play was
  // yesterday OR the day before (a single skipped day).
  const continues = data.last === yesterday || data.last === twoDaysAgo
  const streak = continues ? data.streak + 1 : 1

  const updated = { streak, last: today }
  localStorage.setItem(KEY, JSON.stringify(updated))
  return updated
}
