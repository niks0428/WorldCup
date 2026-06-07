export const SUPABASE_URL = 'https://cpjulzgpmyekxlwnfrbv.supabase.co'
export const SUPABASE_ANON_KEY = 'sb_publishable_rHX4oo8e0KXgVpmmHPsaFQ_kmpoJ2Ml'

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

function headers() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }
}

function reprHeaders() {
  return { ...headers(), Prefer: 'return=representation' }
}

// ── Scores ────────────────────────────────────────────────────────────────────

export async function submitScore({ playerName, score, tier, formation, mode, squadUrl, seed, challengeDate, groupCode, streak }) {
  const body = { player_name: playerName, score, tier, formation, mode, squad_url: squadUrl }
  if (seed)          body.seed = seed
  if (challengeDate) body.challenge_date = challengeDate
  if (groupCode)     body.group_code = groupCode
  if (streak)        body.streak = streak

  const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`)
}

export async function fetchScores({ modeFilter = 'all', timeFilter = 'alltime', seed, groupCode } = {}) {
  const params = new URLSearchParams()
  params.set('select', '*')
  params.set('order', 'score.desc,created_at.asc')
  params.set('limit', '50')

  if (groupCode) {
    params.set('group_code', `eq.${groupCode}`)
  } else if (seed) {
    params.set('seed', `eq.${seed}`)
  } else {
    if (modeFilter !== 'all') params.set('mode', `eq.${modeFilter}`)
    if (timeFilter === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      params.set('created_at', `gte.${weekAgo}`)
    } else if (timeFilter === 'daily') {
      const today = new Date().toISOString().split('T')[0]
      params.set('challenge_date', `eq.${today}`)
      params.set('mode', 'eq.daily')
    }
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?${params}`, { headers: headers() })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  return res.json()
}

// ── Groups ────────────────────────────────────────────────────────────────────

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function createGroup(name) {
  const code = randomCode()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/groups`, {
    method: 'POST',
    headers: reprHeaders(),
    body: JSON.stringify({ name, code }),
  })
  if (!res.ok) throw new Error(`Create group failed: ${res.status}`)
  const [data] = await res.json()
  return data
}

export async function getGroup(code) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/groups?code=eq.${code.toUpperCase()}&select=*`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error('Failed to fetch group')
  const data = await res.json()
  return data[0] || null
}
