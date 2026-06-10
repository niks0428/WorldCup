#!/usr/bin/env python3
"""Add missing Euro nations to players_euro_b.json (2012-2024)."""
import json

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
    row = dict(name=name, nation=nation, year=year, positions=positions,
               overall=overall, tournament=tournament)
    for s in ['pac','sho','pas','dri','def','phy']:
        row[s] = clamp(base[s] + delta)
    return row

def add_nations(path, tournament, additions):
    data = json.load(open(path))
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
    json.dump(data, open(path,'w'), ensure_ascii=False, separators=(',',':'))
    print(f'{path}: +{added}, now {len(data)}')

# ── Euro 2012 additions (FIFA 13 era ratings) ─────────────────────────────────
EURO_2012 = {
 (2012,'Croatia'): [
    ('Luka Modrić',['CM'],86),('Ivan Rakitić',['CM'],82),
    ('Ivan Perišić',['LW'],78),('Mario Mandžukić',['ST'],81),
    ('Darijo Srna',['RB'],83),('Vedran Ćorluka',['CB'],81),
    ('Dejan Lovren',['CB'],78),('Stipe Pletikosa',['GK'],80),
    ('Niko Kranjčar',['CAM'],82),('Eduardo',['ST'],78),
    ('Ivan Klasnić',['ST'],78),('Ognjen Vukojević',['CDM'],76),
 ],
 (2012,'Czech Republic'): [
    ('Petr Čech',['GK'],88),('Tomáš Rosický',['CAM'],84),
    ('Milan Baroš',['ST'],79),('Václav Pilař',['RW'],76),
    ('Roman Hubník',['CB'],77),('Theodor Gebre Selassie',['RB'],77),
    ('Daniel Kolář',['CM'],75),('Tomáš Sivok',['CB'],77),
    ('David Limberský',['LB'],74),('Jiří Jarošík',['CDM'],74),
    ('Michal Kadlec',['LB'],77),('Ondřej Kúdela',['CM'],76),
 ],
 (2012,'Denmark'): [
    ('Christian Eriksen',['CAM'],82),('Nicklas Bendtner',['ST'],80),
    ('Daniel Agger',['CB'],83),('Simon Kjær',['CB'],79),
    ('Michael Silberbauer',['CM'],74),('Lasse Schøne',['CM'],75),
    ('Simon Poulsen',['LB'],73),('Kasper Schmeichel',['GK'],79),
    ('Dennis Rommedahl',['LW'],78),('Peter Ankersen',['RB'],72),
    ('Niki Zimling',['CM'],74),('Michael Krohn-Dehli',['CAM'],77),
 ],
 (2012,'Greece'): [
    ('Giorgos Karagounis',['CM'],80),('Kostas Katsouranis',['CM'],78),
    ('Theofanis Gekas',['ST'],77),('Sotiris Ninis',['CAM'],76),
    ('Vangelis Moras',['CB'],76),('Vassilis Torosidis',['RB'],79),
    ('Kostas Fortounis',['CAM'],76),('Giorgos Samaras',['ST'],78),
    ('Orestis Karnezis',['GK'],76),('Sokratis Papastathopoulos',['CB'],80),
    ('Kyros Hehas',['LB'],73),('Loukas Vyntra',['CB'],74),
 ],
 (2012,'Ireland'): [
    ('Robbie Keane',['ST'],80),('Damien Duff',['LW'],80),
    ('Shay Given',['GK'],81),('John O\'Shea',['CB'],77),
    ('Richard Dunne',['CB'],79),('Seamus Coleman',['RB'],77),
    ('James McCarthy',['CM'],76),('Aiden McGeady',['RW'],78),
    ('Kevin Doyle',['ST'],76),('Shane Long',['ST'],74),
    ('Keith Andrews',['CDM'],75),('Glenn Whelan',['CDM'],76),
 ],
 (2012,'Netherlands'): [
    ('Robin van Persie',['ST'],89),('Arjen Robben',['RW'],89),
    ('Wesley Sneijder',['CM'],87),('Klaas-Jan Huntelaar',['ST'],84),
    ('Rafael van der Vaart',['CAM'],84),('Mark van Bommel',['CDM'],82),
    ('John Heitinga',['CB'],81),('Gregory van der Wiel',['RB'],79),
    ('Jetro Willems',['LB'],74),('Joris Mathijsen',['CB'],79),
    ('Khalid Boulahrouz',['CB'],79),('Dirk Kuyt',['RW'],81),
 ],
 (2012,'Poland'): [
    ('Robert Lewandowski',['ST'],85),('Jakub Błaszczykowski',['RW'],82),
    ('Łukasz Piszczek',['RB'],80),('Euzebiusz Smolarek',['LW'],77),
    ('Grzegorz Krychowiak',['CDM'],78),('Kamil Glik',['CB'],78),
    ('Wojciech Szczęsny',['GK'],79),('Maciej Rybus',['LB'],75),
    ('Artur Boruc',['GK'],80),('Marcin Wasilewski',['CB'],76),
    ('Sebastian Boenisch',['LB'],75),('Rafał Murawski',['CM'],75),
 ],
 (2012,'Russia'): [
    ('Andrei Arshavin',['CAM'],82),('Aleksandr Kerzhakov',['ST'],80),
    ('Roman Shirokov',['CM'],80),('Sergei Ignashevich',['CB'],81),
    ('Vasili Berezutski',['CB'],79),('Yuri Zhirkov',['LW'],80),
    ('Igor Akinfeev',['GK'],83),('Konstantin Zyryanov',['CM'],78),
    ('Alan Dzagoev',['CM'],79),('Denis Kombarov',['LB'],75),
    ('Aleksandr Anyukov',['RB'],77),('Mikhail Bilyaletdinov',['CM'],75),
 ],
 (2012,'Sweden'): [
    ('Zlatan Ibrahimović',['ST'],90),('Kim Källström',['CM'],80),
    ('Olof Mellberg',['CB'],80),('Sebastian Larsson',['RM'],79),
    ('Andreas Granqvist',['CB'],78),('Jonas Olsson',['CB'],77),
    ('Pontus Wernbloom',['CM'],76),('Anders Svensson',['CM'],78),
    ('Johan Elmander',['ST'],78),('Isaac Thelin',['ST'],73),
    ('Mikael Lustig',['RB'],75),('Martin Olsson',['LB'],75),
 ],
 (2012,'Ukraine'): [
    ('Andriy Shevchenko',['ST'],82),('Anatoliy Tymoshchuk',['CDM'],82),
    ('Andriy Yarmolenko',['LW'],80),('Yevhen Konoplyanka',['LW'],79),
    ('Serhiy Nazarenko',['CM'],74),('Oleh Husyev',['LW'],76),
    ('Bohdan Shust',['GK'],74),('Andriy Pyatov',['GK'],80),
    ('Oleksandr Kucher',['CB'],78),('Yaroslav Rakitskiy',['CB'],82),
    ('Taras Stepanenko',['CDM'],76),('Yevhen Seleznyov',['ST'],79),
 ],
}

