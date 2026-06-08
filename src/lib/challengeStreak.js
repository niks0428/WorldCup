// Challenge win streak — consecutive wins in head-to-head challenges.
// Tracked per competition ('wc' | 'pl') so a loss in one never resets the other.
// Unlike the daily streak, this NEVER decays with time: it only resets when you
// lose a challenge (your score doesn't beat the challenger's). `best` is the
// all-time high and is never lowered.
const KEY = 'ltt_challenge_streak'
const LAST_SEED_KEY = 'ltt_last_challenge_seed'

function comp(c) { return c === 'pl' ? 'pl' : 'wc' }

// Read the per-competition map, migrating the legacy flat { streak, best }
// shape (which was World Cup only) into { wc: {...} } on first read.
function readAll() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (!raw || typeof raw !== 'object') return {}
    if (typeof raw.streak === 'number') return { wc: { streak: raw.streak, best: raw.best || 0 } }
    return raw
  } catch { return {} }
}

export function getChallengeStreak(competition = 'wc') {
  return readAll()[comp(competition)] || { streak: 0, best: 0 }
}

// Record the outcome of a challenge. Win → streak + 1; loss → reset to 0.
// `best` tracks the highest streak ever reached. Returns the updated record.
export function recordChallengeResult(won, competition = 'wc') {
  const all = readAll()
  const c = comp(competition)
  const cur = all[c] || { streak: 0, best: 0 }
  const streak = won ? cur.streak + 1 : 0
  const best = Math.max(cur.best || 0, streak)
  all[c] = { streak, best }
  try { localStorage.setItem(KEY, JSON.stringify(all)) } catch {}
  return all[c]
}

export function getLastChallengeSeed() {
  try { return localStorage.getItem(LAST_SEED_KEY) || null } catch { return null }
}

export function setLastChallengeSeed(seed) {
  try { if (seed) localStorage.setItem(LAST_SEED_KEY, seed) } catch {}
}
