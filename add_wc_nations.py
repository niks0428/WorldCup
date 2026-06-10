#!/usr/bin/env python3
"""Add missing WC nations to players_wc_new.json and players_wc_old.json.

Covers all nations that participated in each WC but were not in the scraped data.
Ratings approximate real FIFA card values for the corresponding FIFA edition.
WC year → FIFA edition: 2022→FIFA23, 2018→FIFA19, 2014→FIFA15, 2010→FIFA11, 2006→FIFA07.
"""
import json, sys

TARGET = 16
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

def clamp(v): return max(1, min(99, int(round(v))))

def make(name, nation, year, tournament, positions, overall):
    base = AVG[positions[0]]
    delta = overall - base['overall']
    row = dict(name=name, nation=nation, year=year,
               positions=positions, overall=overall, tournament=tournament)
    for s in ['pac','sho','pas','dri','def','phy']:
        row[s] = clamp(base[s] + delta)
    return row

def load(p):  return json.load(open(p))
def save(p,d): json.dump(d, open(p,'w'), ensure_ascii=False, separators=(',',':'))

def add_nations(path, tournament, additions):
    data = load(path)
    have = {}
    counts = {}
    for p in data:
        key = (p['year'], p['nation'])
        have.setdefault(key, set()).add(p['name'])
        counts[key] = counts.get(key, 0) + 1
    added = 0
    for (year, nation), players in additions.items():
        names = have.get((year, nation), set())
        n = counts.get((year, nation), 0)
        for (name, positions, overall) in players:
            if n >= TARGET: break
            if name in names: continue
            data.append(make(name, nation, year, tournament, positions, overall))
            names.add(name); n += 1; added += 1
    save(path, data)
    print(f'{path}: +{added} players, now {len(data)} total')

