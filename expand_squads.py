#!/usr/bin/env python3
"""Expand tournament squads up to a target size with real players.

Stats for new players are derived from the existing dataset's per-primary-position
averages, shifted by (overall - position_average_overall) and clamped to 1..99,
so a new 75-rated CB and an existing 85-rated CB both look position-appropriate.
We only ADD players (existing rows are never modified) and cap each squad at TARGET.
"""
import json, sys

TARGET = 16

# Per-primary-position average stat vectors, measured from the existing data.
AVG = {
    'GK':  {'overall':84,'pac':54,'sho':13,'pas':45,'dri':38,'def':20,'phy':74},
    'CB':  {'overall':83,'pac':68,'sho':33,'pas':60,'dri':57,'def':83,'phy':78},
    'RB':  {'overall':81,'pac':78,'sho':47,'pas':65,'dri':65,'def':73,'phy':69},
    'LB':  {'overall':80,'pac':77,'sho':45,'pas':64,'dri':65,'def':72,'phy':68},
    'RWB': {'overall':80,'pac':80,'sho':47,'pas':65,'dri':66,'def':70,'phy':69},
    'LWB': {'overall':79,'pac':80,'sho':54,'pas':62,'dri':62,'def':60,'phy':70},
    'CDM': {'overall':83,'pac':66,'sho':54,'pas':74,'dri':69,'def':77,'phy':75},
    'CM':  {'overall':83,'pac':70,'sho':66,'pas':78,'dri':75,'def':62,'phy':70},
    'CAM': {'overall':85,'pac':76,'sho':77,'pas':81,'dri':83,'def':43,'phy':65},
    'RM':  {'overall':82,'pac':75,'sho':66,'pas':74,'dri':74,'def':45,'phy':66},
    'LM':  {'overall':79,'pac':76,'sho':54,'pas':67,'dri':70,'def':57,'phy':66},
    'RW':  {'overall':82,'pac':84,'sho':73,'pas':71,'dri':81,'def':33,'phy':64},
    'LW':  {'overall':83,'pac':85,'sho':75,'pas':72,'dri':83,'def':32,'phy':65},
    'ST':  {'overall':84,'pac':79,'sho':82,'pas':66,'dri':76,'def':29,'phy':73},
}
FACE = ['pac', 'sho', 'pas', 'dri', 'def', 'phy']

def clamp(v): return max(1, min(99, int(round(v))))

def make(name, nation, year, tournament, positions, overall):
    base = AVG[positions[0]]
    delta = overall - base['overall']
    row = dict(name=name, nation=nation, year=year,
               positions=positions, overall=overall)
    for s in FACE:
        row[s] = clamp(base[s] + delta)
    row['tournament'] = tournament
    return row

def expand(path, tournament, additions):
    data = json.load(open(path))
    have = {}
    for p in data:
        have.setdefault((p['year'], p['nation']), set()).add(p['name'])
        have.setdefault((p['year'], p['nation']), set())
    counts = {}
    for p in data:
        counts[(p['year'], p['nation'])] = counts.get((p['year'], p['nation']), 0) + 1
    added = 0
    for (year, nation), players in additions.items():
        names = have.get((year, nation), set())
        n = counts.get((year, nation), 0)
        for (name, positions, overall) in players:
            if n >= TARGET:
                break
            if name in names:
                continue
            data.append(make(name, nation, year, tournament, positions, overall))
            names.add(name); n += 1; added += 1
    json.dump(data, open(path, 'w'), ensure_ascii=False, separators=(',', ':'))
    print(f'{path}: +{added} players, now {len(data)} total')