# ── Euro 2016 additions (FIFA 17 era ratings) ─────────────────────────────────
EURO_2016 = {
 (2016,'Albania'): [
    ('Armando Sadiku',['ST'],73),('Ermir Lenjani',['LW'],72),
    ('Amir Abrashi',['CM'],71),('Ansi Agolli',['LB'],75),
    ('Lorik Cana',['CDM'],78),('Migjen Basha',['CM'],72),
    ('Shkelzen Gashi',['RW'],73),('Etrit Berisha',['GK'],76),
    ('Elseid Hysaj',['RB'],75),('Naser Aliji',['RB'],71),
    ('Andi Lila',['CB'],72),('Mergim Mavraj',['CB'],74),
 ],
 (2016,'Austria'): [
    ('David Alaba',['LB'],86),('Marko Arnautović',['LW'],80),
    ('Marc Janko',['ST'],77),('Christian Fuchs',['LB'],77),
    ('Martin Harnik',['ST'],76),('Julian Baumgartlinger',['CDM'],77),
    ('Marcel Sabitzer',['CAM'],79),('Robert Almer',['GK'],76),
    ('Sebastian Prödl',['CB'],79),('Zlatko Junuzović',['CM'],78),
    ('Aleksander Dragovic',['CB'],78),('Florian Klein',['RB'],75),
 ],
 (2016,'Croatia'): [
    ('Luka Modrić',['CM'],88),('Ivan Rakitić',['CM'],86),
    ('Ivan Perišić',['LW'],82),('Mario Mandžukić',['ST'],83),
    ('Darijo Srna',['RB'],83),('Vedran Ćorluka',['CB'],81),
    ('Dejan Lovren',['CB'],82),('Danijel Subašić',['GK'],82),
    ('Marcelo Brozović',['CDM'],80),('Mateo Kovačić',['CM'],82),
    ('Milan Badelj',['CDM'],79),('Ognjen Vukojević',['CDM'],76),
 ],
 (2016,'Czech Republic'): [
    ('Petr Čech',['GK'],86),('Tomáš Rosický',['CAM'],82),
    ('Milan Baroš',['ST'],79),('Tomáš Sivok',['CB'],78),
    ('Václav Kadlec',['ST'],74),('Ladislav Krejčí',['CM'],76),
    ('David Limberský',['LB'],74),('Theodor Gebre Selassie',['RB'],77),
    ('Vladimir Darida',['CM'],76),('Daniel Kolář',['CM'],75),
    ('Bořek Dočkal',['CAM'],78),('Josef Šural',['LW'],75),
 ],
 (2016,'Hungary'): [
    ('Zoltán Gera',['CM'],75),('Balázs Dzsudzsák',['LW'],79),
    ('Ádám Szalai',['ST'],74),('Gábor Király',['GK'],73),
    ('Richárd Guzmics',['CB'],75),('Ádám Lang',['CB'],73),
    ('Tamás Kádár',['CB'],74),('Barnabás Bese',['RB'],72),
    ('Ákos Elek',['CDM'],73),('László Kleinheisler',['CM'],73),
    ('Péter Gulácsi',['GK'],79),('Roland Juhász',['CB'],76),
 ],
 (2016,'Iceland'): [
    ('Gylfi Sigurdsson',['CAM'],81),('Aron Gunnarsson',['CDM'],77),
    ('Alfred Finnbogason',['ST'],77),('Ragnar Sigurdsson',['CB'],77),
    ('Birkir Bjarnason',['CM'],76),('Jóhann Berg Gudmundsson',['LW'],75),
    ('Hannes Halldórsson',['GK'],74),('Kolbeinn Sigthórsson',['ST'],75),
    ('Aron Einar Gunnarsson',['CDM'],77),('Kári Árnason',['CB'],74),
    ('Emil Hallfredsson',['CDM'],73),('Rúrik Gíslason',['LW'],73),
 ],
 (2016,'Ireland'): [
    ('Robbie Keane',['ST'],78),('Seamus Coleman',['RB'],79),
    ('John O\'Shea',['CB'],76),('Shay Given',['GK'],79),
    ('Shane Long',['ST'],74),('Wes Hoolahan',['CAM'],76),
    ('James McCarthy',['CM'],76),('Glenn Whelan',['CDM'],76),
    ('Richard Dunne',['CB'],76),('Daryl Murphy',['ST'],72),
    ('Stephen Ward',['LB'],75),('Aiden McGeady',['RW'],77),
 ],
 (2016,'Italy'): [
    ('Gianluigi Buffon',['GK'],90),('Giorgio Chiellini',['CB'],87),
    ('Leonardo Bonucci',['CB'],87),('Andrea Pirlo',['CM'],88),
    ('Antonio Conte',['CM'],76),('Eder',['ST'],77),
    ('Emanuele Giaccherini',['CM'],74),('Marco Parolo',['CM'],78),
    ('Alessandro Florenzi',['RB'],79),('Andrea Barzagli',['CB'],83),
    ('Graziano Pellè',['ST'],80),('Éder',['ST'],77),
 ],
 (2016,'Northern Ireland'): [
    ('Kyle Lafferty',['ST'],73),('Jonny Evans',['CB'],79),
    ('Steven Davis',['CM'],79),('Gareth McAuley',['CB'],76),
    ('Aaron Hughes',['CB'],75),('Will Grigg',['ST'],70),
    ('Niall McGinn',['RW'],72),('Stuart Dallas',['CM'],73),
    ('Paddy McNair',['CM'],70),('Chris Brunt',['LM'],75),
    ('Michael McGovern',['GK'],73),('Oliver Norwood',['CM'],73),
 ],
 (2016,'Poland'): [
    ('Robert Lewandowski',['ST'],91),('Kamil Grosicki',['LW'],79),
    ('Jakub Błaszczykowski',['RW'],79),('Łukasz Piszczek',['RB'],81),
    ('Grzegorz Krychowiak',['CDM'],82),('Kamil Glik',['CB'],81),
    ('Wojciech Szczęsny',['GK'],79),('Piotr Zieliński',['CM'],79),
    ('Maciej Rybus',['LB'],76),('Jan Bednarek',['CB'],74),
    ('Artur Boruc',['GK'],79),('Bartosz Kapustka',['LW'],73),
 ],
 (2016,'Romania'): [
    ('Florin Andone',['ST'],74),('Gabriel Torje',['LW'],74),
    ('Ciprian Marica',['ST'],74),('Cosmin Contra',['RB'],72),
    ('Vlad Chiriches',['CB'],76),('Florin Gardos',['CB'],74),
    ('Lucian Sanmartean',['CAM'],74),('Alexandru Chipciu',['RW'],74),
    ('Florin Tănase',['CM'],73),('Denis Alibec',['ST'],73),
    ('Tatarusanu',['GK'],77),('Mihai Pintilii',['CDM'],74),
 ],
 (2016,'Russia'): [
    ('Aleksandr Golovin',['CAM'],77),('Artem Dzyuba',['ST'],77),
    ('Denis Cheryshev',['LW'],76),('Alan Dzagoev',['CM'],78),
    ('Igor Akinfeev',['GK'],78),('Vasili Berezutski',['CB'],78),
    ('Sergei Ignashevich',['CB'],80),('Fyodor Smolov',['ST'],76),
    ('Roman Shirokov',['CM'],77),('Viktor Fayzulin',['CM'],75),
    ('Georgi Schennikov',['LB'],73),('Pavel Mamaev',['CM'],73),
 ],
 (2016,'Slovakia'): [
    ('Marek Hamšík',['CM'],85),('Martin Škriniar',['CB'],77),
    ('Róbert Mak',['LW'],76),('Vladimír Weiss',['RW'],76),
    ('Juraj Kucka',['CM'],79),('Ján Greguš',['CDM'],73),
    ('Martin Dúbravka',['GK'],75),('Martin Pecovsky',['CM'],74),
    ('Tomáš Hubočan',['LB'],75),('Peter Pekarík',['RB'],75),
    ('Norbert Gyömbér',['CB'],73),('Adam Nemec',['ST'],73),
 ],
 (2016,'Spain'): [
    ('Andrés Iniesta',['CM'],88),('Sergio Busquets',['CDM'],87),
    ('David Silva',['CAM'],86),('Gerard Piqué',['CB'],87),
    ('Sergio Ramos',['CB'],88),('Jordi Alba',['LB'],85),
    ('David De Gea',['GK'],84),('Álvaro Morata',['ST'],80),
    ('Cesc Fàbregas',['CAM'],86),('Juan Mata',['CAM'],82),
    ('Pedro',['RW'],82),('Juanfran',['RB'],80),
 ],
 (2016,'Sweden'): [
    ('Zlatan Ibrahimović',['ST'],88),('Emil Forsberg',['LM'],79),
    ('Ola Toivonen',['ST'],75),('Mikael Lustig',['RB'],75),
    ('Andreas Granqvist',['CB'],80),('Kim Källström',['CM'],79),
    ('Marcus Berg',['ST'],74),('Martin Olsson',['LB'],76),
    ('Pontus Wernbloom',['CM'],75),('Robin Olsen',['GK'],77),
    ('Albin Ekdal',['CM'],77),('Oscar Hiljemark',['CDM'],75),
 ],
 (2016,'Switzerland'): [
    ('Granit Xhaka',['CM'],79),('Xherdan Shaqiri',['RW'],80),
    ('Yann Sommer',['GK'],81),('Stephan Lichtsteiner',['RB'],82),
    ('Ricardo Rodríguez',['LB'],79),('Haris Seferović',['ST'],73),
    ('Blerim Džemaili',['CM'],77),('Fabian Schär',['CB'],77),
    ('Johan Djourou',['CB'],77),('Josip Drmić',['ST'],75),
    ('Nico Elvedi',['CB'],73),('Michael Lang',['RB'],73),
 ],
 (2016,'Turkey'): [
    ('Arda Turan',['CAM'],83),('Hakan Çalhanoglu',['CAM'],80),
    ('Burak Yılmaz',['ST'],80),('Volkan Babacan',['GK'],76),
    ('Emre Belözoğlu',['CM'],79),('Caner Erkin',['LB'],77),
    ('Ozan Tufan',['CM'],74),('Gökhan Gönül',['RB'],79),
    ('Mehmet Topal',['CDM'],79),('Serdar Aziz',['CB'],76),
    ('Selçuk İnan',['CM'],79),('Olcan Adın',['RW'],74),
 ],
 (2016,'Ukraine'): [
    ('Andriy Yarmolenko',['LW'],81),('Yevhen Konoplyanka',['LW'],80),
    ('Andriy Pyatov',['GK'],80),('Yaroslav Rakitskiy',['CB'],82),
    ('Taras Stepanenko',['CDM'],76),('Artem Fedetskiy',['RB'],74),
    ('Vyacheslav Shevchuk',['LB'],75),('Anatoliy Tymoshchuk',['CDM'],80),
    ('Ruslan Malinovskyi',['CAM'],74),('Roman Zozulya',['ST'],76),
    ('Yevhen Seleznyov',['ST'],76),('Serhiy Rybalka',['CM'],73),
 ],
}

