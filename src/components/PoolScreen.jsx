import { useState, useMemo } from 'react'
import wcNew from '../data/players_wc_new.json'
import wcOld from '../data/players_wc_old.json'
import euroA from '../data/players_euro_a.json'
import euroB from '../data/players_euro_b.json'
import plPlayers from '../data/players_pl.json'
import { FlagImg } from '../lib/flags'

const ALL = [...wcNew, ...wcOld, ...euroA, ...euroB, ...plPlayers]

// Same period label as the draft reel: PL shows the season, WC/Euro the edition.
function periodLabel(tournament, year) {
  if (tournament === 'PL') return `${year - 1}/${String(year).slice(-2)}`
  return `${tournament === 'EURO' ? 'EURO' : 'WC'} ${year}`
}

// Everyone who can come up in the spin, grouped year → team → players. Lets you
// scout the pool before drafting.
export default function PoolScreen({ competition = 'wc', onBack }) {
  const isPL = competition === 'pl'

  const periods = useMemo(() => {
    const pool = ALL.filter(p => isPL
      ? p.tournament === 'PL'
      : p.tournament === 'WC' || p.tournament === 'EURO')

    const byPeriod = new Map()
    for (const p of pool) {
      const key = `${p.tournament}|${p.year}`
      if (!byPeriod.has(key)) {
        byPeriod.set(key, { key, year: p.year, tournament: p.tournament, teams: new Map() })
      }
      const grp = byPeriod.get(key)
      if (!grp.teams.has(p.nation)) grp.teams.set(p.nation, [])
      grp.teams.get(p.nation).push(p)
    }

    return [...byPeriod.values()]
      .sort((a, b) => b.year - a.year || a.tournament.localeCompare(b.tournament))
      .map(grp => ({
        ...grp,
        label: periodLabel(grp.tournament, grp.year),
        teamList: [...grp.teams.entries()]
          .map(([team, players]) => ({ team, players: players.sort((a, b) => b.overall - a.overall) }))
          .sort((a, b) => a.team.localeCompare(b.team)),
      }))
  }, [isPL])

  const [openPeriod, setOpenPeriod] = useState(null)
  const [openTeam, setOpenTeam] = useState(null) // `${periodKey}|${team}`

  function ovrColor(v) {
    if (v > 80) return 'text-green-400'
    if (v <= 50) return 'text-red-500'
    return 'text-yellow-400'
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-950 px-4 py-8 max-w-lg mx-auto w-full">
      <div className="flex items-center gap-4 mb-2">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors text-sm">← Back</button>
        <h1 className="text-2xl font-extrabold text-white">🔎 Players in the Spin</h1>
        <span className={`ml-auto text-xs font-bold px-2 py-1 rounded-full ${isPL ? 'bg-sky-400/15 text-sky-400' : 'bg-yellow-400/15 text-yellow-400'}`}>
          {isPL ? '🦁 PL' : '🌍 WC'}
        </span>
      </div>
      <p className="text-gray-500 text-xs mb-5">
        Everyone who can come up in the spin — tap a {isPL ? 'season' : 'tournament'}, then a team.
      </p>

      <div className="space-y-2">
        {periods.map(period => {
          const periodOpen = openPeriod === period.key
          return (
            <div key={period.key} className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
              <button
                onClick={() => { setOpenPeriod(periodOpen ? null : period.key); setOpenTeam(null) }}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/60 transition-colors"
              >
                <span className="font-extrabold text-white text-sm">{period.label}</span>
                <span className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs">{period.teamList.length} teams</span>
                  <span className={`text-gray-500 transition-transform ${periodOpen ? 'rotate-90' : ''}`}>›</span>
                </span>
              </button>

              {periodOpen && (
                <div className="px-2 pb-2 space-y-1">
                  {period.teamList.map(({ team, players }) => {
                    const teamKey = `${period.key}|${team}`
                    const teamOpen = openTeam === teamKey
                    return (
                      <div key={teamKey} className="rounded-lg bg-gray-800/60 overflow-hidden">
                        <button
                          onClick={() => setOpenTeam(teamOpen ? null : teamKey)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 transition-colors"
                        >
                          <span className="w-6 h-4 inline-flex shrink-0"><FlagImg nation={team} className="w-full h-full" /></span>
                          <span className="text-white text-sm font-bold flex-1 text-left truncate">{team}</span>
                          <span className="text-gray-500 text-xs">{players.length}</span>
                          <span className={`text-gray-500 transition-transform ${teamOpen ? 'rotate-90' : ''}`}>›</span>
                        </button>

                        {teamOpen && (
                          <div className="px-3 pb-2 divide-y divide-gray-700/50">
                            {players.map((p, i) => (
                              <div key={i} className="flex items-center gap-3 py-1.5">
                                <span className="text-[10px] font-bold text-gray-500 w-10 shrink-0 whitespace-nowrap">{p.positions.join('/')}</span>
                                <span className="text-sm text-gray-200 flex-1 min-w-0 truncate">{p.name}</span>
                                <span className={`text-sm font-bold tabular-nums shrink-0 ${ovrColor(p.overall)}`}>{p.overall}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