# ── World Cup 1986–2014 additions (real squad members) ──────────────────────────
WC_OLD = {
 (1986,'Argentina'): [('Bochini',['CAM'],80),('Pasculli',['ST'],77),('Garre',['LB'],74),('Clausen',['RB'],75),('Tapia',['CM'],74),('Islas',['GK'],74)],
 (1986,'Belgium'): [('Demol',['CB'],76),('Grun',['RB','CB'],77),('Van der Elst F',['CDM','CM'],78),('Vervoort',['CM'],75),('Veyt',['ST'],74),('Renquin',['CB'],74),('Broos',['CB'],75),('Munaron',['GK'],73),('Mommens',['CM'],73)],
 (1986,'Brazil'): [('Branco',['LB'],80),('Josimar',['RB'],79),('Casagrande',['ST'],78),('Silas',['CM'],77),('Edson',['CM'],76),('Carlos',['GK'],74)],
 (1986,'England'): [('Waddle',['RW'],80),('Wilkins',['CM'],79),('Hateley',['ST'],79),('Anderson V',['RB'],77),('Steven T',['RM'],77),('Woods',['GK'],75)],
 (1986,'France'): [('Rocheteau',['ST'],79),('Ferreri',['RM'],77),('Tusseau',['LB'],76),('Ayache',['RB'],75),('Vercruysse',['CM'],75),('Rust',['GK'],74)],
 (1986,'Mexico'): [('Aguirre',['CM'],77),('Servin',['CB'],75),('Larios',['GK'],75),('Cruz',['RB'],74),('Flores',['CM'],74),('Munoz',['ST'],74),('Amador',['CDM'],74),('Doria',['CB'],74),('Manzo',['LB'],73)],
 (1986,'Spain'): [('Senor',['LM'],77),('Gallego',['CDM'],78),('Julio Alberto',['LB'],76),('Goikoetxea',['CB'],77),('Eloy',['ST'],75),('Victor',['CM'],75),('Ablanedo',['GK'],73)],
 (1986,'West Germany'): [('Eder',['ST'],78),('Littbarski',['RW'],81),('Rolff',['CDM'],76),('Herget',['CB'],76),('Pflugler',['LB'],75)],
 (1990,'Argentina'): [('Burruchaga',['CAM'],81),('Olarticoechea',['LB'],77),('Serrizuela',['CB'],76),('Simon',['CB'],76),('Basualdo',['CM'],76),('Dezotti',['ST'],75)],
 (1990,'Cameroon'): [('Mfede',['CAM'],75),('Maboang',['ST'],74),('Ebwelle',['RB'],73),('Ndip',['CB'],73),('Pagal',['CM'],74),('Bell J',['GK'],76),('Mbouh',['CDM'],73)],
 (1990,'England'): [('Parker',['RB'],79),('Wright M',['CB'],80),('McMahon',['CM'],78),('Bull',['ST'],76),('Woods',['GK'],77),('Dorigo',['LB'],77)],
 (1990,'Italy'): [('Vialli',['ST'],84),('Giannini',['CAM'],82),('Ferri',['CB'],81),('Ferrara',['CB','RB'],81),('Berti',['CM'],79)],
 (1990,'West Germany'): [('Reuter',['RB'],79),('Pflugler',['LB'],77),('Thon',['CM'],81),('Bein',['CAM'],79),('Aumann',['GK'],78)],
 (1990,'Yugoslavia'): [('Brnovic',['CDM'],76),('Spasic',['CB'],78),('Vulic',['CM'],76),('Vujovic Z',['ST'],79),('Stanojkovic',['RB'],75),('Jozic',['CM'],77),('Omerovic',['GK'],74)],
 (1994,'Argentina'): [('Maradona',['CAM'],85),('Caceres',['CB'],77),('Ruggeri',['CB'],79),('Rodriguez F',['RB'],76),('Medina Bello',['ST'],76),('Berti',['CM'],77),('Basualdo',['CDM'],76)],
 (1994,'Brazil'): [('Branco',['LB'],81),('Jorginho',['RB'],81),('Dunga',['CDM'],84),('Rai',['CAM'],82),('Muller',['ST'],79),('Viola',['ST'],78)],
 (1994,'Bulgaria'): [('Ivanov Trifon',['CB'],78),('Tsvetanov',['LB'],77),('Yankov',['CDM'],77),('Borimirov',['CM'],76),('Guentchev',['ST'],77),('Bachev',['CM'],74),('Plochev',['GK'],73)],
 (1994,'Germany'): [('Sammer',['CDM'],84),('Buchwald',['CB'],81),('Moller',['CAM'],82),('Strunz',['RB'],78),('Wagner',['CB'],76),('Kopke',['GK'],80)],
 (1994,'Italy'): [('Mussi',['RB'],79),('Apolloni',['CB'],78),('Berti',['CM'],79),('Massaro',['ST'],79),('Evani',['LM'],77)],
 (1994,'Netherlands'): [('Wouters',['CDM'],80),('Valckx',['CB'],78),('Ronald de Boer',['CAM'],80),('Numan',['LB'],78),('Witschge',['CM'],78),('De Goey',['GK'],77)],
 (1994,'Romania'): [('Petrescu',['RB'],81),('Prodan',['CB'],78),('Munteanu D',['CM'],78),('Selymes',['LB'],77),('Papura',['CB'],74),('Vladoiu',['ST'],75),('Prunea',['GK'],77)],
 (1994,'Sweden'): [('Thern',['CDM'],81),('Mild',['CM'],79),('Limpar',['RM'],80),('Kamark',['CB'],78),('Rehn',['CM'],77)],
 (1998,'Brazil'): [('Cesar Sampaio',['CDM'],80),('Junior Baiano',['CB'],79),('Ze Roberto',['LM'],81),('Goncalves',['CB'],78),('Edmundo',['ST'],81),('Dida',['GK'],79)],
 (1998,'Croatia'): [('Bilic',['CB'],81),('Soldo',['CDM'],78),('Jurcic',['CM'],77),('Maric',['ST'],77),('Tudor',['GK'],74)],
 (1998,'England'): [('Sheringham',['ST'],82),('Batty',['CDM'],78),('Southgate',['CB'],80),('Merson',['CAM'],79),('Flowers',['GK'],77)],
 (1998,'France'): [('Karembeu',['CDM'],81),('Vieira',['CDM'],82),('Trezeguet',['ST'],80),('Pires',['RM'],81),('Boghossian',['CM'],78)],
 (1998,'Netherlands'): [('Numan',['LB'],81),('Ronald de Boer',['RW'],82),('Winter',['CM'],80),('Zenden',['LW'],80),('Van Hooijdonk',['ST'],79),('Bogarde',['CB'],78)],
 (2002,'Argentina'): [('Aimar',['CAM'],82),('Sorin',['LB'],80),('Almeyda',['CDM'],79),('Gonzalez K',['LW'],80),('Lopez Cl',['ST'],79),('Placente',['LB'],78)],
 (2002,'Brazil'): [('Edmilson',['CDM'],80),('Juninho',['CAM'],81),('Belletti',['RB'],80),('Junior',['LB'],79),('Denilson',['LW'],80)],
 (2002,'England'): [('Hargreaves',['CDM'],79),('Sinclair',['LM'],77),('Vassell',['ST'],78),('Mills',['RB'],78),('Sheringham',['ST'],79),('Martyn',['GK'],79)],
 (2002,'Germany'): [('Neuville',['ST'],79),('Bode',['LM'],77),('Ramelow',['CB'],80),('Ziege',['LB'],79),('Asamoah',['LM'],78)],
 (2002,'Turkey'): [('Basturk',['CAM'],81),('Davala',['RM'],79),('Mansiz',['ST'],79),('Unsal',['LB'],77),('Penbe',['CM'],76),('Korkmaz',['RB'],76),('Bulent',['CB'],76),('Catkin',['GK'],74)],
 (2006,'France'): [('Malouda',['LW'],82),('Wiltord',['ST'],79),('Govou',['RW'],79),('Boumsong',['CB'],79),('Coupet',['GK'],80)],
 (2006,'Germany'): [('Frings',['CM'],82),('Schneider',['RM'],81),('Borowski',['CM'],79),('Hitzlsperger',['CM'],79),('Kahn',['GK'],84),('Jansen',['LB'],78)],
 (2006,'Italy'): [('Grosso',['LB'],82),('Gilardino',['ST'],81),('Iaquinta',['ST'],80),('Materazzi',['CB'],82),('Perrotta',['CM'],80)],
 (2006,'Portugal'): [('Petit',['CDM'],79),('Tiago',['CM'],80),('Simao',['LW'],81),('Nuno Gomes',['ST'],80),('Meira',['CB'],78),('Postiga',['ST'],77)],
 (2006,'Spain'): [('Reyes',['LW'],80),('Joaquin',['RM'],80),('Marchena',['CB'],80),('Senna',['CDM'],81),('Albelda',['CDM'],79),('Luis Garcia',['CAM'],80)],
 (2010,'Germany'): [('Friedrich A',['RB'],79),('Trochowski',['CM'],78),('Kroos',['CM'],80),('Gomez M',['ST'],81),('Boateng J',['CB'],80),('Marin',['LW'],77)],
 (2010,'Netherlands'): [('Van der Vaart',['CAM'],84),('Afellay',['CAM','LW'],81),('Elia',['LW'],79),('Ooijer',['CB'],79),('Braafheid',['LB'],77)],
 (2010,'Spain'): [('Fabregas',['CM'],85),('Navas',['RW'],81),('Pedro',['RW'],81),('Mata',['LW'],81),('Llorente',['ST'],80)],
 (2010,'Uruguay'): [('Caceres',['CB'],79),('Gargano',['CDM'],77),('Fucile',['LB'],77),('Arevalo Rios',['CDM'],77),('Abreu',['ST'],77),('Pereira A',['CM'],76)],
 (2014,'Argentina'): [('Aguero',['ST'],88),('Gago',['CDM'],80),('Demichelis',['CB'],80),('Fernandez F',['CM'],79),('Palacio',['ST'],79),('Basanta',['LB'],77)],
 (2014,'Belgium'): [('Mignolet',['GK'],80),('Origi',['ST'],76),('Vermaelen',['CB'],81),('Dembele M',['CM'],81),('Chadli',['LW'],79),('Januzaj',['LW'],77)],
 (2014,'Colombia'): [('Armero',['LB'],77),('Aguilar C',['CB'],76),('Guarin',['CM'],80),('Ramos M',['ST'],77),('Valdes',['GK'],77),('Balanta',['CDM'],75),('Ibarbo',['ST'],76)],
 (2014,'England'): [('Sterling',['RW'],80),('Wilshere',['CM'],79),('Lallana',['CAM'],80),('Jagielka',['CB'],79),('Lampard',['CM'],81),('Milner',['RM'],79)],
 (2014,'France'): [('Sakho',['CB'],80),('Debuchy',['RB'],79),('Sissoko',['CM'],79),('Giroud',['ST'],81),('Schneiderlin',['CDM'],78),('Remy',['ST'],79)],
 (2014,'Germany'): [('Gotze',['CAM'],84),('Schurrle',['LW'],82),('Mertesacker',['CB'],82),('Durm',['LB'],77),('Mustafi',['CB'],78)],
 (2014,'Netherlands'): [('Depay',['LW'],79),('Janmaat',['RB'],79),('Martins Indi',['CB'],79),('Clasie',['CDM'],77),('Lens',['RW'],78),('Krul',['GK'],79)],
}

