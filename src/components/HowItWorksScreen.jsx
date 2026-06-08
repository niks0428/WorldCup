const TIERS = [
  { emoji: '🏆', label: 'World Cup Winners',  range: '90+' },
  { emoji: '🥈', label: 'Finalists',          range: '82 – 89' },
  { emoji: '🥉', label: 'Semi-finalists',      range: '74 – 81' },
  { emoji: '🎯', label: 'Quarter-finalists',  range: '66 – 73' },
  { emoji: '🔵', label: 'Round of 16',        range: '58 – 65' },
  { emoji: '⚫', label: 'Group Stage Exit',   range: '0 – 57' },
]

const WEIGHTS = [
  { label: 'Goalkeeper', pct: '8%' },
  { label: 'Defence',    pct: '28%' },
  { label: 'Midfield',   pct: '32%' },
  { label: 'Attack',     pct: '32%' },
]

const FIT = [
  { label: 'Natural position',             eg: 'CB → CB',  mult: '×1.0', cls: 'text-green-400' },
  { label: 'Compatible position',          eg: 'RB → RWB', mult: '×0.85', cls: 'text-yellow-400' },
  { label: 'Off-position',                 eg: 'ST → GK',  mult: '×0.6',  cls: 'text-red-400' },
]

export default function HowItWorksScreen({ onBack }) {
  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 max-w-lg mx-auto">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 block transition-colors">
        ← Back
      </button>

      <h1 className="text-2xl font-extrabold text-white mb-1">ℹ️ How Scoring Works</h1>
      <p className="text-gray-400 text-sm mb-8">Everything you need to know to lift the trophy.</p>

      {/* Game loop */}
      <section className="mb-8">
        <h2 className="text-white font-bold mb-3 uppercase text-xs tracking-widest text-gray-500">The Game</h2>
        <div className="bg-gray-800 rounded-2xl p-4 space-y-2 text-sm text-gray-300 leading-relaxed">
          <p>Spin to get a random nation and tournament year. Pick one player from that squad and place them in any compatible slot on your pitch. Fill all 11 positions to complete your XI.</p>
          <p>Your final <span className="text-yellow-400 font-bold">Team Score</span> determines how far your team goes in the tournament.</p>
        </div>
      </section>

      {/* Score formula */}
      <section className="mb-8">
        <h2 className="text-white font-bold mb-3 uppercase text-xs tracking-widest text-gray-500">How your score is calculated</h2>
        <div className="bg-gray-800 rounded-2xl p-4 space-y-3">
          <p className="text-sm text-gray-300">Each player's rating is multiplied by their <span className="text-white font-bold">position fit</span>, then averaged within each group. Groups are then weighted to give your final score:</p>
          <div className="space-y-2 mt-2">
            {WEIGHTS.map(w => (
              <div key={w.label} className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-yellow-400 rounded-full" style={{ width: w.pct }} />
                </div>
                <span className="text-gray-400 text-xs w-20 shrink-0">{w.label}</span>
                <span className="text-yellow-400 font-bold text-sm w-8 text-right">{w.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Position fit */}
      <section className="mb-8">
        <h2 className="text-white font-bold mb-3 uppercase text-xs tracking-widest text-gray-500">Position fit multipliers</h2>
        <div className="bg-gray-800 rounded-2xl divide-y divide-gray-700">
          {FIT.map(f => (
            <div key={f.label} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1">
                <div className="text-white text-sm font-semibold">{f.label}</div>
                <div className="text-gray-500 text-xs">{f.eg}</div>
              </div>
              <span className={`font-extrabold text-base ${f.cls}`}>{f.mult}</span>
            </div>
          ))}
        </div>
        <p className="text-gray-500 text-xs mt-2 px-1">Only natural and compatible slots light up when placing a player.</p>
      </section>

      {/* Tiers */}
      <section className="mb-8">
        <h2 className="text-white font-bold mb-3 uppercase text-xs tracking-widest text-gray-500">Tournament results</h2>
        <div className="bg-gray-800 rounded-2xl divide-y divide-gray-700">
          {TIERS.map(t => (
            <div key={t.label} className="flex items-center gap-3 px-4 py-3">
              <span className="text-2xl w-8 text-center">{t.emoji}</span>
              <span className="text-white text-sm flex-1">{t.label}</span>
              <span className="text-yellow-400 font-bold text-sm tabular-nums">{t.range}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Modes */}
      <section>
        <h2 className="text-white font-bold mb-3 uppercase text-xs tracking-widest text-gray-500">Modes</h2>
        <div className="bg-gray-800 rounded-2xl divide-y divide-gray-700 text-sm">
          <div className="px-4 py-3">
            <div className="text-white font-bold mb-0.5">Classic</div>
            <div className="text-gray-400">Full squad shown with stats, sorted by rating. You choose which slot to fill. 3 skips, 3 subs.</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-white font-bold mb-0.5">Expert</div>
            <div className="text-gray-400">Position-compatible players only. No stats shown, sorted alphabetically. 1 skip, no subs.</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-red-400 font-bold mb-0.5">💀 Hardcore</div>
            <div className="text-gray-400">The game randomly picks your position each round. No stats, no skips. Stats are revealed dramatically at the end.</div>
          </div>
        </div>
      </section>
    </div>
  )
}
