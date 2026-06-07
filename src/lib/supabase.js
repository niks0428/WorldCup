// Paste your Supabase project URL and anon key here
export const SUPABASE_URL = ''
export const SUPABASE_ANON_KEY = ''

export const isConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

function headers() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }
}

export async function submitScore({ playerName, score, tier, formation, mode, squadUrl }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/scores`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      player_name: playerName,
      score,
      tier,
      formation,
      mode,
      squad_url: squadUrl,
    }),
  })
  if (!res.ok) throw new Error(`Submit failed: ${res.status}`)
}

export async function fetchScores(limit = 50) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/scores?select=*&order=score.desc,created_at.asc&limit=${limit}`,
    { headers: headers() }
  )
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`)
  return res.json()
}
