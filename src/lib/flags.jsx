import { CLUB_META } from '../data/clubs'
import { ClubCrest } from './crests'

const ISO = {
  Argentina: 'ar', Australia: 'au', Belgium: 'be', Brazil: 'br',
  Bulgaria: 'bg', Cameroon: 'cm', Canada: 'ca', Colombia: 'co', Croatia: 'hr',
  'Costa Rica': 'cr', 'Czech Republic': 'cz', Denmark: 'dk', Ecuador: 'ec',
  Egypt: 'eg', England: 'gb-eng', France: 'fr', Germany: 'de', Ghana: 'gh',
  Greece: 'gr', Honduras: 'hn', Hungary: 'hu', Iceland: 'is', Iran: 'ir',
  Ireland: 'ie', Italy: 'it', Japan: 'jp', Mexico: 'mx', Morocco: 'ma',
  Netherlands: 'nl', 'New Zealand': 'nz', Nigeria: 'ng',
  'North Korea': 'kp', Panama: 'pa', Paraguay: 'py', Peru: 'pe',
  Poland: 'pl', Portugal: 'pt', Qatar: 'qa', Romania: 'ro', Russia: 'ru',
  'Saudi Arabia': 'sa', Scotland: 'gb-sct', Senegal: 'sn', Serbia: 'rs',
  Slovakia: 'sk', Slovenia: 'si', 'South Africa': 'za', 'South Korea': 'kr',
  Spain: 'es', Sweden: 'se', Switzerland: 'ch', Togo: 'tg',
  'Trinidad & Tobago': 'tt', Tunisia: 'tn', Turkey: 'tr', Ukraine: 'ua',
  Uruguay: 'uy', USSR: 'su', USA: 'us', Wales: 'gb-wls', 'West Germany': 'de',
  Yugoslavia: 'rs', Albania: 'al', Algeria: 'dz', Austria: 'at',
  'Bosnia & Herzegovina': 'ba', Chile: 'cl', Georgia: 'ge',
  'North Macedonia': 'mk', 'Ivory Coast': 'ci', CIS: 'ru',
  Finland: 'fi', Latvia: 'lv', 'Northern Ireland': 'gb-nir', Norway: 'no',
  'Soviet Union': 'su', Czechoslovakia: 'cz', UAE: 'ae', Jamaica: 'jm',
  China: 'cn', Bolivia: 'bo', Iraq: 'iq',
}

// Fallback emoji for the spin reel (text context only)
export const FLAG_EMOJI = {
  Argentina: '🇦🇷', Australia: '🇦🇺', Belgium: '🇧🇪', Brazil: '🇧🇷',
  Bulgaria: '🇧🇬', Cameroon: '🇨🇲', Canada: '🇨🇦', Colombia: '🇨🇴',
  'Costa Rica': '🇨🇷', Croatia: '🇭🇷', 'Czech Republic': '🇨🇿',
  Denmark: '🇩🇰', Ecuador: '🇪🇨', Egypt: '🇪🇬', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  France: '🇫🇷', Germany: '🇩🇪', Ghana: '🇬🇭', Greece: '🇬🇷',
  Honduras: '🇭🇳', Hungary: '🇭🇺', Iceland: '🇮🇸', Iran: '🇮🇷',
  Ireland: '🇮🇪', Italy: '🇮🇹', Japan: '🇯🇵', Mexico: '🇲🇽',
  Morocco: '🇲🇦', Netherlands: '🇳🇱', 'New Zealand': '🇳🇿', Nigeria: '🇳🇬',
  'North Korea': '🇰🇵', Panama: '🇵🇦', Paraguay: '🇵🇾', Peru: '🇵🇪',
  Poland: '🇵🇱', Portugal: '🇵🇹', Qatar: '🇶🇦', Romania: '🇷🇴',
  Russia: '🇷🇺', 'Saudi Arabia': '🇸🇦', Scotland: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', Senegal: '🇸🇳',
  Serbia: '🇷🇸', Slovakia: '🇸🇰', Slovenia: '🇸🇮', 'South Africa': '🇿🇦',
  'South Korea': '🇰🇷', Spain: '🇪🇸', Sweden: '🇸🇪', Switzerland: '🇨🇭',
  Togo: '🇹🇬', 'Trinidad & Tobago': '🇹🇹', Tunisia: '🇹🇳', Turkey: '🇹🇷',
  Ukraine: '🇺🇦', Uruguay: '🇺🇾', USSR: '🇷🇺', USA: '🇺🇸',
  Wales: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'West Germany': '🇩🇪', Yugoslavia: '🇷🇸',
  Albania: '🇦🇱', Algeria: '🇩🇿', Austria: '🇦🇹',
  'Bosnia & Herzegovina': '🇧🇦', Chile: '🇨🇱', Georgia: '🇬🇪',
  'Ivory Coast': '🇨🇮', 'North Macedonia': '🇲🇰', CIS: '🇷🇺',
  Finland: '🇫🇮', Latvia: '🇱🇻', 'Northern Ireland': '🏴󠁧󠁢󠁮󠁩󠁲󠁿', Norway: '🇳🇴',
  'Soviet Union': '🇷🇺', Czechoslovakia: '🇨🇿', UAE: '🇦🇪', Jamaica: '🇯🇲',
  China: '🇨🇳', Bolivia: '🇧🇴', Iraq: '🇮🇶',
}

export function flagUrl(nation) {
  const code = ISO[nation]
  return code ? `https://flagcdn.com/w40/${code}.png` : null
}

// Premier League "nations" are actually clubs (the PL data stores the club name
// in the `nation` field). When the name is a known club, render its crest
// instead of a flag — so every FlagImg call site supports PL mode unchanged.
export function FlagImg({ nation, className = 'w-full h-full', alt }) {
  if (CLUB_META[nation]) return <ClubCrest club={nation} className={className} alt={alt} />
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
