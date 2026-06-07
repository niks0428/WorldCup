import { useState } from 'react'
import { createGroup, getGroup, isConfigured } from '../lib/supabase'
import { validateName } from '../lib/nameFilter'

const GROUP_KEY = 'ltt_group'

export function getSavedGroup() {
  try { return JSON.parse(localStorage.getItem(GROUP_KEY)) }
  catch { return null }
}

function saveGroup(group) {
  localStorage.setItem(GROUP_KEY, JSON.stringify(group))
}

export function clearGroup() {
  localStorage.removeItem(GROUP_KEY)
}

export default function GroupScreen({ onBack, onGroupChange }) {
  const saved = getSavedGroup()
  const [tab, setTab] = useState(saved ? 'member' : 'join')
  const [groupName, setGroupName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [currentGroup, setCurrentGroup] = useState(saved)

  async function handleCreate() {
    if (!groupName.trim()) return
    const check = validateName(groupName.trim())
    if (!check.ok) { setError(check.reason); return }
    setLoading(true); setError('')
    try {
      const group = await createGroup(groupName.trim())
      saveGroup(group)
      setCurrentGroup(group)
      setTab('member')
      onGroupChange?.(group)
    } catch { setError('Failed to create group. Try again.') }
    finally { setLoading(false) }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (!code) return
    setLoading(true); setError('')
    try {
      const group = await getGroup(code)
      if (!group) { setError('Group not found. Check the code.'); setLoading(false); return }
      saveGroup(group)
      setCurrentGroup(group)
      setTab('member')
      onGroupChange?.(group)
    } catch { setError('Failed to join group. Try again.') }
    finally { setLoading(false) }
  }

  function handleLeave() {
    clearGroup()
    setCurrentGroup(null)
    setTab('join')
    onGroupChange?.(null)
  }

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-10 max-w-lg mx-auto">
        <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 block">← Back</button>
        <div className="text-center text-gray-400 py-16">Leaderboard not configured.</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 max-w-lg mx-auto">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 block transition-colors">← Back</button>
      <h1 className="text-2xl font-extrabold text-white mb-2">👥 Friend Groups</h1>
      <p className="text-gray-400 text-sm mb-8">Create a private group, share the code with mates, and compete on your own leaderboard.</p>

      {currentGroup ? (
        <div className="space-y-4">
          <div className="bg-gray-800 rounded-2xl p-6 text-center">
            <div className="text-gray-400 text-xs uppercase tracking-widest mb-1">Your group</div>
            <div className="text-white font-extrabold text-2xl mb-3">{currentGroup.name}</div>
            <div className="inline-block bg-gray-700 rounded-xl px-6 py-3 mb-4">
              <div className="text-xs text-gray-400 mb-1">Share this code</div>
              <div className="text-yellow-400 font-extrabold text-3xl tracking-[0.3em]">{currentGroup.code}</div>
            </div>
            <p className="text-gray-500 text-xs">Share the code with your mates so they can join. Scores you submit will appear on the group leaderboard.</p>
          </div>
          <button
            onClick={handleLeave}
            className="w-full py-3 rounded-xl border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-sm transition-colors"
          >
            Leave group
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 mb-4">
            {[['join', 'Join a group'], ['create', 'Create group']].map(([t, l]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${tab === t ? 'bg-yellow-400 text-gray-900' : 'bg-gray-800 text-gray-400'}`}>
                {l}
              </button>
            ))}
          </div>

          {tab === 'join' && (
            <div className="bg-gray-800 rounded-2xl p-5 space-y-3">
              <p className="text-sm text-gray-400">Enter the 6-letter code your mate shared:</p>
              <input
                type="text"
                placeholder="ABC123"
                maxLength={6}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 text-center text-xl font-extrabold tracking-widest placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
              <button
                onClick={handleJoin}
                disabled={loading || !joinCode.trim()}
                className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-bold transition-colors"
              >
                {loading ? 'Joining…' : 'Join Group'}
              </button>
            </div>
          )}

          {tab === 'create' && (
            <div className="bg-gray-800 rounded-2xl p-5 space-y-3">
              <p className="text-sm text-gray-400">Give your group a name:</p>
              <input
                type="text"
                placeholder="e.g. The Lads"
                maxLength={30}
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-yellow-400"
              />
              <button
                onClick={handleCreate}
                disabled={loading || !groupName.trim()}
                className="w-full py-3 rounded-xl bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 text-gray-900 font-bold transition-colors"
              >
                {loading ? 'Creating…' : 'Create Group'}
              </button>
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </div>
      )}
    </div>
  )
}