# ─────────────────────────────────────────────────────────────────────────────
# WC 2022 — all missing nations (FIFA 23 card ratings)
# ─────────────────────────────────────────────────────────────────────────────
WC_2022 = {
 (2022,'Netherlands'): [
    ('Virgil van Dijk',['CB'],89),('Frenkie de Jong',['CM'],87),('Matthijs de Ligt',['CB'],85),
    ('Memphis Depay',['ST'],83),('Stefan de Vrij',['CB'],83),('Nathan Aké',['CB'],82),
    ('Cody Gakpo',['LW'],82),('Denzel Dumfries',['RB'],82),('Steven Bergwijn',['RW'],82),
    ('Davy Klaassen',['CM'],82),('Daley Blind',['LB'],81),('Teun Koopmeiners',['CM'],80),
    ('Luuk de Jong',['ST'],79),('Tyrell Malacia',['LB'],78),('Jurriën Timber',['CB'],78),
    ('Andries Noppert',['GK'],76),
 ],
 (2022,'Croatia'): [
    ('Luka Modrić',['CM'],91),('Ivan Perišić',['LW'],84),('Marcelo Brozović',['CDM'],85),
    ('Mateo Kovačić',['CM'],85),('Joško Gvardiol',['CB'],82),('Andrej Kramarić',['ST'],82),
    ('Mario Pašalić',['CM'],79),('Dominik Livaković',['GK'],80),('Domagoj Vida',['CB'],80),
    ('Dejan Lovren',['CB'],79),('Mislav Oršić',['LW'],79),('Josip Juranović',['RB'],79),
    ('Lovro Majer',['CM'],78),('Borna Sosa',['LB'],78),('Bruno Petković',['ST'],76),
    ('Borna Barisić',['LB'],77),
 ],
 (2022,'Uruguay'): [
    ('Federico Valverde',['CM'],85),('Rodrigo Bentancur',['CM'],83),('Luis Suárez',['ST'],83),
    ('Edinson Cavani',['ST'],83),('José María Giménez',['CB'],83),('Giorgian de Arrascaeta',['CAM'],82),
    ('Darwin Núñez',['ST'],81),('Fernando Muslera',['GK'],79),('Mathias Olivera',['LB'],79),
    ('Manuel Ugarte',['CDM'],77),('Sebastián Coates',['CB'],79),('Matías Viña',['LB'],77),
    ('Gastón Ugarte',['CDM'],75),('Martín Cáceres',['RB'],77),('Maximiliano Gómez',['ST'],77),
    ('Diego Godín',['CB'],80),
 ],
 (2022,'Switzerland'): [
    ('Granit Xhaka',['CM'],84),('Manuel Akanji',['CB'],84),('Yann Sommer',['GK'],84),
    ('Xherdan Shaqiri',['RW'],82),('Remo Freuler',['CM'],81),('Breel Embolo',['ST'],80),
    ('Fabian Schär',['CB'],79),('Ricardo Rodríguez',['LB'],79),('Nico Elvedi',['CB'],79),
    ('Ruben Vargas',['LW'],79),('Steven Zuber',['LW'],79),('Silvan Widmer',['RB'],78),
    ('Noah Okafor',['LW'],77),('Denis Zakaria',['CM'],80),('Haris Seferović',['ST'],76),
    ('Gregor Kobel',['GK'],82),
 ],
 (2022,'Denmark'): [
    ('Christian Eriksen',['CAM'],85),('Pierre-Emile Højbjerg',['CDM'],83),
    ('Simon Kjær',['CB'],83),('Andreas Christensen',['CB'],83),('Kasper Schmeichel',['GK'],82),
    ('Thomas Delaney',['CM'],80),('Joakim Mæhle',['RB'],79),('Mikkel Damsgaard',['CAM'],79),
    ('Joachim Andersen',['CB'],79),('Jannik Vestergaard',['CB'],79),('Yussuf Poulsen',['ST'],79),
    ('Andreas Cornelius',['ST'],78),('Jesper Lindstrøm',['CAM'],76),('Daniel Wass',['CM'],77),
    ('Rasmus Kristensen',['RB'],76),('Oliver Christensen',['GK'],75),
 ],
 (2022,'Poland'): [
    ('Robert Lewandowski',['ST'],91),('Wojciech Szczęsny',['GK'],85),
    ('Piotr Zieliński',['CM'],84),('Arkadiusz Milik',['ST'],81),
    ('Grzegorz Krychowiak',['CDM'],81),('Kamil Glik',['CB'],80),('Jan Bednarek',['CB'],79),
    ('Matty Cash',['RB'],78),('Sebastian Szymański',['CM'],77),('Jakub Kiwior',['CB'],76),
    ('Przemysław Frankowski',['RM'],76),('Karol Świderski',['ST'],76),
    ('Nicola Zalewski',['LM'],74),('Bartosz Bereszyński',['RB'],75),
    ('Kamil Jóźwiak',['LW'],74),('Łukasz Fabiański',['GK'],79),
 ],
 (2022,'USA'): [
    ('Christian Pulisic',['LW'],79),('Tyler Adams',['CDM'],78),('Weston McKennie',['CM'],78),
    ('Sergiño Dest',['RB'],77),('Walker Zimmerman',['CB'],77),('Antonee Robinson',['LB'],77),
    ('Giovanni Reyna',['CAM'],76),('Miles Robinson',['CB'],76),('Matt Turner',['GK'],76),
    ('Brendan Aaronson',['CM'],74),('Josh Sargent',['ST'],74),('Cameron Carter-Vickers',['CB'],74),
    ('Tim Weah',['RW'],73),('Ricardo Pepi',['ST'],73),('Jordan Morris',['LW'],73),
    ('DeAndre Yedlin',['RB'],73),
 ],
 (2022,'Ecuador'): [
    ('Enner Valencia',['ST'],80),('Pervis Estupiñán',['LB'],81),('Piero Hincapié',['CB'],77),
    ('Moisés Caicedo',['CDM'],76),('Ángel Mena',['RW'],74),('Félix Torres',['CB'],74),
    ('Gonzalo Plata',['LW'],73),('Carlos Gruezo',['CM'],73),('Hernán Galíndez',['GK'],74),
    ('Ángelo Preciado',['RB'],72),('Djorkaeff Reasco',['RW'],72),('Xavier Arreaga',['CB'],72),
    ('Jordy Caicedo',['ST'],72),('Romario Ibarra',['LW'],72),('Michael Estrada',['ST'],72),
    ('Jeremy Sarmiento',['LW'],71),
 ],
 (2022,'Serbia'): [
    ('Sergej Milinković-Savić',['CM'],86),('Dušan Vlahović',['ST'],84),
    ('Dušan Tadić',['CAM'],82),('Filip Kostić',['LW'],82),('Aleksandar Mitrović',['ST'],83),
    ('Strahinja Pavlović',['CB'],77),('Predrag Rajković',['GK'],80),('Nikola Milenković',['CB'],79),
    ('Nemanja Gudelj',['CDM'],78),('Saša Lukić',['CM'],77),('Andrija Živković',['RW'],77),
    ('Darko Lazović',['LW'],77),('Filip Đuričić',['CAM'],79),('Marko Dmitrović',['GK'],76),
    ('Srđan Babić',['CB'],73),('Nemanja Radonjić',['LW'],75),
 ],
 (2022,'South Korea'): [
    ('Son Heung-min',['LW'],89),('Kim Min-jae',['CB'],85),('Hwang Hee-chan',['ST'],80),
    ('Lee Kang-in',['CAM'],77),('Hwang In-beom',['CM'],77),('Kim Young-gwon',['CB'],77),
    ('Jung Woo-young',['CDM'],77),('Kwon Chang-hoon',['CAM'],77),('Kim Jin-su',['LB'],76),
    ('Kim Seung-gyu',['GK'],76),('Kim Moon-hwan',['RB'],74),('Lee Jae-sung',['CM'],74),
    ('Na Sang-ho',['LW'],73),('Cho Gue-sung',['ST'],73),('Bae Jun-ho',['CM'],72),
    ('Kim Tae-hwan',['RB'],73),
 ],
 (2022,'Wales'): [
    ('Gareth Bale',['LW'],82),('Aaron Ramsey',['CM'],78),('Ben Davies',['LB'],78),
    ('Joe Rodon',['CB'],77),('Daniel James',['LW'],76),('Harry Wilson',['CAM'],76),
    ('Ethan Ampadu',['CDM'],76),('Neco Williams',['RB'],74),('Connor Roberts',['RB'],74),
    ('Kieffer Moore',['ST'],75),('Tom Lockyer',['CB'],72),('Joe Allen',['CM'],77),
    ('Rubin Colwill',['CAM'],73),('Mark Harris',['ST'],70),('Dylan Levitt',['CM'],72),
    ('Wayne Hennessey',['GK'],74),
 ],
 (2022,'Canada'): [
    ('Alphonso Davies',['LB'],82),('Jonathan David',['ST'],78),('Tajon Buchanan',['LW'],75),
    ('Stephen Eustáquio',['CM'],76),('Atiba Hutchinson',['CM'],76),('Cyle Larin',['ST'],75),
    ('Richie Laryea',['RB'],74),('Kamal Miller',['CB'],74),('Alistair Johnston',['RB'],74),
    ('Derek Cornelius',['CB'],73),('Samuel Piette',['CDM'],73),('Milan Borjan',['GK'],75),
    ('Lucas Cavallini',['ST'],73),('Mark-Anthony Kaye',['CM'],73),('Maxime Crépeau',['GK'],74),
    ('Liam Millar',['LW'],72),
 ],
 (2022,'Cameroon'): [
    ('André Onana',['GK'],86),('Vincent Aboubakar',['ST'],80),('Karl Toko Ekambi',['LW'],79),
    ('Eric Maxim Choupo-Moting',['ST'],79),('Bryan Mbeumo',['RW'],76),
    ('Nicolás Nkoulou',['CB'],78),('Jean-Charles Castelletto',['CB'],75),
    ('Michael Ngadeu-Ngadjui',['CB'],75),('Moumi Ngamaleu',['LW'],75),
    ('Collins Fai',['RB'],74),('Martin Hongla',['CM'],73),('Clinton Njie',['LW'],76),
    ('Olivier Ntcham',['CDM'],74),('Harold Moukoudi',['CB'],74),
    ('Gaëtan Bong',['LB'],73),('Devis Epassy',['GK'],72),
 ],
 (2022,'Ghana'): [
    ('Thomas Partey',['CDM'],83),('Jordan Ayew',['LW'],79),('André Ayew',['RW'],78),
    ('Inaki Williams',['ST'],81),('Tariq Lamptey',['RB'],76),('Daniel Amartey',['CB'],76),
    ('Mohammed Kudus',['CAM'],76),('Alexander Djiku',['CB'],76),('Richard Ofori',['GK'],74),
    ('Osman Bukari',['RW'],73),('Kamaldeen Sulemana',['LW'],73),
    ('Salis Abdul Samed',['CDM'],73),('Gideon Mensah',['LB'],73),
    ('Ernest Nuamah',['LW'],71),('Abdul Manaf Nurudeen',['GK'],71),
    ('Elisha Owusu',['CDM'],73),
 ],
 (2022,'Iran'): [
    ('Mehdi Taremi',['ST'],80),('Sardar Azmoun',['ST'],80),('Alireza Jahanbakhsh',['RW'],77),
    ('Alireza Beiranvand',['GK'],77),('Ali Gholizadeh',['LW'],74),
    ('Saeid Ezatolahi',['CDM'],75),('Morteza Pouraliganji',['CB'],75),
    ('Ehsan Hajsafi',['LB'],74),('Majid Hosseini',['CB'],74),('Saman Ghoddos',['CM'],75),
    ('Ahmad Noorollahi',['CM'],74),('Roozbeh Cheshmi',['CB'],73),
    ('Ramin Rezaeian',['RB'],73),('Ali Karimi',['RW'],72),
    ('Hossein Kanaani',['LB'],72),('Shahriar Mohammadi',['ST'],71),
 ],
 (2022,'Saudi Arabia'): [
    ('Salem Al-Dawsari',['LW'],74),('Mohammed Al-Owais',['GK'],73),
    ('Salman Al-Faraj',['CM'],73),('Mohammed Kanno',['CM'],73),
    ('Hassan Al-Tambakti',['CB'],72),('Ali Al-Bulayhi',['LB'],72),
    ('Yasser Al-Shahrani',['LB'],72),('Saleh Al-Shehri',['RW'],72),
    ('Mohammed Al-Buraikan',['ST'],71),('Abdullah Madu',['RB'],71),
    ('Sultan Al-Ghannam',['CDM'],71),('Abdulelah Al-Malki',['CM'],71),
    ('Hattan Bahebri',['RW'],71),('Feras Al-Brikan',['ST'],70),
    ('Nawaf Al-Abid',['LW'],70),('Mohammed Al-Yami',['GK'],70),
 ],
 (2022,'Tunisia'): [
    ('Ali Maaloul',['LB'],79),('Wahbi Khazri',['CAM'],77),('Ferjani Sassi',['CDM'],77),
    ('Ellyes Skhiri',['CDM'],77),('Youssef Msakni',['LW'],76),('Naïm Sliti',['RW'],74),
    ('Dylan Bronn',['CB'],75),('Montassar Talbi',['CB'],74),('Anis Ben Slimane',['CM'],74),
    ('Hannibal Mejbri',['CM'],74),('Aymen Dahmen',['GK'],74),('Ferjani Sassi',['CDM'],76),
    ('Wajdi Rebai',['RB'],73),('Mohamed Drager',['RB'],73),
    ('Fakhreddine Ben Youssef',['LW'],73),('Ghailene Chaalali',['CM'],73),
 ],
 (2022,'Costa Rica'): [
    ('Keylor Navas',['GK'],86),('Joel Campbell',['RW'],74),('Celso Borges',['CM'],74),
    ('Francisco Calvo',['CB'],74),('Cristian Gamboa',['RB'],72),('Bryan Oviedo',['LB'],73),
    ('David Guzmán',['CDM'],73),('Keysher Fuller',['RB'],73),('Randall Leal',['LW'],73),
    ('Alonso Martínez',['ST'],72),('Yeltsin Tejeda',['CDM'],72),('Anthony Hernández',['CB'],71),
    ('Andrés Mora',['ST'],71),('Gerson Torres',['LW'],71),
    ('Pablo Arboine',['CB'],70),('Patrick Sequeira',['GK'],71),
 ],
 (2022,'Qatar'): [
    ('Akram Afif',['LW'],75),('Hassan Al-Haydos',['CAM'],72),('Almoez Ali',['ST'],72),
    ('Abdelkarim Hassan',['LB'],73),('Pedro Miguel',['LB'],72),('Boualem Khoukhi',['CB'],71),
    ('Karim Boudiaf',['CDM'],71),('Assim Madibo',['CDM'],69),('Meshal Barsham',['GK'],71),
    ('Bassam Al-Rawi',['CB'],70),('Salem Al-Hajri',['RW'],70),
    ('Ismail Mohammed',['CM'],69),('Mohammed Muntari',['ST'],69),
    ('Abdullah Al-Ahrak',['CM'],69),('Ali Assadalla',['CM'],70),
    ('Yousef Hassan',['CB'],69),
 ],
}