# ── Euro 1988–2008 additions ────────────────────────────────────────────────────
EURO_A = {
 (1988,'England'): [('Waddle',['RW'],81),('Webb N',['CM'],78),('Wright M',['CB'],79),('Steven T',['RM'],78),('Woods',['GK'],77)],
 (1988,'Italy'): [('Giannini',['CAM'],82),('Ferri',['CB'],80),('Mauro',['LW'],78),('Ferrara',['CB','RB'],79),('Tacconi',['GK'],78)],
 (1988,'Netherlands'): [('Koeman E',['CM'],80),('Kieft',['ST'],79),("Van't Schip",['RW'],78),('Bosman',['ST'],77),('Hiele',['GK'],76)],
 (1988,'Spain'): [('Roberto',['CDM'],79),('Manolo',['ST'],78),('Chendo',['RB'],78),('Andrinua',['CB'],77),('Rafael Paz',['CM'],76),('Ochotorena',['GK'],76)],
 (1988,'USSR'): [('Kuznetsov O',['CB'],81),('Bessonov',['RB'],79),('Gotsmanov',['RM'],78),('Zygmantovich',['CDM'],78),('Pasulko',['LM'],76)],
 (1988,'West Germany'): [('Kohler',['CB'],81),('Thon',['CM'],81),('Mill',['ST'],78),('Herget',['CB'],78),('Borowka',['CB'],76),('Eck',['GK'],75)],
 (1992,'Denmark'): [('Christofte',['CM'],77),('Christiansen J',['ST'],78),('Kristensen B',['RB'],76),('Elstrup',['ST'],76),('Andersen H',['CB'],76)],
 (1992,'Germany'): [('Doll',['LW'],79),('Sammer',['CB'],82),('Helmer',['CB'],80),('Binz',['CB'],78),('Stein',['ST'],77)],
 (1992,'Netherlands'): [('Van Vossen',['ST'],79),('Ronald de Boer',['RW'],80),('Roy',['ST'],78),('Kieft',['ST'],78),('De Wit',['CM'],76),('Menzo',['GK'],77)],
 (1992,'Sweden'): [('Eriksson J',['CB'],78),('Ingesson',['CM'],80),('Larsson P',['CB'],78),('Engqvist',['CM'],76),('Eskelinen',['GK'],76)],
 (1996,'Croatia'): [('Asanovic',['CM'],81),('Jurcic',['CM'],78),('Soldo',['CDM'],78),('Maric',['ST'],77),('Mladenovic',['LB'],77),('Gabric',['GK'],74)],
 (1996,'Czech Republic'): [('Kubik',['CM'],78),('Frydek',['RB'],77),('Latal',['RB'],77),('Drulak',['ST'],77),('Bejbl',['CDM'],79)],
 (1996,'England'): [('Ince',['CDM'],81),('Redknapp',['CM'],80),('Barmby',['CAM'],79),('Fowler',['ST'],81),('Walker I',['GK'],78)],
 (1996,'France'): [('Karembeu',['CDM'],81),('Guerin',['CDM'],79),('Lama',['GK'],81),('Pedros',['LW'],78),('Roche',['RB'],77)],
 (1996,'Germany'): [('Reuter',['RB'],80),('Strunz',['RB'],78),('Moller',['CAM'],82),('Basler',['RM'],82),('Freund',['CDM'],78)],
 (1996,'Netherlands'): [('Overmars',['LW'],84),('Bogarde',['CB'],79),('Winter',['CM'],80),('Ronald de Boer',['RW'],81),('Hoekstra',['LW'],77)],
 (1996,'Portugal'): [('Domingos',['ST'],78),('Helder',['CB'],78),('Secretario',['RB'],77),('Paulinho Santos',['LB'],76),('Barros',['CM'],78),('Folha',['LM'],75),('Alfredo',['GK'],74)],
 (2000,'France'): [('Wiltord',['ST'],81),('Dugarry',['ST'],80),('Pires',['RM'],84),('Petit',['CDM'],83),('Lama',['GK'],80)],
 (2000,'Italy'): [('Conte',['CM'],80),('Fiore',['CAM'],80),('Zambrotta',['RB'],79),('Iuliano',['CB'],79),('Di Biagio',['CDM'],78)],
 (2000,'Netherlands'): [('Zenden',['LW'],81),('Ronald de Boer',['RW'],82),('Van Bronckhorst',['LB'],81),('Bosvelt',['CDM'],79),('Westerveld',['GK'],78)],
 (2000,'Portugal'): [('Nuno Gomes',['ST'],81),('Rui Jorge',['LB'],78),('Costinha',['CDM'],79),('Jorge Costa',['CB'],79),('Beto',['CM'],78),('Quim',['GK'],77)],
 (2000,'Spain'): [('Etxeberria',['RW'],80),('Munitis',['LW'],79),('Gerard',['ST'],80),('Sergi',['LB'],80),('Engonga',['CDM'],78)],
 (2004,'Czech Republic'): [('Rosicky',['CAM'],84),('Heinz',['LB'],77),('Plasil',['CM'],79),('Vachousek',['LW'],76),('Blazek',['GK'],75)],
 (2004,'England'): [('Hargreaves',['CDM'],80),('Heskey',['ST'],79),('Cole J',['CAM'],80),('King',['CB'],79),('Robinson P',['GK'],79)],
 (2004,'France'): [('Pires',['RM'],84),('Dacourt',['CDM'],79),('Rothen',['LM'],78),('Marlet',['ST'],77),('Coupet',['GK'],80)],
 (2004,'Greece'): [('Fyssas',['LB'],77),('Tsiartas',['CAM'],78),('Lakis',['RM'],76),('Venetidis',['RB'],76),('Chalkias',['GK'],75)],
 (2004,'Netherlands'): [('Sneijder',['CM'],80),('Van der Vaart',['CAM'],81),('Makaay',['ST'],81),('Heitinga',['CB'],78),('Seedorf',['CM'],83)],
 (2004,'Portugal'): [('Costinha',['CDM'],80),('Tiago',['CM'],80),('Simao',['LW'],80),('Nuno Gomes',['ST'],80),('Petit',['CDM'],79)],
 (2008,'Germany'): [('Hitzlsperger',['CM'],79),('Jansen',['LB'],79),('Rolfes',['CDM'],79),('Fritz',['RB'],77),('Gomez M',['ST'],81)],
 (2008,'Italy'): [('Aquilani',['CM'],80),('Perrotta',['CM'],80),('Panucci',['RB'],80),('Di Natale',['ST'],81),('Chiellini',['CB'],81)],
 (2008,'Russia'): [('Semak',['CM'],79),('Bilyaletdinov',['LM'],79),('Torbinski',['RM'],77),('Kolodin',['CB'],78),('Malafeev',['GK'],78)],
 (2008,'Spain'): [('Fabregas',['CM'],83),('Cazorla',['LW'],81),('Senna',['CDM'],81),('Marchena',['CB'],80),('Arbeloa',['RB'],80)],
 (2008,'Turkey'): [('Sabri',['RB'],77),('Gokdeniz',['CM'],78),('Aurelio',['LB'],78),('Semih',['ST'],78),('Volkan',['GK'],79)],
}

