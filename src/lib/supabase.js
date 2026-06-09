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

// ── Scores ────────────────────────────────────────────────────────────────────

export async function submitScore({ playerName, score, tier, formation, mode, squadUrl, seed, challengeDate, groupCode, streak, challengeStreak, competition }) {
  const body = { player_name: playerName, score, tier, formation, mode, squad_url: squadUrl }
  body.competition = competition === 'pl' ? 'pl' : 'wc'
  if (seed)          body.seed = seed
  if (challengeDate) body.challenge_date = challengeDate
  if (groupCode)     body.group_code = groupCode
  if (streak)        body.streak = streak
  if (challengeStreak != null) body.challenge_streak = challengeStreak

  const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
    method: 'POST', headers: headers(), body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`)
}

export async function fetchScores({ modeFilter = 'all', timeFilter = 'alltime', seed, groupCode, competition = 'wc' } = {}) {
  const params = new URLSearchParams()
  params.set('select', '*')
  params.set('order', 'score.desc,created_at.asc')
  params.set('limit', '50')

  if (groupCode) {
    params.set('group_code', `eq.${groupCode}`)
  } else if (seed) {
    params.set('seed', `eq.${seed}`)
  } else {
    // The two competitions are separate boards.
    params.set('competition', `eq.${competition === 'pl' ? 'pl' : 'wc'}`)
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

// Highest streaks for a given column ('challenge_streak' = head-to-head wins,
// 'streak' = daily-challenge day streak). Supabase REST can't group-by per
// player, so we pull the top rows and keep each player's best client-side.
export async function fetchTopStreaks({ limit = 20, column = 'challenge_streak', competition = 'wc' } = {}) {
  const params = new URLSearchParams()
  params.set('select', `player_name,${column},created_at`)
  params.set(column, 'gt.0')
  params.set('competition', `eq.${competition === 'pl' ? 'pl' : 'wc'}`)
  params.set('order', `${column}.desc,created_at.asc`)
  params.set('limit', '200')

  const res = await fetch(`${SUPABASE_URL}/rest/v1/scores?${params}`, { headers: headers() })
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  const rows = await res.json()

  // One entry per player — their highest streak (rows are already streak-desc).
  const best = new Map()
  for (const r of rows) {
    if (!best.has(r.player_name)) best.set(r.player_name, r)
  }
  return [...best.values()]
    .sort((a, b) => b[column] - a[column] ||
      new Date(a.created_at) - new Date(b.created_at))
    .slice(0, limit)
}

// ── H2H Sessions ──────────────────────────────────────────────────────────────

// Returns the raw session row, or null if none exists yet.
export async function getH2HSession(seed) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/h2h_sessions?seed=eq.${encodeURIComponent(seed)}&select=*`,
    { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
  )
  if (!res.ok) return null
  const data = await res.json()
  return data[0] || null
}

// Save a player's H2H entry. Returns 'p1' (created session), 'p2' (joined and
// complete), or 'full' (both slots already taken — e.g. page reload).
export async function saveH2HEntry({ seed, formation, competition, name, score, tier, squadUrl }) {
  const existing = await getH2HSession(seed)
  if (!existing) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/h2h_sessions`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({
        seed, formation,
        competition: competition === 'pl' ? 'pl' : 'wc',
        p1_name: name, p1_score: score, p1_tier: tier, p1_squad_url: squadUrl,
      }),
    })
    if (!res.ok) throw new Error(`H2H insert failed: ${res.status}`)
    return 'p1'
  }
  if (existing.p2_score != null) return 'full'
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/h2h_sessions?seed=eq.${encodeURIComponent(seed)}&p2_score=is.null`,
    {
      method: 'PATCH',
      headers: headers(),
      body: JSON.stringify({
        p2_name: name, p2_score: score, p2_tier: tier, p2_squad_url: squadUrl,
        p2_at: new Date().toISOString(),
      }),
    }
  )
  if (!res.ok) throw new Error(`H2H update failed: ${res.status}`)
  return 'p2'
}

// ── Groups ────────────────────────────────────────────────────────────────────

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export async function createGroup(name) {
  const code = randomCode()
  // return=minimal: we don't read the row back, so this keeps working even after
  // direct SELECT on `groups` is revoked (strict-privacy hardening). The client
  // already knows the code it generated.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/groups`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ name, code }),
  })
  if (!res.ok) throw new Error(`Create group failed: ${res.status}`)
  return { name, code }
}

export async function getGroup(code) {
  const upper = code.toUpperCase()
  // Preferred path: a SECURITY DEFINER function returning exactly one group by
  // exact code, so the `groups` table can be locked against full enumeration.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_group`, {
    method: 'POST', headers: headers(), body: JSON.stringify({ p_code: upper }),
  })
  if (res.ok) {
    const data = await res.json()
    return (Array.isArray(data) ? data[0] : data) || null
  }
  // Fallback for before supabase_hardening.sql is applied (function 404s): use
  // the legacy table lookup so group-join keeps working at deploy time.
  if (res.status === 404) {
    const legacy = await fetch(
      `${SUPABASE_URL}/rest/v1/groups?code=eq.${upper}&select=*`,
      { headers: headers() }
    )
    if (!legacy.ok) throw new Error('Failed to fetch group')
    const data = await legacy.json()
    return data[0] || null
  }
  throw new Error('Failed to fetch group')
}
