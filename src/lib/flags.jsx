const ISO = {
  Argentina: 'ar', Australia: 'au', Belgium: 'be', Brazil: 'br',
  Bulgaria: 'bg', Cameroon: 'cm', Colombia: 'co', Croatia: 'hr',
  'Czech Republic': 'cz', Denmark: 'dk', England: 'gb-eng',
  France: 'fr', Germany: 'de', Greece: 'gr', Italy: 'it',
  Japan: 'jp', Mexico: 'mx', Morocco: 'ma', Netherlands: 'nl',
  Portugal: 'pt', Romania: 'ro', Russia: 'ru', Senegal: 'sn',
  Spain: 'es', Sweden: 'se', Switzerland: 'ch', Turkey: 'tr',
  USSR: 'su', Uruguay: 'uy', Wales: 'gb-wls', 'West Germany': 'de',
  Yugoslavia: 'rs', Scotland: 'gb-sct', Ireland: 'ie', Poland: 'pl',
  Hungary: 'hu', Albania: 'al', Slovenia: 'si', Georgia: 'ge',
  'North Macedonia': 'mk', Slovakia: 'sk', Ghana: 'gh', USA: 'us',
  Algeria: 'dz', Chile: 'cl', Iceland: 'is', Ukraine: 'ua',
  Austria: 'at', 'South Korea': 'kr', Serbia: 'rs',
}

// Fallback emoji for the spin reel (text context only)
export const FLAG_EMOJI = {
  Argentina: '🇦🇷', Australia: '🇦🇺', Belgium: '🇧🇪', Brazil: '🇧🇷',
  Bulgaria: '🇧🇬', Cameroon: '🇨🇲', Colombia: '🇨🇴', Croatia: '🇭🇷',
  'Czech Republic': '🇨🇿', Denmark: '🇩🇰', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  France: '🇫🇷', Germany: '🇩🇪', Greece: '🇬🇷', Italy: '🇮🇹',
  Japan: '🇯🇵', Mexico: '🇲🇽', Morocco: '🇲🇦', Netherlands: '🇳🇱',
  Portugal: '🇵🇹', Romania: '🇷🇴', Russia: '🇷🇺', Senegal: '🇸🇳',
  Spain: '🇪🇸', Sweden: '🇸🇪', Switzerland: '🇨🇭', Turkey: '🇹🇷',
  USSR: '🇷🇺', Uruguay: '🇺🇾', Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'West Germany': '🇩🇪',
  Yugoslavia: '🇷🇸', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Ireland: '🇮🇪', Poland: '🇵🇱',
  Hungary: '🇭🇺', Albania: '🇦🇱', Slovenia: '🇸🇮', Georgia: '🇬🇪',
  'North Macedonia': '🇲🇰', Slovakia: '🇸🇰', Ghana: '🇬🇭', USA: '🇺🇸',
  Algeria: '🇩🇿', Chile: '🇨🇱', Iceland: '🇮🇸', Ukraine: '🇺🇦',
  Austria: '🇦🇹', 'South Korea': '🇰🇷', Serbia: '🇷🇸',
}

export function flagUrl(nation) {
  const code = ISO[nation]
  return code ? `https://flagcdn.com/w40/${code}.png` : null
}

export function FlagImg({ nation, className = 'w-full h-full', alt }) {
  const url = flagUrl(nation)
  if (!url) return <span className="text-lg">🏴</span>
  return (
    <img
      src={url}
      alt={alt ?? nation}
      className={`object-cover ${className}`}
      loading="lazy"
      onError={e => { e.target.style.display = 'none' }}
    />
  )
}