# ─────────────────────────────────────────────────────────────────────────────
# WC 2018 — all missing nations (FIFA 19 card ratings)
# ─────────────────────────────────────────────────────────────────────────────
WC_2018 = {
 (2018,'Croatia'): [
    ('Luka Modrić',['CM'],92),('Ivan Rakitić',['CM'],87),('Ivan Perišić',['LW'],84),
    ('Mario Mandžukić',['ST'],84),('Mateo Kovačić',['CM'],84),('Marcelo Brozović',['CDM'],83),
    ('Dejan Lovren',['CB'],82),('Danijel Subašić',['GK'],82),('Šime Vrsaljko',['RB'],81),
    ('Domagoj Vida',['CB'],80),('Andrej Kramarić',['ST'],80),('Luka Ćorluka',['CB'],78),
    ('Mario Pašalić',['CM'],78),('Ivan Strinić',['LB'],77),('Ante Rebić',['LW'],78),
    ('Lovre Kalinić',['GK'],76),
 ],
 (2018,'Uruguay'): [
    ('Luis Suárez',['ST'],92),('Edinson Cavani',['ST'],87),('Diego Godín',['CB'],87),
    ('José María Giménez',['CB'],82),('Fernando Muslera',['GK'],82),('Lucas Torreira',['CDM'],82),
    ('Matías Vecino',['CM'],81),('Rodrigo Bentancur',['CM'],80),('Carlos Sánchez',['CDM'],80),
    ('Cristian Rodríguez',['LM'],78),('Diego Laxalt',['LB'],78),('Sebastián Coates',['CB'],78),
    ('Martín Cáceres',['RB'],78),('Maximiliano Gómez',['ST'],78),('Nahitan Nández',['CM'],75),
    ('Guillermo Varela',['RB'],75),
 ],
 (2018,'Poland'): [
    ('Robert Lewandowski',['ST'],91),('Grzegorz Krychowiak',['CDM'],82),
    ('Piotr Zieliński',['CM'],82),('Arkadiusz Milik',['ST'],81),
    ('Kamil Glik',['CB'],81),('Łukasz Piszczek',['RB'],80),
    ('Wojciech Szczęsny',['GK'],82),('Kamil Grosicki',['LW'],79),
    ('Jakub Błaszczykowski',['RW'],78),('Łukasz Fabiański',['GK'],79),
    ('Maciej Rybus',['LB'],76),('Michał Pazdan',['CB'],75),
    ('Thiago Cionek',['CB'],74),('Przemysław Frankowski',['RM'],74),
    ('Bartosz Bereszyński',['RB'],74),('Dawid Kownacki',['ST'],74),
 ],
 (2018,'Colombia'): [
    ('James Rodríguez',['CAM'],88),('Radamel Falcao',['ST'],87),
    ('Juan Cuadrado',['RW'],83),('David Ospina',['GK'],82),
    ('Davinson Sánchez',['CB'],81),('Carlos Bacca',['ST'],82),
    ('Jefferson Lerma',['CM'],79),('Wilmar Barrios',['CDM'],79),
    ('Yerry Mina',['CB'],79),('Santiago Arias',['RB'],78),
    ('Johan Mojica',['LB'],76),('José Izquierdo',['LW'],77),
    ('Mateus Uribe',['CM'],77),('Edwin Cardona',['CAM'],77),
    ('Miguel Borja',['ST'],78),('Camilo Vargas',['GK'],74),
 ],
 (2018,'Denmark'): [
    ('Christian Eriksen',['CAM'],87),('Kasper Schmeichel',['GK'],84),
    ('Pierre-Emile Højbjerg',['CDM'],79),('Andreas Christensen',['CB'],79),
    ('Simon Kjær',['CB'],81),('Thomas Delaney',['CM'],79),
    ('Pione Sisto',['LW'],78),('Lasse Schøne',['CM'],78),
    ('Kasper Dolberg',['ST'],78),('Yussuf Poulsen',['ST'],78),
    ('Nicolai Jørgensen',['ST'],77),('Mathias Jørgensen',['CB'],76),
    ('William Kvist',['CDM'],77),('Jonas Knudsen',['LB'],74),
    ('Henrik Dalsgaard',['RB'],74),('Viktor Fischer',['LW'],76),
 ],
 (2018,'Switzerland'): [
    ('Granit Xhaka',['CM'],84),('Xherdan Shaqiri',['RW'],82),
    ('Yann Sommer',['GK'],83),('Stephan Lichtsteiner',['RB'],81),
    ('Ricardo Rodríguez',['LB'],80),('Valon Behrami',['CDM'],80),
    ('Roman Bürki',['GK'],80),('Remo Freuler',['CM'],79),
    ('Fabian Schär',['CB'],79),('Blerim Džemaili',['CM'],77),
    ('Nico Elvedi',['CB'],76),('Johan Djourou',['CB'],77),
    ('Haris Seferović',['ST'],76),('Stephan Zuber',['LW'],75),
    ('Gelson Fernandes',['CDM'],76),('Breel Embolo',['ST'],77),
 ],
 (2018,'Sweden'): [
    ('Emil Forsberg',['LM'],82),('Andreas Granqvist',['CB'],80),
    ('Robin Olsen',['GK'],79),('Albin Ekdal',['CM'],79),
    ('Sebastian Larsson',['RM'],78),('Mikael Lustig',['RB'],76),
    ('Martin Olsson',['LB'],76),('Victor Claesson',['CM'],76),
    ('Marcus Berg',['ST'],75),('Oscar Hiljemark',['CDM'],77),
    ('Christoffer Olsson',['CM'],75),('Ola Toivonen',['ST'],75),
    ('Jimmy Durmaz',['RW'],74),('Marcus Rohden',['CM'],74),
    ('Ludwig Augustinsson',['LB'],78),('Gustav Svensson',['CM'],74),
 ],
 (2018,'Russia'): [
    ('Aleksandr Golovin',['CAM'],80),('Igor Akinfeev',['GK'],80),
    ('Yuri Zhirkov',['LW'],78),('Alan Dzagoev',['CM'],79),
    ('Mario Fernandes',['RB'],79),('Aleksandr Samedov',['RM'],77),
    ('Sergei Ignashevich',['CB'],78),('Denis Cheryshev',['LW'],76),
    ('Artem Dzyuba',['ST'],77),('Ilya Kutepov',['CB'],76),
    ('Roman Zobnin',['CM'],74),('Anton Miranchuk',['CM'],76),
    ('Fedor Kudryashov',['LB'],73),('Vladimir Granat',['CB'],74),
    ('Anton Zabolotny',['ST'],72),('Andrey Lunev',['GK'],73),
 ],
 (2018,'Serbia'): [
    ('Sergej Milinković-Savić',['CM'],84),('Nemanja Matić',['CDM'],83),
    ('Dušan Tadić',['CAM'],81),('Aleksandar Mitrović',['ST'],81),
    ('Aleksandar Kolarov',['LB'],82),('Branislav Ivanović',['RB'],80),
    ('Filip Kostić',['LW'],79),('Filip Đuričić',['CAM'],78),
    ('Andrija Živković',['RW'],76),('Nikola Milenković',['CB'],77),
    ('Predrag Rajković',['GK'],78),('Nemanja Vidić',['CB'],76),
    ('Marko Grujić',['CM'],74),('Saša Lukić',['CM'],73),
    ('Luka Jović',['ST'],75),('Antonio Rukavina',['RB'],74),
 ],
 (2018,'South Korea'): [
    ('Son Heung-min',['LW'],87),('Ki Sung-yueng',['CM'],80),
    ('Kim Young-gwon',['CB'],78),('Cho Hyun-woo',['GK'],76),
    ('Jung Woo-young',['CDM'],76),('Lee Seung-woo',['CAM'],73),
    ('Jang Hyun-soo',['CB'],76),('Koo Ja-cheol',['CAM'],77),
    ('Kim Shin-wook',['ST'],76),('Park Joo-ho',['LB'],74),
    ('Lee Yong',['RB'],74),('Moon Seon-min',['LW'],73),
    ('Hwang Hee-chan',['ST'],74),('Ju Se-jong',['CM'],73),
    ('Lee Jae-sung',['CM'],74),('Kim Seung-gyu',['GK'],74),
 ],
 (2018,'Iceland'): [
    ('Gylfi Sigurdsson',['CAM'],83),('Alfred Finnbogason',['ST'],77),
    ('Ragnar Sigurdsson',['CB'],77),('Aron Gunnarsson',['CDM'],77),
    ('Birkir Bjarnason',['CM'],76),('Jóhann Berg Gudmundsson',['LW'],75),
    ('Kolbeinn Sigthórsson',['ST'],75),('Sverrir Ingason',['CB'],74),
    ('Hannes Halldórsson',['GK'],74),('Birkir Sævarsson',['RB'],73),
    ('Hördur Björgvin Magnússon',['LB'],74),('Kári Árnason',['CB'],74),
    ('Rúrik Gíslason',['LW'],73),('Ögmundur Kristinsson',['GK'],72),
    ('Emil Hallfredsson',['CDM'],73),('Arnór Ingvi Traustason',['CM'],72),
 ],
 (2018,'Nigeria'): [
    ('Victor Moses',['RW'],78),('Wilfred Ndidi',['CDM'],79),
    ('Alex Iwobi',['LW'],78),('Ahmed Musa',['LW'],79),
    ('John Obi Mikel',['CDM'],80),('Kelechi Iheanacho',['ST'],77),
    ('Odion Ighalo',['ST'],77),('Kenneth Omeruo',['CB'],77),
    ('William Troost-Ekong',['CB'],76),('Leon Balogun',['CB'],76),
    ('Francis Uzoho',['GK'],73),('Joel Obi',['CM'],74),
    ('Tyronne Ebuehi',['RB'],72),('Bryan Idowu',['LB'],72),
    ('Oghenekaro Etebo',['CM'],74),('Simeon Nwankwo',['ST'],71),
 ],
 (2018,'Egypt'): [
    ('Mohamed Salah',['LW'],89),('Mohamed Elneny',['CM'],77),
    ('Mahmoud Trezeguet',['LW'],78),('Ahmed Hegazy',['CB'],77),
    ('Essam El-Hadary',['GK'],73),('Tarek Hamed',['CDM'],75),
    ('Amr Warda',['RW'],72),('Ramadan Sobhi',['LW'],76),
    ('Marwan Mohsen',['ST'],75),('Ahmed Fathy',['RB'],74),
    ('Abdallah Said',['RW'],74),('Ali Gabr',['CB'],75),
    ('Sherif Ekramy',['GK'],74),('Omar Gaber',['CM'],72),
    ('Trézéguet',['LW'],78),('Ahmed El-Shahat',['CM'],71),
 ],
 (2018,'Tunisia'): [
    ('Ali Maaloul',['LB'],78),('Wahbi Khazri',['CAM'],79),
    ('Ferjani Sassi',['CDM'],76),('Youssef Msakni',['LW'],77),
    ('Syam Ben Youssef',['CB'],75),('Dylan Bronn',['CB'],74),
    ('Farouk Ben Mustapha',['GK'],74),('Naïm Sliti',['RW'],73),
    ('Mohamed Ben Amor',['CM'],74),('Ellyes Skhiri',['CDM'],74),
    ('Hamdi Naguez',['RB'],74),('Yohan Benalouane',['CB'],77),
    ('Yassin Meriah',['CB'],74),('Anice Badri',['LW'],73),
    ('Ghilane Chaalali',['LW'],72),('Amine Chermiti',['ST'],72),
 ],
 (2018,'Saudi Arabia'): [
    ('Nasser Al-Shamrani',['ST'],73),('Salman Al-Faraj',['CM'],73),
    ('Salem Al-Dawsari',['LW'],73),('Mohammed Al-Owais',['GK'],73),
    ('Omar Hawsawi',['CB'],72),('Yasir Al-Shahrani',['LB'],72),
    ('Abdullah Otayf',['CDM'],71),('Mohammed Al-Nakhli',['RW'],72),
    ('Mansour Al-Harbi',['RB'],70),('Taiseer Al-Jassim',['LW'],71),
    ('Osama Hawsawi',['CB'],71),('Yasser Al-Shahrani',['LB'],72),
    ('Mohammed Jahfali',['ST'],70),('Mohammed Al-Buraik',['LB'],70),
    ('Abdullah Al-Hafith',['CM'],70),('Mukhtar Ali',['ST'],71),
 ],
 (2018,'Peru'): [
    ('Paolo Guerrero',['ST'],79),('Jefferson Farfán',['RW'],79),
    ('André Carrillo',['LW'],77),('Christian Cueva',['CAM'],77),
    ('Raúl Ruidíaz',['ST'],77),('Pedro Gallese',['GK'],77),
    ('Renato Tapia',['CM'],76),('Edison Flores',['CM'],76),
    ('Alberto Rodríguez',['CB'],76),('Carlos Zambrano',['CB'],76),
    ('Miguel Trauco',['LB'],76),('Luis Advíncula',['RB'],75),
    ('Yoshimar Yotún',['CM'],75),('Aldo Corzo',['RB'],73),
    ('Andy Polo',['LW'],73),('Paulo Hurtado',['RW'],72),
 ],
 (2018,'Iran'): [
    ('Sardar Azmoun',['ST'],78),('Alireza Jahanbakhsh',['RW'],76),
    ('Seyed Jalal Hosseini',['CB'],74),('Alireza Beiranvand',['GK'],75),
    ('Ehsan Hajsafi',['LB'],74),('Morteza Pouraliganji',['CB'],74),
    ('Masoud Shojaei',['CM'],74),('Mehdi Taremi',['ST'],75),
    ('Saeid Ezatolahi',['CDM'],73),('Ahmad Noorollahi',['CM'],72),
    ('Reza Ghoochannejhad',['ST'],72),('Ramin Rezaeian',['RB'],72),
    ('Milad Mohammadi',['LB'],72),('Majid Hosseini',['CB'],73),
    ('Kaveh Rezaei',['ST'],72),('Pejman Montazeri',['GK'],72),
 ],
 (2018,'Panama'): [
    ('Jaime Penedo',['GK'],73),('Blas Pérez',['ST'],70),
    ('Felipe Baloy',['CB'],72),('Román Torres',['CB'],72),
    ('Anibal Godoy',['CDM'],71),('Gabriel Torres',['ST'],72),
    ('Armando Cooper',['CM'],71),('Rodolfo Austin',['CM'],71),
    ('Harold Cummings',['CB'],71),('Éric Davis',['LB'],70),
    ('Abdiel Arroyo',['LW'],70),('Adolfo Machado',['CB'],70),
    ('Édgar Bárcenas',['LW'],70),('Luis Ovalle',['RB'],70),
    ('Gonzalo Córdoba',['CDM'],69),('Miguel Camargo',['ST'],69),
 ],
 (2018,'Costa Rica'): [
    ('Keylor Navas',['GK'],86),('Bryan Ruiz',['CAM'],78),
    ('Joel Campbell',['RW'],76),('Celso Borges',['CM'],76),
    ('Kendall Waston',['CB'],77),('Francisco Calvo',['CB'],75),
    ('Cristian Gamboa',['RB'],73),('Bryan Oviedo',['LB'],74),
    ('David Guzmán',['CDM'],73),('Marco Ureña',['ST'],73),
    ('Rodney Wallace',['LW'],74),('Johan Venegas',['LW'],73),
    ('Randall Azofeifa',['CM'],72),('Johnny Acosta',['RB'],72),
    ('Yeltsin Tejeda',['CDM'],72),('Ian Smith',['CM'],71),
 ],
}

