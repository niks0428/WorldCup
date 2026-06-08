// Challenge win streak — consecutive wins in head-to-head challenges.
// Unlike the daily streak, this NEVER decays with time: it only resets when you
// lose a challenge (your score doesn't beat the challenger's). `best` is the
// all-time high and is never lowered.
const KEY = 'ltt_challenge_streak'
const LAST_SEED_KEY = 'ltt_last_challenge_seed'

export function getChallengeStreak() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || { streak: 0, best: 0 }
  } catch { return { streak: 0, best: 0 } }
}

// Record the outcome of a challenge. Win → streak + 1; loss → reset to 0.
// `best` tracks the highest streak ever reached. Returns the updated record.
export function recordChallengeResult(won) {
  const data = getChallengeStreak()
  const streak = won ? data.streak + 1 : 0
  const best = Math.max(data.best || 0, streak)
  const updated = { streak, best }
  try { localStorage.setItem(KEY, JSON.stringify(updated)) } catch {}
  return updated
}

export function getLastChallengeSeed() {
  try { return localStorage.getItem(LAST_SEED_KEY) || null } catch { return null }
}

export function setLastChallengeSeed(seed) {
  try { if (seed) localStorage.setItem(LAST_SEED_KEY, seed) } catch {}
}
