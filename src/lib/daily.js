const KEY = 'ltt_daily_done'

// Records the date string of the last completed daily challenge.
export function markDailyDone() {
  try { localStorage.setItem(KEY, new Date().toISOString().split('T')[0]) } catch {}
}

export function isDailyDoneToday() {
  try { return localStorage.getItem(KEY) === new Date().toISOString().split('T')[0] }
  catch { return false }
}

// ms until next local midnight, formatted as "Hh Mm"
export function timeUntilNextDaily() {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setHours(24, 0, 0, 0)
  const ms = tomorrow - now
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return { ms, label: `${h}h ${m}m` }
}
