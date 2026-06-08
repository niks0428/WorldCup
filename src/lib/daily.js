import { makeRng } from './seededRandom'

// Per-competition completion key. World Cup keeps the legacy key so existing
// "done today" state survives; Premier League gets its own.
function doneKey(competition) {
  return competition === 'pl' ? 'ltt_daily_done_pl' : 'ltt_daily_done'
}

// The daily challenge's difficulty rotates each day. It's derived from the date
// (so everyone gets the same difficulty on a given day) and salted by
// competition so World Cup and Premier League rotate independently — each is its
// own "different difficulty every day" sequence.
export const DAILY_DIFFICULTIES = ['classic', 'expert', 'hardcore']

export function dailyDifficulty(competition = 'wc', date = new Date().toISOString().split('T')[0]) {
  const r = makeRng(`difficulty|${competition}|${date}`)()
  return DAILY_DIFFICULTIES[Math.floor(r * DAILY_DIFFICULTIES.length)]
}

export const DIFFICULTY_LABEL = {
  classic:  '⚽ Classic',
  expert:   '🎯 Expert',
  hardcore: '💀 Hardcore',
}

// Records the date string of the last completed daily challenge for a competition.
export function markDailyDone(competition = 'wc') {
  try { localStorage.setItem(doneKey(competition), new Date().toISOString().split('T')[0]) } catch {}
}

export function isDailyDoneToday(competition = 'wc') {
  try { return localStorage.getItem(doneKey(competition)) === new Date().toISOString().split('T')[0] }
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
