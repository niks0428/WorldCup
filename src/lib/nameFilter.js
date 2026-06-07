// Lightweight profanity filter for public leaderboard / group names.
// Normalises common letter-substitutions, then checks a blocklist.

// Strong terms — blocked anywhere in the string (slurs + hard profanity).
const BLOCKED = [
  'fuck', 'shit', 'cunt', 'bitch', 'bastard', 'dick', 'cock', 'pussy',
  'piss', 'wank', 'twat', 'bollock', 'prick', 'slut', 'whore', 'nonce',
  'nigger', 'nigga', 'faggot', 'fag', 'retard', 'spastic', 'paki',
  'chink', 'kike', 'wop', 'spic', 'coon', 'tranny', 'dyke', 'queer',
  'rape', 'rapist', 'nazi', 'hitler', 'kkk', 'pedo', 'paedo',
  'cum', 'jizz', 'dildo', 'boner', 'anus', 'arsehole', 'asshole',
  'motherfucker', 'wanker', 'shag', 'bellend', 'knob', 'minge',
]

// Leetspeak / substitution map
const SUBS = {
  '0': 'o', '1': 'i', '!': 'i', '3': 'e', '4': 'a', '@': 'a',
  '5': 's', '$': 's', '7': 't', '8': 'b', '9': 'g', '+': 't',
}

function normalise(str) {
  let s = str.toLowerCase()
  // apply substitutions
  s = s.replace(/[01!345$789@+]/g, ch => SUBS[ch] || ch)
  // strip everything except letters
  s = s.replace(/[^a-z]/g, '')
  // collapse repeated letters (e.g. "fuuuck" -> "fuck")
  s = s.replace(/(.)\1+/g, '$1')
  return s
}

export function isNameClean(name) {
  if (!name || !name.trim()) return false
  const norm = normalise(name)
  if (!norm) return false
  return !BLOCKED.some(word => norm.includes(word))
}

// Returns { ok, reason } for UI feedback
export function validateName(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return { ok: false, reason: 'Enter a name.' }
  if (trimmed.length < 2) return { ok: false, reason: 'Name too short.' }
  if (!isNameClean(trimmed)) return { ok: false, reason: 'Please choose a cleaner name.' }
  return { ok: true, reason: '' }
}