# ── Euro 2012–2024 additions ────────────────────────────────────────────────────
EURO_B = {
 (2012,'England'): [('Welbeck',['ST'],79),('Young A',['LW'],80),('Oxlade-Chamberlain',['RM'],78),('Jagielka',['CB'],79),('Baines',['LB'],81)],
 (2012,'France'): [('Cabaye',['CM'],81),('Diarra A',['CDM'],80),('Giroud',['ST'],79),('Debuchy',['RB'],79),('Mexes',['CB'],79),('Reveillere',['RB'],77)],
 (2012,'Germany'): [('Gomez M',['ST'],82),('Reus',['CAM'],83),('Gotze',['CAM'],82),('Kroos',['CM'],82),('Schurrle',['LW'],80),('Badstuber',['CB'],81)],
 (2012,'Italy'): [('Balzaretti',['LB'],79),('Abate',['RB'],79),('Montolivo',['CM'],81),('Diamanti',['CAM'],79),('Di Natale',['ST'],80),('Maggio',['RB'],78)],
 (2012,'Portugal'): [('Postiga',['ST'],79),('Almeida H',['ST'],78),('Custodio',['CDM'],78),('Nelson Oliveira',['ST'],76),('Rolando',['CB'],79),('Eduardo',['GK'],78)],
 (2012,'Spain'): [('Mata',['LW'],84),('Navas',['RW'],82),('Negredo',['ST'],81),('Llorente',['ST'],82),('Arbeloa',['RB'],81)],
 (2016,'Belgium'): [('Origi',['ST'],78),('Fellaini',['CM'],81),('Nainggolan',['CDM'],84),('Batshuayi',['ST'],79),('Ciman',['CB'],77)],
 (2016,'England'): [('Lallana',['CAM'],81),('Dier',['CDM'],80),('Sturridge',['ST'],81),('Clyne',['RB'],79),('Rashford',['ST'],78)],
 (2016,'France'): [('Matuidi',['CM'],83),('Coman',['RW'],81),('Martial',['LW'],82),('Rami',['CB'],79),('Mangala',['CB'],78)],
 (2016,'Germany'): [('Draxler',['LW'],83),('Sane',['LW'],81),('Can',['CM'],79),('Mustafi',['CB'],81),('Gomez M',['ST'],81)],
 (2016,'Portugal'): [('Joao Mario',['CM'],80),('Andre Gomes',['CM'],80),('Quaresma',['RW'],81),('Eder',['ST'],77),('Guerreiro R',['LB'],79)],
 (2016,'Wales'): [('King A',['CM'],75),('Cotterill',['LW'],73),('Edwards D',['CM'],73),('Lawrence T',['CAM'],74),('MacDonald',['GK'],72)],
 (2020,'Belgium'): [('Doku',['LW'],79),('Praet',['CM'],79),('Denayer',['CB'],79),('Castagne',['RB'],79),('Batshuayi',['ST'],78)],
 (2020,'Denmark'): [('Poulsen Y',['ST'],79),('Stryger Larsen',['RB'],77),('Vestergaard',['CB'],79),('Jensen M',['CM'],77),('Norgaard',['CDM'],77)],
 (2020,'England'): [('Mount',['CAM'],83),('Grealish',['LW'],82),('Phillips',['CDM'],80),('Henderson J',['CM'],82),('Walker K',['RB'],84)],
 (2020,'France'): [('Kimpembe',['CB'],82),('Rabiot',['CM'],81),('Tolisso',['CM'],81),('Sissoko',['CM'],80),('Coman',['RW'],84),('Lenglet',['CB'],81)],
 (2020,'Germany'): [('Sule',['CB'],84),('Gundogan',['CM'],86),('Musiala',['CAM'],79),('Sane',['LW'],85),('Rudiger',['CB'],84)],
 (2020,'Italy'): [('Locatelli',['CM'],81),('Pessina',['CM'],79),('Emerson',['LB'],80),('Florenzi',['RB'],80),('Berardi',['RW'],81)],
 (2020,'Netherlands'): [('De Jong F',['CM'],87),('Van Aanholt',['LB'],78),('Ake',['CB'],81),('Weghorst',['ST'],78),('Veltman',['RB'],78)],
 (2020,'Portugal'): [('Andre Silva',['ST'],81),('Diogo Jota',['LW'],82),('William Carvalho',['CDM'],80),('Danilo Pereira',['CDM'],80),('Semedo N',['RB'],81),('Palhinha',['CDM'],79)],
 (2020,'Spain'): [('Morata',['ST'],82),('Gerard Moreno',['ST'],83),('Thiago',['CM'],84),('Sarabia',['RW'],81),('Marcos Llorente',['CM'],83)],
 (2024,'Belgium'): [('Trossard',['LW','ST'],82),('Openda',['ST'],81),('Carrasco',['LW'],81),('Mangala',['CM'],79),('Vermeeren',['CDM'],78)],
 (2024,'England'): [('Watkins',['ST'],82),('Palmer',['CAM'],84),('Gordon A',['LW'],81),('Konsa',['CB'],80),('Gallagher',['CM'],80)],
 (2024,'France'): [('Kante',['CDM'],83),('Rabiot',['CM'],82),('Barcola',['LW'],80),('Kolo Muani',['ST'],81),('Upamecano',['CB'],84),('Theo Hernandez',['LB'],84)],
 (2024,'Germany'): [('Gundogan',['CM'],84),('Sane',['RW'],85),('Andrich',['CDM'],80),('Raum',['LB'],81),('Fullkrug',['ST'],80),('Schlotterbeck',['CB'],81)],
 (2024,'Italy'): [('Chiesa',['RW'],82),('Pellegrini L',['CM'],81),('Zaccagni',['LW'],80),('Retegui',['ST'],79),('Vicario',['GK'],81)],
 (2024,'Portugal'): [('Bruno Fernandes',['CAM'],87),('Joao Cancelo',['RB'],84),('Nuno Mendes',['LB'],83),('Diogo Jota',['LW'],83),('Pedro Neto',['RW'],80),('Goncalo Ramos',['ST'],80)],
 (2024,'Spain'): [('Dani Olmo',['CAM'],83),('Merino',['CM'],83),('Joselu',['ST'],80),('Zubimendi',['CDM'],82),('Ferran Torres',['LW'],81)],
 (2024,'Switzerland'): [('Vargas',['LW'],79),('Rieder',['CM'],78),('Elvedi',['CB'],79),('Aebischer',['CM'],78),('Amdouni',['ST'],77)],
 (2024,'Turkey'): [('Mert Gunok',['GK'],79),('Yildiz',['LW'],80),('Akgun',['RW'],78),('Kokcu',['CM'],81),('Kahveci',['CAM'],80),('Bardakci',['CB'],78)],
}

