// Daily-challenge day streak, tracked per competition. World Cup keeps the
// legacy key; Premier League gets its own, so the two streaks are independent.
function key(competition) {
  return competition === 'pl' ? 'ltt_streak_pl' : 'ltt_streak'
}

export function getStreak(competition = 'wc') {
  try {
    return JSON.parse(localStorage.getItem(key(competition))) || { streak: 0, last: '' }
  } catch { return { streak: 0, last: '' } }
}

export function updateStreak(competition = 'wc') {
  const today = new Date().toISOString().split('T')[0]
  const data = getStreak(competition)
  if (data.last === today) return data  // already played today, don't double-count

  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]

  // One missed day is forgiven — streak continues if last play was
  // yesterday OR the day before (a single skipped day).
  const continues = data.last === yesterday || data.last === twoDaysAgo
  const streak = continues ? data.streak + 1 : 1

  const updated = { streak, last: today }
  localStorage.setItem(key(competition), JSON.stringify(updated))
  return updated
}