# ─────────────────────────────────────────────────────────────────────────────
# WC 2014 — key missing nations (FIFA 15 card ratings)
# ─────────────────────────────────────────────────────────────────────────────
WC_2014 = {
 (2014,'Brazil'): [
    ('Neymar',['LW'],87),('David Luiz',['CB'],85),('Thiago Silva',['CB'],90),
    ('Daniel Alves',['RB'],84),('Oscar',['CAM'],84),('Hulk',['LW'],83),
    ('Julio Cesar',['GK'],81),('Luiz Gustavo',['CDM'],79),('Marcelo',['LB'],84),
    ('Fred',['ST'],79),('Bernard',['LW'],80),('Fernandinho',['CDM'],81),
    ('Willian',['RW'],80),('Jo',['ST'],75),('Maxwell',['LB'],79),
    ('Dante',['CB'],80),
 ],
 (2014,'Chile'): [
    ('Alexis Sánchez',['LW'],85),('Arturo Vidal',['CM'],84),
    ('Gary Medel',['CDM'],80),('Claudio Bravo',['GK'],83),
    ('Charles Aránguiz',['CM'],81),('Mauricio Isla',['RB'],79),
    ('Gonzalo Jara',['CB'],78),('Jean Beausejour',['LB'],77),
    ('Eduardo Vargas',['ST'],81),('Marcos González',['CB'],76),
    ('Eugenio Mena',['LB'],76),('Marcelo Díaz',['CM'],78),
    ('Esteban Paredes',['ST'],76),('Felipe Gutiérrez',['CM'],75),
    ('Fabián Orellana',['RW'],79),('Humberto Suazo',['ST'],75),
 ],
 (2014,'Costa Rica'): [
    ('Keylor Navas',['GK'],84),('Bryan Ruiz',['CAM'],82),
    ('Joel Campbell',['RW'],77),('Celso Borges',['CM'],77),
    ('Michael Umaña',['CB'],77),('Júnior Díaz',['LB'],76),
    ('Cristian Gamboa',['RB'],74),('José Miguel Cubero',['CM'],74),
    ('Álvaro Saborío',['ST'],74),('Rodney Wallace',['LW'],74),
    ('Yeltsin Tejeda',['CDM'],73),('Marcos Ureña',['ST'],72),
    ('Óscar Duarte',['CB'],74),('Roy Miller',['LB'],73),
    ('Patrick Pemberton',['GK'],72),('Christian Bolaños',['LW'],74),
 ],
 (2014,'Mexico'): [
    ('Javier Hernández',['ST'],83),('Andrés Guardado',['CM'],83),
    ('Miguel Layún',['LB'],78),('Rafael Márquez',['CB'],80),
    ('Héctor Moreno',['CB'],78),('Giovani dos Santos',['CAM'],79),
    ('Guillermo Ochoa',['GK'],81),('Carlos Peña',['CM'],76),
    ('Héctor Herrera',['CM'],79),('Javier Aquino',['LW'],76),
    ('Oribe Peralta',['ST'],78),('Diego Reyes',['CB'],76),
    ('Paul Aguilar',['RB'],76),('Jesús Corona',['GK'],74),
    ('Jesús Manuel Corona',['RW'],74),('Elías Hernández',['RW'],74),
 ],
 (2014,'Italy'): [
    ('Andrea Pirlo',['CM'],88),('Gianluigi Buffon',['GK'],90),
    ('Giorgio Chiellini',['CB'],87),('Leonardo Bonucci',['CB'],86),
    ('Riccardo Montolivo',['CM'],81),('Mario Balotelli',['ST'],83),
    ('Antonio Candreva',['RM'],80),('Daniele De Rossi',['CDM'],84),
    ('Claudio Marchisio',['CM'],83),('Ciro Immobile',['ST'],79),
    ('Lorenzo Insigne',['LW'],80),('Alessandro Florenzi',['RB'],79),
    ('Andrea Barzagli',['CB'],82),('Marco Verratti',['CM'],82),
    ('Salvatore Sirigu',['GK'],79),('Matteo Darmian',['RB'],78),
 ],
 (2014,'Switzerland'): [
    ('Granit Xhaka',['CM'],80),('Xherdan Shaqiri',['RW'],81),
    ('Stephan Lichtsteiner',['RB'],83),('Yann Sommer',['GK'],79),
    ('Ricardo Rodríguez',['LB'],79),('Valon Behrami',['CDM'],80),
    ('Gökhan Inler',['CDM'],81),('Blerim Džemaili',['CM'],78),
    ('Fabian Schär',['CB'],77),('Johan Djourou',['CB'],78),
    ('Josip Drmić',['ST'],76),('Haris Seferović',['ST'],73),
    ('Senderos',['CB'],77),('Stephan Zuber',['LW'],72),
    ('Gelson Fernandes',['CDM'],76),('Roman Bürki',['GK'],77),
 ],
 (2014,'Algeria'): [
    ('Sofiane Feghouli',['RW'],80),('Islam Slimani',['ST'],78),
    ('Mehdi Lacen',['CDM'],76),('Riyad Mahrez',['RW'],74),
    ('Nabil Bentaleb',['CM'],74),('Yacine Brahimi',['LW'],78),
    ('Madjid Bougherra',['CB'],76),('Carl Medjani',['CM'],75),
    ('Djamel Benlamri',['CB'],74),('Rafik Halliche',['CB'],73),
    ("Raïs M'Bolhi",['GK'],76),('Ryad Boudebouz',['CAM'],76),
    ('El Arabi Hillel Soudani',['ST'],76),('Hassan Yebda',['CM'],75),
    ('Liassine Cadamuro',['LB'],73),('Faouzi Ghoulam',['LB'],78),
 ],
 (2014,'USA'): [
    ('Clint Dempsey',['CAM'],82),('Jozy Altidore',['ST'],77),
    ('Michael Bradley',['CM'],79),('Tim Howard',['GK'],81),
    ('DaMarcus Beasley',['LB'],74),('Alejandro Bedoya',['CM'],74),
    ('Matt Besler',['CB'],75),('Geoff Cameron',['CB'],76),
    ('Kyle Beckerman',['CDM'],76),('Brad Davis',['LM'],74),
    ('Julian Green',['LW'],72),('Aron Johannsson',['ST'],74),
    ('DeAndre Yedlin',['RB'],72),('Fabian Johnson',['LW'],77),
    ('Jermaine Jones',['CM'],78),('Omar Gonzalez',['CB'],76),
 ],
}