# ── World Cup 2018 & 2022 additions (full names to match this file) ──────────────
WC_NEW = {
 (2018,'Argentina'): [('Nicolás Otamendi',['CB'],82),('Cristian Pavón',['RW'],78),('Nicolás Tagliafico',['LB'],78),('Lucas Biglia',['CDM'],80),('Federico Fazio',['CB'],77)],
 (2018,'Australia'): [('Daniel Arzani',['LW'],68),('Andrew Nabbout',['ST'],68),('Massimo Luongo',['CM'],70),('James Meredith',['LB'],67),('Tomi Juric',['ST'],69)],
 (2018,'Belgium'): [('Yannick Carrasco',['LW'],82),('Youri Tielemans',['CM'],80),('Mousa Dembélé',['CM'],81),('Vincent Kompany',['CB'],84),('Adnan Januzaj',['LW'],77)],
 (2018,'Brazil'): [('Roberto Firmino',['ST'],84),('Filipe Luís',['LB'],82),('Fagner',['RB'],78),('Renato Augusto',['CM'],80)],
 (2018,'England'): [('Eric Dier',['CDM'],80),('Kyle Walker',['RB'],84),('Danny Rose',['LB'],80),('Fabian Delph',['CM'],78),('Jamie Vardy',['ST'],82)],
 (2018,'France'): [('Lucas Hernández',['LB'],81),('Corentin Tolisso',['CM'],82),('Ousmane Dembélé',['RW'],83),('Steven Nzonzi',['CDM'],81),('Presnel Kimpembe',['CB'],79)],
 (2018,'Germany'): [('Timo Werner',['ST'],83),('Antonio Rüdiger',['CB'],82),('Niklas Süle',['CB'],81),('Marvin Plattenhardt',['LB'],78),('Sebastian Rudy',['CM'],80)],
 (2018,'Italy'): [('Federico Bernardeschi',['RW'],79),('Marco Parolo',['CM'],78),('Antonio Candreva',['RM'],80),('Andrea Belotti',['ST'],81),('Alessio Romagnoli',['CB'],80)],
 (2018,'Japan'): [('Yuya Osako',['ST'],74),('Genki Haraguchi',['RW'],74),('Tomoaki Makino',['CB'],72),('Hotaru Yamaguchi',['CDM'],73),('Ryota Oshima',['CM'],72)],
 (2018,'Mexico'): [('Rafael Márquez',['CB'],76),('Giovani dos Santos',['CAM'],77),('Carlos Salcedo',['CB'],76),('Raúl Jiménez',['ST'],79),('Edson Álvarez',['CDM'],76)],
 (2018,'Morocco'): [('Younès Belhanda',['CAM'],76),('Romain Saïss',['CB'],77),('Mehdi Carcela',['LW'],75),('Karim El Ahmadi',['CDM'],76),('Youssef En-Nesyri',['ST'],74)],
 (2018,'Portugal'): [('André Silva',['ST'],80),('João Mário',['CM'],80),('Gonçalo Guedes',['LW'],79),('Mário Rui',['LB'],78),('Cédric Soares',['RB'],79)],
 (2018,'Senegal'): [('Keita Baldé',['LW'],78),('Moussa Wagué',['RB'],73),('Badou Ndiaye',['CM'],76),('Mame Biram Diouf',['ST'],75),('Kara Mbodji',['CB'],75)],
 (2018,'Spain'): [('Thiago',['CM'],85),('Koke',['CM'],83),('Saúl',['CM'],83),('Nacho',['CB'],81),('Rodrigo',['ST'],81)],
 (2022,'Argentina'): [('Lautaro Martínez',['ST'],84),('Lisandro Martínez',['CB'],81),('Gonzalo Montiel',['RB'],79),('Germán Pezzella',['CB'],79)],
 (2022,'Australia'): [('Riley McGree',['CM'],72),('Keanu Baccus',['CDM'],70),('Nathaniel Atkinson',['RB'],70),('Kye Rowles',['CB'],71),('Jamie Maclaren',['ST'],71)],
 (2022,'Belgium'): [('Youri Tielemans',['CM'],81),('Leandro Trossard',['LW'],81),('Amadou Onana',['CM'],80),('Charles De Ketelaere',['CAM'],79),('Michy Batshuayi',['ST'],78)],
 (2022,'Brazil'): [('Antony',['RW'],81),('Bruno Guimarães',['CM'],82),('Éder Militão',['CB'],83)],
 (2022,'England'): [('Mason Mount',['CAM'],83),('Jordan Henderson',['CM'],81),('Marcus Rashford',['LW'],82),('Kieran Trippier',['RB'],81),('Jack Grealish',['LW'],82)],
 (2022,'France'): [('Jules Koundé',['RB'],84),('Eduardo Camavinga',['CM'],82),('Marcus Thuram',['ST'],80),('William Saliba',['CB'],82),('Kingsley Coman',['RW'],84)],
 (2022,'Germany'): [('Leroy Sané',['RW'],85),('Niclas Füllkrug',['ST'],79),('Jonas Hofmann',['RM'],81),('Nico Schlotterbeck',['CB'],80),('Christian Günter',['LB'],79)],
 (2022,'Italy'): [('Federico Dimarco',['LB'],80),('Sandro Tonali',['CM'],81),('Manuel Locatelli',['CM'],81),('Gianluca Scamacca',['ST'],79),('Alessandro Bastoni',['CB'],84)],
 (2022,'Japan'): [('Daizen Maeda',['ST'],74),('Junya Ito',['RW'],77),('Hidemasa Morita',['CM'],76),('Takehiro Tomiyasu',['CB'],79),('Kaoru Mitoma',['LW'],78)],
 (2022,'Mexico'): [('Raúl Jiménez',['ST'],79),('Andrés Guardado',['CM'],77),('Luis Chávez',['CM'],76),('Orbelín Pineda',['CAM'],76),('Jesús Corona',['RW'],79)],
 (2022,'Morocco'): [('Noussair Mazraoui',['RB'],79),('Sofiane Boufal',['LW'],78),('Walid Cheddira',['ST'],74),('Bilal El Khannouss',['CAM'],74),('Jawad El Yamiq',['CB'],75)],
 (2022,'Portugal'): [('Vitinha',['CM'],80),('Otávio',['RM'],80),('Diogo Dalot',['RB'],80),('João Palhinha',['CDM'],80),('Gonçalo Ramos',['ST'],79)],
 (2022,'Senegal'): [('Pape Matar Sarr',['CM'],75),('Krépin Diatta',['RW'],77),('Bamba Dieng',['ST'],74),('Youssouf Sabaly',['RB'],76),('Famara Diédhiou',['ST'],74)],
 (2022,'Spain'): [('Rodri',['CDM'],86),('Koke',['CM'],83),('Nico Williams',['LW'],79),('Ansu Fati',['LW'],79),('Carlos Soler',['CM'],80)],
}

if __name__ == '__main__':
    expand('src/data/players_wc_old.json',  'WC',   WC_OLD)
    expand('src/data/players_euro_a.json',  'EURO', EURO_A)
    expand('src/data/players_euro_b.json',  'EURO', EURO_B)
    expand('src/data/players_wc_new.json',  'WC',   WC_NEW)