# ── Euro 2020 additions (FIFA 21 era ratings) ─────────────────────────────────
EURO_2020 = {
 (2020,'Austria'): [
    ('David Alaba',['CB'],85),('Marko Arnautović',['ST'],79),
    ('Marcel Sabitzer',['CAM'],81),('Julian Baumgartlinger',['CDM'],78),
    ('Stefan Lainer',['RB'],78),('Konrad Laimer',['CM'],79),
    ('Christoph Baumgartner',['CAM'],76),('Florian Grillitsch',['CDM'],77),
    ('Michael Gregoritsch',['ST'],76),('Maximilian Wöber',['CB'],76),
    ('Aleksandar Dragovic',['CB'],77),('Daniel Bachmann',['GK'],76),
 ],
 (2020,'Croatia'): [
    ('Luka Modrić',['CM'],91),('Mateo Kovačić',['CM'],85),
    ('Ivan Perišić',['LW'],84),('Marcelo Brozović',['CDM'],85),
    ('Joško Gvardiol',['CB'],79),('Dejan Lovren',['CB'],80),
    ('Šime Vrsaljko',['RB'],80),('Dominik Livaković',['GK'],78),
    ('Ante Rebić',['LW'],82),('Bruno Petković',['ST'],75),
    ('Nikola Vlašić',['CAM'],80),('Andrej Kramarić',['ST'],81),
 ],
 (2020,'Czech Republic'): [
    ('Tomáš Souček',['CM'],78),('Patrik Schick',['ST'],78),
    ('Vladimír Darida',['CM'],76),('Alex Král',['CM'],76),
    ('Ondřej Čelůstka',['CB'],75),('Jiří Bořil',['LB'],74),
    ('Tomáš Vaclík',['GK'],80),('Tomáš Holeš',['CB'],75),
    ('Jakub Jankto',['LM'],76),('Petr Ševčík',['CM'],73),
    ('Lukáš Masopust',['RW'],74),('Ondřej Duda',['CAM'],76),
 ],
 (2020,'Finland'): [
    ('Teemu Pukki',['ST'],76),('Lukas Hradecky',['GK'],79),
    ('Glen Kamara',['CM'],76),('Jukka Raitala',['LB'],72),
    ('Paulus Arajuuri',['CB'],74),('Joona Toivio',['CB'],72),
    ('Tim Sparv',['CDM'],73),('Robert Taylor',['LW'],72),
    ('Rasmus Schüller',['CDM'],72),('Lassi Lappalainen',['LW'],72),
    ('Pyry Soiri',['RW'],70),('Marcus Forss',['ST'],71),
 ],
 (2020,'Hungary'): [
    ('Dominik Szoboszlai',['CAM'],80),('Roland Sallai',['RW'],76),
    ('Péter Gulácsi',['GK'],79),('Ádám Szalai',['ST'],75),
    ('Attila Fiola',['RB'],73),('Willi Orbán',['CB'],76),
    ('Ádám Lang',['CB'],74),('Loic Nego',['RB'],73),
    ('András Schäfer',['CM'],74),('Callum Styles',['CM'],71),
    ('Zsolt Kalmár',['CM'],72),('Máté Pátkai',['CM'],72),
 ],
 (2020,'North Macedonia'): [
    ('Eljif Elmas',['CAM'],78),('Goran Pandev',['ST'],79),
    ('Aleksandar Trajkovski',['RW'],75),('Ezgjan Alioski',['LB'],76),
    ('Stefan Ristovski',['RB'],74),('Egzon Bejtulai',['CM'],71),
    ('Ivan Trickovski',['LW'],73),('Stole Dimitrievski',['GK'],75),
    ('Daniel Avramovski',['CM'],71),('Boban Nikolov',['RM'],72),
    ('Arijan Ademi',['CDM'],74),('Tihomir Kostadinov',['CB'],72),
 ],
 (2020,'Russia'): [
    ('Aleksandr Golovin',['CAM'],82),('Artem Dzyuba',['ST'],79),
    ('Mikhail Mukhin',['CM'],73),('Denis Cheryshev',['LW'],77),
    ('Aleksei Miranchuk',['CM'],79),('Igor Akinfeev',['GK'],79),
    ('Yuri Zhirkov',['LW'],74),('Fedor Kudryashov',['LB'],73),
    ('Mário Fernandes',['RB'],79),('Georgi Dzhikiya',['CB'],77),
    ('Andrei Semyonov',['CB'],75),('Andrei Mostovoy',['LW'],73),
 ],
 (2020,'Scotland'): [
    ('Andrew Robertson',['LB'],84),('Kieran Tierney',['LB'],80),
    ('Scott McTominay',['CM'],77),('John McGinn',['CM'],79),
    ('Ryan Christie',['CAM'],76),('Billy Gilmour',['CM'],75),
    ('Lyndon Dykes',['ST'],74),('Che Adams',['ST'],74),
    ('Craig Gordon',['GK'],76),('Grant Hanley',['CB'],76),
    ('Jack Hendry',['CB'],73),('Nathan Patterson',['RB'],72),
 ],
 (2020,'Slovakia'): [
    ('Marek Hamšík',['CM'],83),('Milan Škriniar',['CB'],83),
    ('Stanislav Lobotka',['CDM'],78),('Ondrej Duda',['CAM'],76),
    ('Juraj Kucka',['CM'],79),('Martin Dúbravka',['GK'],79),
    ('Róbert Mak',['LW'],76),('Tomáš Hubočan',['LB'],75),
    ('Peter Pekarík',['RB'],75),('Dávid Hancko',['CB'],74),
    ('Lukáš Haraslín',['LW'],73),('Ivan Schranz',['LW'],72),
 ],
 (2020,'Sweden'): [
    ('Emil Forsberg',['LM'],84),('Alexander Isak',['ST'],79),
    ('Dejan Kulusevski',['RW'],80),('Victor Lindelöf',['CB'],82),
    ('Marcus Danielson',['CB'],76),('Ludwig Augustinsson',['LB'],78),
    ('Sebastian Larsson',['RM'],78),('Mikael Lustig',['RB'],75),
    ('Kristoffer Olsson',['CM'],75),('Jordan Larsson',['ST'],74),
    ('Robin Quaison',['LW'],76),('Pontus Jansson',['CB'],79),
 ],
 (2020,'Switzerland'): [
    ('Granit Xhaka',['CM'],84),('Xherdan Shaqiri',['RW'],82),
    ('Yann Sommer',['GK'],83),('Ricardo Rodríguez',['LB'],79),
    ('Manuel Akanji',['CB'],80),('Nico Elvedi',['CB'],79),
    ('Remo Freuler',['CM'],79),('Breel Embolo',['ST'],79),
    ('Haris Seferović',['ST'],76),('Fabian Schär',['CB'],79),
    ('Denis Zakaria',['CM'],78),('Ruben Vargas',['LW'],76),
 ],
 (2020,'Turkey'): [
    ('Hakan Çalhanoglu',['CAM'],82),('Çağlar Söyüncü',['CB'],81),
    ('Burak Yılmaz',['ST'],79),('Zeki Çelik',['RB'],77),
    ('Yusuf Yazıcı',['CAM'],78),('Ozan Tufan',['CM'],76),
    ('Okay Yokuslu',['CDM'],77),('Cengiz Ünder',['RW'],80),
    ('Mert Müldür',['RB'],75),('Umut Meraş',['LB'],74),
    ('Ugurcan Cakir',['GK'],77),('Merih Demiral',['CB'],79),
 ],
 (2020,'Ukraine'): [
    ('Andriy Yarmolenko',['LW'],80),('Roman Yaremchuk',['ST'],78),
    ('Ruslan Malinovskyi',['CAM'],80),('Zinchenko',['LB'],79),
    ('Andriy Pyatov',['GK'],79),('Yaroslav Rakitskiy',['CB'],82),
    ('Taras Stepanenko',['CDM'],76),('Viktor Tsygankov',['LW'],76),
    ('Andriy Lunin',['GK'],78),('Mykola Matviyenko',['CB'],77),
    ('Vitaliy Mykolenko',['LB'],76),('Oleksandr Zinchenko',['LB'],79),
 ],
 (2020,'Wales'): [
    ('Gareth Bale',['LW'],83),('Aaron Ramsey',['CM'],80),
    ('Ben Davies',['LB'],78),('Joe Allen',['CM'],77),
    ('Wayne Hennessey',['GK'],74),('Chris Gunter',['RB'],72),
    ('Daniel James',['LW'],76),('Kieffer Moore',['ST'],74),
    ('Harry Wilson',['CAM'],75),('Joe Rodon',['CB'],75),
    ('Connor Roberts',['RB'],73),('Tom Lawrence',['CAM'],74),
 ],
}