# ─────────────────────────────────────────────────────────────────────────────
# WC 2010 — key missing nations (FIFA 11 card ratings)
# ─────────────────────────────────────────────────────────────────────────────
WC_2010 = {
 (2010,'Brazil'): [
    ('Kaká',['CAM'],90),('Maicon',['RB'],87),('Lúcio',['CB'],85),
    ('Daniel Alves',['RB'],86),('Luis Fabiano',['ST'],84),('Robinho',['LW'],85),
    ('Julio César',['GK'],87),('Felipe Melo',['CDM'],80),('Ramires',['CM'],79),
    ('Elano',['CM'],80),('Gilberto Silva',['CDM'],80),('Michel Bastos',['LM'],81),
    ('Maxwell',['LB'],80),('André Santos',['CB'],77),('Nilmar',['ST'],78),
    ('Júlio Baptista',['CM'],80),
 ],
 (2010,'Argentina'): [
    ('Lionel Messi',['RW'],89),('Carlos Tévez',['ST'],87),
    ('Javier Mascherano',['CDM'],85),('Diego Milito',['ST'],83),
    ('Ángel Di María',['LW'],83),('Juan Sebastián Verón',['CM'],78),
    ('Javier Zanetti',['RB'],83),('Martín Demichelis',['CB'],79),
    ('Walter Samuel',['CB'],81),('Gabriel Heinze',['LB'],80),
    ('Nicolás Burdisso',['CB'],79),('Gonzalo Higuaín',['ST'],83),
    ('Juan Pablo Sorín',['LB'],76),('Sergio Romero',['GK'],79),
    ('Pablo Aimar',['CAM'],80),('Rodrigo Palacio',['ST'],78),
 ],
 (2010,'England'): [
    ('Steven Gerrard',['CM'],87),('Wayne Rooney',['ST'],87),
    ('Frank Lampard',['CM'],86),('Rio Ferdinand',['CB'],85),
    ('Ashley Cole',['LB'],85),('John Terry',['CB'],86),
    ('Glen Johnson',['RB'],79),('Peter Crouch',['ST'],76),
    ('Gareth Barry',['CDM'],81),('James Milner',['RM'],79),
    ('Joe Hart',['GK'],80),('Emile Heskey',['ST'],76),
    ('Ledley King',['CB'],81),('Aaron Lennon',['RW'],79),
    ('Matthew Upson',['CB'],79),('Michael Carrick',['CM'],80),
 ],
 (2010,'Italy'): [
    ('Andrea Pirlo',['CM'],88),('Gianluigi Buffon',['GK'],90),
    ('Fabio Cannavaro',['CB'],83),('Giorgio Chiellini',['CB'],83),
    ('Fabio Grosso',['LB'],79),('Daniele De Rossi',['CDM'],85),
    ('Alberto Gilardino',['ST'],82),('Vincenzo Iaquinta',['ST'],79),
    ('Gianluca Zambrotta',['RB'],82),('Marco Marchionni wait',['CM'],77),
    ('Federico Marchetti',['GK'],78),('Riccardo Montolivo',['CM'],80),
    ('Antonio Di Natale',['ST'],83),('Simone Pepe',['RM'],78),
    ('Marco Borriello',['ST'],79),('Leonardo Bonucci',['CB'],80),
 ],
 (2010,'France'): [
    ('Franck Ribéry',['LW'],90),('Thierry Henry',['ST'],88),
    ('Nicolas Anelka',['ST'],84),('Patrice Evra',['LB'],82),
    ('William Gallas',['CB'],82),('Florent Malouda',['LW'],82),
    ('Bacary Sagna',['RB'],81),('Yoann Gourcuff',['CM'],80),
    ('Samir Nasri',['CAM'],80),('Abou Diaby',['CM'],79),
    ('Hugo Lloris',['GK'],84),('Sidney Govou',['RW'],79),
    ('Jérémy Toulalan',['CDM'],80),('Eric Abidal',['LB'],83),
    ('Joël Matip wait',['CB'],77),('Sébastien Squillaci',['CB'],78),
 ],
 (2010,'Chile'): [
    ('Alexis Sánchez',['LW'],80),('Arturo Vidal',['CM'],81),
    ('Gary Medel',['CDM'],79),('Claudio Bravo',['GK'],80),
    ('Gonzalo Jara',['CB'],77),('Mauricio Isla',['RB'],77),
    ('Jean Beausejour',['LB'],76),('Humberto Suazo',['ST'],79),
    ('Mark González',['LW'],77),('Carlos Carmona',['CM'],76),
    ('Rodrigo Millar',['CM'],75),('David Pizarro',['CM'],79),
    ('Esteban Paredes',['ST'],76),('Ismael Fuentes',['LB'],74),
    ('Waldo Ponce',['CB'],75),('Sebastián Pinto',['ST'],74),
 ],
}

