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

function base(str) {
  let s = str.toLowerCase()
  s = s.replace(/[01!345$789@+]/g, ch => SUBS[ch] || ch)
  return s.replace(/[^a-z]/g, '')
}
function collapse(s) {
  return s.replace(/(.)\1+/g, '$1')
}

export function isNameClean(name) {
  if (!name || !name.trim()) return false
  const form1 = base(name)            // "fuuuck" stays, "nigga" stays
  const form2 = collapse(form1)        // "fuuuck" -> "fuck", "nigga" -> "niga"
  if (!form1) return false
  // A word is a hit if it appears in the raw form, OR its own collapsed
  // form appears in the collapsed input (catches both "nigga" and "fuuuck").
  return !BLOCKED.some(word => form1.includes(word) || form2.includes(collapse(word)))
}

// Returns { ok, reason } for UI feedback
export function validateName(name) {
  const trimmed = (name || '').trim()
  if (!trimmed) return { ok: false, reason: 'Enter a name.' }
  if (trimmed.length < 2) return { ok: false, reason: 'Name too short.' }
  if (!isNameClean(trimmed)) return { ok: false, reason: 'Please choose a cleaner name.' }
  return { ok: true, reason: '' }
}
