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
  const streak = data.last === yesterday ? data.streak + 1 : 1
  const updated = { streak, last: today }
  localStorage.setItem(KEY, JSON.stringify(updated))
  return updated
}
