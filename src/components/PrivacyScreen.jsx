export default function PrivacyScreen({ onBack }) {
  return (
    <div className="min-h-screen bg-gray-950 px-4 py-10 max-w-lg mx-auto">
      <button onClick={onBack} className="text-gray-400 hover:text-white text-sm mb-6 block transition-colors">
        ← Back
      </button>

      <h1 className="text-2xl font-extrabold text-white mb-2">Privacy Policy</h1>
      <p className="text-gray-500 text-xs mb-8">Last updated: June 2026</p>

      <div className="space-y-6 text-sm text-gray-400 leading-relaxed">
        <section>
          <h2 className="text-white font-bold mb-2">What this game is</h2>
          <p>Lift the Trophy is a free browser-based football draft game. It runs entirely in your browser with no user accounts or login required.</p>
        </section>

        <section>
          <h2 className="text-white font-bold mb-2">What data we collect</h2>
          <p>We only collect data you actively choose to submit:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>The <span className="text-white">name</span> you type when submitting a leaderboard score</li>
            <li>Your <span className="text-white">score, tier, formation and game mode</span></li>
            <li>A <span className="text-white">squad link</span> encoding the players you drafted</li>
            <li>The <span className="text-white">date and time</span> of submission</li>
          </ul>
          <p className="mt-2">We do <span className="text-white">not</span> collect email addresses, passwords, device identifiers, IP addresses, or any other personal data.</p>
        </section>

        <section>
          <h2 className="text-white font-bold mb-2">How we store it</h2>
          <p>Leaderboard scores are stored in <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-yellow-400 hover:underline">Supabase</a>, a third-party database service hosted in the EU. Supabase's own privacy policy applies to that storage. Data is publicly readable — anyone can view the leaderboard.</p>
        </section>

        <section>
          <h2 className="text-white font-bold mb-2">Cookies and tracking</h2>
          <p>We use no cookies, no analytics, no advertising trackers, and no third-party scripts beyond what's bundled in the game itself.</p>
        </section>

        <section>
          <h2 className="text-white font-bold mb-2">Deleting your data</h2>
          <p>If you want a leaderboard entry removed, contact us at <span className="text-yellow-400">niks.lecko@aol.com</span> with the name you submitted and we'll delete it.</p>
        </section>

        <section>
          <h2 className="text-white font-bold mb-2">Children</h2>
          <p>This game is not directed at children under 13. We do not knowingly collect data from children.</p>
        </section>

        <section>
          <h2 className="text-white font-bold mb-2">Changes</h2>
          <p>If we make material changes to this policy, we'll update the date at the top of this page.</p>
        </section>
      </div>
    </div>
  )
}