# ── Euro 2024 additions (FIFA 24/25 era ratings) ──────────────────────────────
EURO_2024 = {
 (2024,'Albania'): [
    ('Broja',['ST'],81),('Bajrami',['CAM'],77),
    ('Gashi',['RW'],74),('Hysaj',['RB'],77),
    ('Gjimshiti',['CB'],76),('Berisha E',['GK'],76),
    ('Laci',['CM'],73),('Ramadani',['CM'],77),
    ('Daku',['ST'],73),('Asllani',['CM'],74),
    ('Mitaj',['LB'],72),('Muci',['LW'],72),
 ],
 (2024,'Austria'): [
    ('David Alaba',['CB'],84),('Marcel Sabitzer',['CM'],82),
    ('Konrad Laimer',['CM'],82),('Marko Arnautović',['ST'],78),
    ('Michael Gregoritsch',['ST'],77),('Stefan Posch',['RB'],76),
    ('Maximilian Wöber',['CB'],77),('Christoph Baumgartner',['CAM'],78),
    ('Florian Wirtz',['CAM'],87),('Patrick Pentz',['GK'],77),
    ('Nicolas Seiwald',['CM'],77),('Philipp Lienhart',['CB'],76),
 ],
 (2024,'Croatia'): [
    ('Luka Modrić',['CM'],90),('Mateo Kovačić',['CM'],84),
    ('Joško Gvardiol',['CB'],86),('Ivan Perišić',['LW'],83),
    ('Marcelo Brozović',['CDM'],83),('Andrej Kramarić',['ST'],82),
    ('Bruno Petković',['ST'],78),('Dominik Livaković',['GK'],82),
    ('Lovro Majer',['CM'],80),('Josip Stanišić',['RB'],77),
    ('Borna Sosa',['LB'],78),('Luka Sučić',['CAM'],76),
 ],
 (2024,'Czech Republic'): [
    ('Tomáš Souček',['CM'],80),('Patrik Schick',['ST'],80),
    ('Alex Král',['CM'],78),('Ondřej Čelůstka',['CB'],76),
    ('Tomáš Čvančara',['ST'],74),('David Jurásek',['LB'],74),
    ('Antonín Barák',['CAM'],78),('Tomáš Vaclík',['GK'],79),
    ('Adam Hložek',['LW'],77),('Vladimír Darida',['CM'],76),
    ('Lukáš Provod',['CM'],74),('Jakub Jugas',['CB'],74),
 ],
 (2024,'Denmark'): [
    ('Christian Eriksen',['CAM'],85),('Pierre-Emile Højbjerg',['CDM'],83),
    ('Rasmus Højlund',['ST'],82),('Andreas Christensen',['CB'],83),
    ('Joachim Andersen',['CB'],80),('Joakim Mæhle',['RB'],79),
    ('Simon Kjær',['CB'],82),('Kasper Schmeichel',['GK'],82),
    ('Mikkel Damsgaard',['CAM'],79),('Yussuf Poulsen',['ST'],79),
    ('Victor Kristiansen',['LB'],77),('Morten Hjulmand',['CDM'],80),
 ],
 (2024,'Georgia'): [
    ('Khvicha Kvaratskhelia',['LW'],87),('Giorgi Mamardashvili',['GK'],82),
    ('Guram Kashia',['CB'],75),('Giorgi Chakvetadze',['CAM'],74),
    ('Zuriko Davitashvili',['CM'],75),('Giorgi Loria',['GK'],73),
    ('Luka Lochoshvili',['CB'],74),('Otar Kakabadze',['RB'],73),
    ('Giorgi Aburjania',['CM'],72),('Valeri Qazaishvili',['LW'],74),
    ('Budu Zivzivadze',['ST'],73),('Mikheil Kobakhidze',['RW'],71),
 ],
 (2024,'Hungary'): [
    ('Dominik Szoboszlai',['CAM'],84),('Péter Gulácsi',['GK'],80),
    ('Willi Orbán',['CB'],77),('Roland Sallai',['RW'],77),
    ('Ádám Szalai',['ST'],75),('Attila Fiola',['RB'],73),
    ('Callum Styles',['CM'],72),('Bendegúz Bolla',['RB'],72),
    ('Barnabás Varga',['ST'],75),('Ádám Lang',['CB'],74),
    ('Máté Pátkai',['CM'],72),('András Schäfer',['CM'],75),
 ],
 (2024,'Netherlands'): [
    ('Virgil van Dijk',['CB'],89),('Frenkie de Jong',['CM'],87),
    ('Cody Gakpo',['LW'],84),('Memphis Depay',['ST'],82),
    ('Wout Weghorst',['ST'],78),('Denzel Dumfries',['RB'],82),
    ('Stefan de Vrij',['CB'],83),('Nathan Aké',['CB'],83),
    ('Donyell Malen',['RW'],80),('Xavi Simons',['CAM'],82),
    ('Bart Verbruggen',['GK'],79),('Teun Koopmeiners',['CM'],82),
 ],
 (2024,'Poland'): [
    ('Robert Lewandowski',['ST'],90),('Wojciech Szczęsny',['GK'],84),
    ('Piotr Zieliński',['CM'],83),('Arkadiusz Milik',['ST'],80),
    ('Jan Bednarek',['CB'],79),('Matty Cash',['RB'],78),
    ('Sebastian Szymański',['CM'],78),('Jakub Kiwior',['CB'],77),
    ('Przemysław Frankowski',['RM'],77),('Nicola Zalewski',['LM'],75),
    ('Karol Świderski',['ST'],76),('Bartosz Bereszyński',['RB'],76),
 ],
 (2024,'Romania'): [
    ('Radu Drăgușin',['CB'],76),('Florin Niță',['GK'],77),
    ('Ianis Hagi',['CAM'],75),('Nicușor Bancu',['LB'],74),
    ('Denis Drăguș',['ST'],73),('Adrian Rațiu',['RB'],74),
    ('Vlad Chiricheș',['CB'],76),('Nicolae Stanciu',['CM'],76),
    ('Dănuț Lupu',['CM'],72),('George Pușcaș',['ST'],73),
    ('Andrei Rațiu',['RB'],73),('Marius Marin',['CDM'],73),
 ],
 (2024,'Scotland'): [
    ('Andrew Robertson',['LB'],85),('Scott McTominay',['CM'],81),
    ('John McGinn',['CM'],80),('Kieran Tierney',['LB'],83),
    ('Billy Gilmour',['CM'],78),('Lawrence Shankland',['ST'],76),
    ('Grant Hanley',['CB'],76),('Angus Gunn',['GK'],76),
    ('Che Adams',['ST'],75),('Ryan Jack',['CDM'],74),
    ('Stuart Armstrong',['CM'],74),('Callum McGregor',['CM'],79),
 ],
 (2024,'Serbia'): [
    ('Sergej Milinković-Savić',['CM'],87),('Dušan Vlahović',['ST'],86),
    ('Dušan Tadić',['CAM'],82),('Filip Kostić',['LW'],82),
    ('Aleksandar Mitrović',['ST'],83),('Predrag Rajković',['GK'],81),
    ('Nikola Milenković',['CB'],81),('Strahinja Pavlović',['CB'],79),
    ('Sasa Lukic',['CM'],78),('Andrija Živković',['RW'],77),
    ('Luka Jović',['ST'],78),('Nemanja Gudelj',['CDM'],78),
 ],
 (2024,'Slovakia'): [
    ('Milan Škriniar',['CB'],85),('Stanislav Lobotka',['CDM'],83),
    ('Ondrej Duda',['CM'],77),('Ivan Schranz',['LW'],74),
    ('Juraj Kucka',['CM'],78),('Martin Dúbravka',['GK'],80),
    ('Dávid Hancko',['CB'],77),('Peter Pekarík',['RB'],75),
    ('Tomáš Rigo',['CM'],73),('Adam Gnezda Čerin',['CM'],76),
    ('Lukas Pauschek',['RB'],73),('Lukas Haraslín',['LW'],73),
 ],
 (2024,'Slovenia'): [
    ('Benjamin Šeško',['ST'],80),('Jan Oblak',['GK'],90),
    ('Jaka Bijol',['CB'],77),('Adam Gnezda Čerin',['CM'],76),
    ('Petar Stojanović',['RB'],75),('Jon Gorenc Stanković',['CM'],75),
    ('Timi Max Elšnik',['CDM'],74),('Cene Pevnik',['GK'],73),
    ('Miha Blazic',['CB'],74),('Rok Kronaveter',['CAM'],73),
    ('Andraz Sporar',['ST'],75),('Erik Janža',['RB'],73),
 ],
 (2024,'Ukraine'): [
    ('Mudryk',['LW'],82),('Oleksandr Zinchenko',['LB'],82),
    ('Ruslan Malinovskyi',['CAM'],82),('Roman Yaremchuk',['ST'],79),
    ('Andriy Lunin',['GK'],81),('Mykola Matviyenko',['CB'],78),
    ('Vitaliy Mykolenko',['LB'],77),('Viktor Tsygankov',['LW'],77),
    ('Taras Stepanenko',['CDM'],77),('Georgiy Sudakov',['CM'],78),
    ('Oleksandr Pikhalyonok',['CM'],73),('Volodymyr Brazhko',['CM'],73),
 ],
}

PATH = 'src/data/players_euro_b.json'
add_nations(PATH, 'EURO', EURO_2012)
add_nations(PATH, 'EURO', EURO_2016)
add_nations(PATH, 'EURO', EURO_2020)
add_nations(PATH, 'EURO', EURO_2024)
print('Done euro_b')
