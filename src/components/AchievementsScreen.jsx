import { ALL_ACHIEVEMENTS, getUnlockedAchievements } from '../lib/achievements'

const RARITY_STYLE = {
  common:    { label: 'Common',    cls: 'bg-gray-700 text-gray-400' },
  uncommon:  { label: 'Uncommon',  cls: 'bg-sky-900/60 text-sky-400' },
  rare:      { label: 'Rare',      cls: 'bg-violet-900/60 text-violet-400' },
  legendary: { label: 'Legendary', cls: 'bg-yellow-900/60 text-yellow-400' },
}

const CATEGORIES = [
  { id: 'squad',       label: '⚽ Squad Quality' },
  { id: 'tournament',  label: '🥅 Tournament Run' },
  { id: 'funny',       label: '😅 Rough Days' },
  { id: 'collection',  label: '🗂️ Collection' },
  { id: 'challenge',   label: '🎮 Challenges' },
  { id: 'leaderboard', label: '🏅 Leaderboard' },
  { id: 'streak',      label: '🔥 Streak' },
]

export default function AchievementsScreen({ onBack }) {
  const unlocked = new Set(getUnlockedAchievements())
  const total = ALL_ACHIEVEMENTS.length
  const count = ALL_ACHIEVEMENTS.filter(a => unlocked.has(a.id)).length

  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 max-w-lg mx-auto">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 block transition-colors">← Back</button>

      <div className="flex items-end justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-white">🏆 Achievements</h1>
        <span className="text-gray-400 text-sm">{count}/{total} unlocked</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-8">
        <div
          className="h-full bg-yellow-400 rounded-full transition-all duration-700"
          style={{ width: `${(count / total) * 100}%` }}
        />
      </div>

      <div className="space-y-8">
        {CATEGORIES.map(cat => {
          const catAchievements = ALL_ACHIEVEMENTS.filter(a => a.category === cat.id)
          const catUnlocked = catAchievements.filter(a => unlocked.has(a.id)).length
          return (
            <div key={cat.id}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-gray-400">{cat.label}</h2>
                <span className="text-xs text-gray-600">{catUnlocked}/{catAchievements.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {catAchievements.map(a => {
                  const isUnlocked = unlocked.has(a.id)
                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 transition-all ${
                        isUnlocked
                          ? 'bg-yellow-400/10 border border-yellow-400/25'
                          : 'bg-gray-800/50 border border-gray-800'
                      }`}
                    >
                      <span className={`text-2xl shrink-0 ${isUnlocked ? '' : 'grayscale opacity-30'}`}>
                        {a.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`font-bold text-sm ${isUnlocked ? 'text-white' : 'text-gray-600'}`}>
                            {a.label}
                          </span>
                          {a.rarity && (() => {
                            const r = RARITY_STYLE[a.rarity]
                            return r ? (
                              <span className={`text-[9px] font-bold px-1.5 py-px rounded uppercase tracking-wider ${r.cls} ${isUnlocked ? '' : 'opacity-40'}`}>
                                {r.label}
                              </span>
                            ) : null
                          })()}
                        </div>
                        <div className={`text-xs ${isUnlocked ? 'text-gray-400' : 'text-gray-700'}`}>
                          {a.desc}
                        </div>
                      </div>
                      {isUnlocked && (
                        <span className="text-yellow-400 text-lg shrink-0">✓</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
