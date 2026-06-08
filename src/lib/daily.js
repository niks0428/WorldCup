import { makeRng } from './seededRandom'

const KEY = 'ltt_daily_done'

// The daily challenge's difficulty rotates each day. It's derived from the date
// so everyone gets the same difficulty on the same day (and it's known up-front
// for display). Salted so it doesn't correlate with the spin seed (todaySeed).
export const DAILY_DIFFICULTIES = ['classic', 'expert', 'hardcore']

export function dailyDifficulty(date = new Date().toISOString().split('T')[0]) {
  const r = makeRng('difficulty|' + date)()
  return DAILY_DIFFICULTIES[Math.floor(r * DAILY_DIFFICULTIES.length)]
}

export const DIFFICULTY_LABEL = {
  classic:  '⚽ Classic',
  expert:   '🎯 Expert',
  hardcore: '💀 Hardcore',
}

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