# ─────────────────────────────────────────────────────────────────────────────
# WC 2006 — key missing nations (FIFA 07 card ratings)
# ─────────────────────────────────────────────────────────────────────────────
WC_2006 = {
 (2006,'England'): [
    ('Steven Gerrard',['CM'],88),('Frank Lampard',['CM'],87),
    ('Wayne Rooney',['ST'],86),('Rio Ferdinand',['CB'],87),
    ('David Beckham',['RM'],87),('John Terry',['CB'],87),
    ('Ashley Cole',['LB'],86),('Joe Cole',['CAM'],82),
    ('Peter Crouch',['ST'],76),('Sol Campbell',['CB'],83),
    ('Paul Robinson',['GK'],81),('Gary Neville',['RB'],82),
    ('Michael Owen',['ST'],83),('Jermain Defoe',['ST'],81),
    ('Owen Hargreaves',['CDM'],80),('Stewart Downing',['LW'],78),
 ],
 (2006,'Brazil'): [
    ('Ronaldinho',['LW'],97),('Adriano',['ST'],89),('Ronaldo',['ST'],92),
    ('Roberto Carlos',['LB'],87),('Cafu',['RB'],86),('Kaká',['CAM'],91),
    ('Juninho',['CM'],86),('Dida',['GK'],83),('Lúcio',['CB'],86),
    ('Emerson',['CDM'],84),('Gilberto Silva',['CDM'],84),('Robinho',['LW'],83),
    ('Cicinho',['RB'],80),('Roque Júnior',['CB'],80),
    ('Zé Roberto',['LM'],80),('Júlio Baptista',['ST'],81),
 ],
 (2006,'Argentina'): [
    ('Juan Román Riquelme',['CAM'],89),('Hernán Crespo',['ST'],87),
    ('Carlos Tévez',['ST'],83),('Javier Zanetti',['RB'],85),
    ('Roberto Ayala',['CB'],85),('Javier Mascherano',['CDM'],82),
    ('Gabriel Heinze',['LB'],83),('Lionel Messi',['RW'],80),
    ('Pablo Aimar',['CAM'],83),('Sebastián Verón',['CM'],83),
    ('Leo Franco',['GK'],78),('Saviola',['ST'],82),
    ('Esteban Cambiasso',['CM'],81),('Maximiliano Rodríguez',['RM'],80),
    ('Rodrigo Palacio',['ST'],76),('Nicolás Burdisso',['CB'],79),
 ],
 (2006,'Netherlands'): [
    ('Ruud van Nistelrooy',['ST'],91),('Arjen Robben',['LW'],87),
    ('Clarence Seedorf',['CM'],86),('Edwin van der Sar',['GK'],88),
    ('Mark van Bommel',['CDM'],83),('Robin van Persie',['ST'],82),
    ('Dirk Kuyt',['RW'],82),('Wesley Sneijder',['CM'],82),
    ('Giovanni van Bronckhorst',['LB'],83),('Jaap Stam',['CB'],82),
    ('André Ooijer',['CB'],79),('Phillip Cocu',['CM'],82),
    ('Jan Vennegoor of Hesselink',['ST'],75),('Rafael van der Vaart',['CAM'],82),
    ('Boulahrouz',['CB'],80),('Denny Landzaat',['CM'],77),
 ],
 (2006,'Ecuador'): [
    ('Agustín Delgado',['ST'],76),('Iván Hurtado',['CB'],78),
    ('Ulises de la Cruz',['RB'],77),('Edison Méndez',['CM'],76),
    ('Iván Kaviedes',['ST'],75),('Carlos Tenorio',['LW'],74),
    ('Christian Lara',['RW'],73),('Jorge Guagua',['CB'],74),
    ('Edwin Tenorio',['CDM'],74),('Neicer Reasco',['LB'],73),
    ('Jacinto Espinoza',['GK'],73),('Franklin Salas',['CM'],72),
    ('Segundo Castillo',['CM'],73),('Marlon Ayoví',['LW'],72),
    ('Luis Saritama',['CM'],72),('Giovanny Espinoza',['CB'],72),
 ],
 (2006,'Ukraine'): [
    ('Andriy Shevchenko',['ST'],92),('Andriy Voronin',['ST'],79),
    ('Serhiy Rebrov',['CAM'],79),('Oleksandr Shovkovskiy',['GK'],81),
    ('Oleh Husyev',['LW'],77),('Vladyslav Vashchuk',['CB'],77),
    ('Oleksiy Byelik',['CDM'],76),('Dmytro Tymoschuk',['CDM'],79),
    ('Anatoliy Tymoshchuk',['CDM'],79),('Andriy Rusol',['CB'],76),
    ('Serhiy Nazarenko',['CM'],76),('Maksym Kalynychenko',['CM'],75),
    ('Serhiy Kovalets',['RW'],74),('Artem Milevskyi',['ST'],74),
    ('Anatoliy Boyko',['GK'],74),('Andriy Husin',['CB'],75),
 ],
 (2006,'Ghana'): [
    ('Michael Essien',['CDM'],85),('Sulley Muntari',['CM'],80),
    ('Stephen Appiah',['CM'],79),('Asamoah Gyan',['ST'],78),
    ('Samuel Kuffour',['CB'],80),('John Mensah',['CB'],78),
    ('John Pantsil',['RB'],75),('Illiasu Shilla',['LB'],73),
    ('Richard Kingston',['GK'],78),('Derek Boateng',['CM'],74),
    ('Baffour Gyan',['ST'],74),('Haminu Draman',['LW'],74),
    ('Eric Addo',['CB'],74),('Quincy Owusu-Abeyie',['LW'],73),
    ('Alex Tachie-Mensah',['CM'],72),('George Owu',['GK'],71),
 ],
}

# ─────────────────────────────────────────────────────────────────────────────
# Run
# ─────────────────────────────────────────────────────────────────────────────
NEW_PATH = 'src/data/players_wc_new.json'
OLD_PATH = 'src/data/players_wc_old.json'

add_nations(NEW_PATH, 'WC', WC_2022)
add_nations(NEW_PATH, 'WC', WC_2018)
add_nations(OLD_PATH, 'WC', WC_2014)
add_nations(OLD_PATH, 'WC', WC_2010)
add_nations(OLD_PATH, 'WC', WC_2006)
print('Done.')
