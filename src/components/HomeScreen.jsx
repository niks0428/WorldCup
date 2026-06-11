import Logo from './Logo'

export default function HomeScreen({ onSelect, onGuess }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-10">
      <div className="text-center mb-8">
        <div className="flex justify-center mb-3">
          <Logo size={100} />
        </div>
        <h1 className="text-white mb-1 leading-none">
          <span className="block text-2xl font-light tracking-[0.25em] text-yellow-400/80 uppercase">Lift the</span>
          <span className="block text-5xl md:text-6xl font-extrabold tracking-tight">Trophy</span>
        </h1>
        <p className="text-gray-500 text-sm mt-3">Choose your competition</p>
      </div>

      <div className="w-full max-w-md grid grid-cols-1 gap-4">
        <button
          onClick={() => onSelect('wc')}
          className="rounded-2xl border-2 border-yellow-400/60 bg-yellow-400/10 hover:bg-yellow-400/20 p-5 text-left transition-all group"
        >
          <div className="flex items-center gap-4">
            <span className="text-5xl">🌍</span>
            <div className="flex-1">
              <div className="text-yellow-400 font-extrabold text-xl">World Cup</div>
              <div className="text-gray-400 text-sm mt-0.5">Draft a national XI from World Cup &amp; Euro history. Win the knockout cup.</div>
            </div>
            <span className="text-yellow-400 text-2xl group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </button>

        <button
          onClick={() => onSelect('pl')}
          className="rounded-2xl border-2 border-sky-400/60 bg-sky-400/10 hover:bg-sky-400/20 p-5 text-left transition-all group"
        >
          <div className="flex items-center gap-4">
            <span className="text-5xl">🦁</span>
            <div className="flex-1">
              <div className="text-sky-400 font-extrabold text-xl">Premier League</div>
              <div className="text-gray-400 text-sm mt-0.5">Draft a club XI from FIFA history. Go <span className="font-bold text-white">38-0-0</span> — win every game, unbeaten.</div>
            </div>
            <span className="text-sky-400 text-2xl group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </button>

        <button
          onClick={onGuess}
          className="rounded-2xl border-2 border-violet-400/60 bg-violet-400/10 hover:bg-violet-400/20 p-5 text-left transition-all group"
        >
          <div className="flex items-center gap-4">
            <span className="text-5xl">🧠</span>
            <div className="flex-1">
              <div className="text-violet-400 font-extrabold text-xl">Guess the Player</div>
              <div className="text-gray-400 text-sm mt-0.5">See the stats — name the player. WC/Euro &amp; PL modes.</div>
            </div>
            <span className="text-violet-400 text-2xl group-hover:translate-x-1 transition-transform">→</span>
          </div>
        </button>
      </div>

      <p className="text-gray-700 text-xs max-w-sm mx-auto leading-relaxed text-center mt-8">
        Independent fan-made game. Not affiliated with FIFA, UEFA, the Premier League, EA Sports, or any club. Names, crests &amp; ratings used for entertainment only.
      </p>
    </div>
  )
}
