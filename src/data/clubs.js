// Premier League club metadata for the PL mode.
//   id    — football-data.org crest id (https://crests.football-data.org/<id>.png)
//   short — 3-letter monogram used by the fallback badge when the crest image
//           is missing/blocked, and on tight UI.
//   color — brand colour for the monogram fallback background.
// Covers every club to appear in the Premier League from 2006-07 (FIFA 07)
// onward. A club missing here still renders — ClubCrest falls back to a neutral
// monogram — so the long tail degrades gracefully.
export const CLUB_META = {
  'Arsenal':            { id: 57,   short: 'ARS', color: '#EF0107' },
  'Aston Villa':        { id: 58,   short: 'AVL', color: '#670E36' },
  'Birmingham City':    { id: 332,  short: 'BIR', color: '#0000FF' },
  'Blackburn Rovers':   { id: 59,   short: 'BLB', color: '#009EE0' },
  'Blackpool':          { id: 1081, short: 'BLP', color: '#F68712' },
  'Bolton Wanderers':   { id: 332,  short: 'BOL', color: '#263C7E' },
  'Bournemouth':        { id: 1044, short: 'BOU', color: '#DA291C' },
  'Brentford':          { id: 402,  short: 'BRE', color: '#E30613' },
  'Brighton':           { id: 397,  short: 'BHA', color: '#0057B8' },
  'Burnley':            { id: 328,  short: 'BUR', color: '#6C1D45' },
  'Cardiff City':       { id: 715,  short: 'CAR', color: '#0070B5' },
  'Charlton Athletic':  { id: 348,  short: 'CHA', color: '#D4011E' },
  'Chelsea':            { id: 61,   short: 'CHE', color: '#034694' },
  'Crystal Palace':     { id: 354,  short: 'CRY', color: '#1B458F' },
  'Derby County':       { id: 342,  short: 'DER', color: '#000000' },
  'Everton':            { id: 62,   short: 'EVE', color: '#003399' },
  'Fulham':             { id: 63,   short: 'FUL', color: '#000000' },
  'Huddersfield Town':  { id: 394,  short: 'HUD', color: '#0E63AD' },
  'Hull City':          { id: 322,  short: 'HUL', color: '#F18A01' },
  'Ipswich':            { id: 349,  short: 'IPS', color: '#0044A9' },
  'Ipswich Town':       { id: 349,  short: 'IPS', color: '#0044A9' },
  'Leeds United':       { id: 341,  short: 'LEE', color: '#1D428A' },
  'Leicester City':     { id: 338,  short: 'LEI', color: '#003090' },
  'Liverpool':          { id: 64,   short: 'LIV', color: '#C8102E' },
  'Luton Town':         { id: 389,  short: 'LUT', color: '#F78F1E' },
  'Manchester City':    { id: 65,   short: 'MCI', color: '#6CABDD' },
  'Manchester United':  { id: 66,   short: 'MUN', color: '#DA291C' },
  'Middlesbrough':      { id: 343,  short: 'MID', color: '#E21C38' },
  'Newcastle United':   { id: 67,   short: 'NEW', color: '#241F20' },
  'Norwich City':       { id: 68,   short: 'NOR', color: '#FFF200' },
  'Nottingham Forest':  { id: 351,  short: 'NFO', color: '#DD0000' },
  'Portsmouth':         { id: 325,  short: 'POR', color: '#001489' },
  'QPR':                { id: 69,   short: 'QPR', color: '#1D5BA4' },
  'Reading':            { id: 355,  short: 'REA', color: '#004494' },
  'Sheffield United':   { id: 356,  short: 'SHU', color: '#EE2737' },
  'Southampton':        { id: 340,  short: 'SOU', color: '#D71920' },
  'Stoke City':         { id: 70,   short: 'STK', color: '#E03A3E' },
  'Sunderland':         { id: 71,   short: 'SUN', color: '#EB172B' },
  'Swansea City':       { id: 72,   short: 'SWA', color: '#121212' },
  'Tottenham Hotspur':  { id: 73,   short: 'TOT', color: '#132257' },
  'Watford':            { id: 346,  short: 'WAT', color: '#FBEE23' },
  'West Bromwich Albion': { id: 74, short: 'WBA', color: '#122F67' },
  'West Ham United':    { id: 563,  short: 'WHU', color: '#7A263A' },
  'Wigan Athletic':     { id: 75,   short: 'WIG', color: '#1D59AF' },
  'Wolves':             { id: 76,   short: 'WOL', color: '#FDB913' },
}

export function crestUrl(club) {
  const meta = CLUB_META[club]
  return meta ? `https://crests.football-data.org/${meta.id}.png` : null
}

export function clubShort(club) {
  return CLUB_META[club]?.short || (club || '???').slice(0, 3).toUpperCase()
}

export function clubColor(club) {
  return CLUB_META[club]?.color || '#374151'
}
