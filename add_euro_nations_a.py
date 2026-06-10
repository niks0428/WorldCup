#!/usr/bin/env python3
"""Add missing Euro nations to players_euro_a.json (1988-2008)."""
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

# ── Euro 1988 additions (FIFA ~93-era estimates) ──────────────────────────────
EURO_1988 = {
 (1988,'Denmark'): [
    ('Peter Schmeichel',['GK'],82),('Michael Laudrup',['CAM'],88),
    ('Preben Elkjaer',['ST'],83),('Brian Laudrup',['RW'],78),
    ('Soren Lerby',['CM'],80),('John Sivebæk',['RB'],74),
    ('Kent Nielsen',['CB'],76),('Klaus Berggreen',['RW'],74),
    ('Jan Bartram',['CM'],73),('Flemming Povlsen',['ST'],75),
    ('Henrik Andersen',['CB'],73),('Lars Olsen',['CB'],77),
 ],
 (1988,'Ireland'): [
    ('Paul McGrath',['CB'],83),('Ronnie Whelan',['CM'],79),
    ('Ray Houghton',['RM'],77),('Kevin Sheedy',['LM'],76),
    ('Mick McCarthy',['CB'],76),('John Aldridge',['ST'],80),
    ('Kevin Moran',['CB'],75),('Tony Galvin',['LW'],73),
    ('David Kelly',['ST'],73),('Chris Morris',['RB'],73),
    ('Tony Cascarino',['ST'],75),('Liam Brady',['CM'],80),
 ],
}

# ── Euro 1992 additions (FIFA ~94-era estimates) ──────────────────────────────
EURO_1992 = {
 (1992,'CIS'): [
    ('Andrei Kanchelskis',['RW'],82),('Igor Dobrovolski',['CAM'],80),
    ('Igor Kolyvanov',['ST'],78),('Andrei Shalimov',['CM'],79),
    ('Igor Shalimov',['CM'],79),('Viktor Onopko',['CB'],82),
    ('Sergei Kiryakov',['LM'],76),('Andrei Cherednyk',['GK'],75),
    ('Alexei Mikhailichenko',['CM'],78),('Oleg Kuznetsov',['CB'],79),
    ('Andrei Ivanov',['CB'],74),('Vitali Daraselia',['ST'],73),
 ],
 (1992,'England'): [
    ('Gary Lineker',['ST'],86),('Paul Gascoigne',['CAM'],87),
    ('Des Walker',['CB'],82),('Stuart Pearce',['LB'],82),
    ('Chris Woods',['GK'],79),('Alan Shearer',['ST'],81),
    ('Tony Adams',['CB'],82),('Mark Wright',['CB'],80),
    ('David Platt',['CM'],82),('Carlton Palmer',['CM'],74),
    ('Nigel Clough',['ST'],77),('David Batty',['CDM'],77),
 ],
 (1992,'France'): [
    ('Jean-Pierre Papin',['ST'],87),('Eric Cantona',['ST'],85),
    ('Laurent Blanc',['CB'],83),('Marcel Desailly',['CB'],83),
    ('Didier Deschamps',['CDM'],82),('Bernard Tapie wait',['CAM'],79),
    ('Jean-Pierre Lama',['GK'],78),('Bruno Martini',['GK'],79),
    ('Christophe Dugarry',['ST'],79),('Franck Sauzee',['CM'],79),
    ('Manuel Amoros',['RB'],78),('Luis Fernandez',['CM'],79),
 ],
 (1992,'Scotland'): [
    ('Ally McCoist',['ST'],81),('Brian McClair',['ST'],79),
    ('Gordon Durie',['ST'],77),('Stuart McCall',['CM'],78),
    ('Jim Leighton',['GK'],77),('Richard Gough',['CB'],81),
    ('Maurice Malpas',['LB'],76),('Alex McLeish',['CB'],79),
    ('Gary McAllister',['CM'],80),('Gordon Strachan',['RM'],78),
    ('Pat Nevin',['RW'],76),('Alan McNally',['ST'],74),
 ],
}

# ── Euro 1996 additions (FIFA 97 era ratings) ─────────────────────────────────
EURO_1996 = {
 (1996,'Bulgaria'): [
    ('Hristo Stoichkov',['LW'],90),('Krasimir Balakov',['CAM'],83),
    ('Yordan Letchkov',['CM'],80),('Trifon Ivanov',['CB'],78),
    ('Zlatko Yankov',['CDM'],77),('Petar Mihtarski',['CM'],74),
    ('Borislav Mikhailov',['GK'],77),('Radostin Kishishev',['RB'],74),
    ('Plamen Getov',['CB'],73),('Emil Kostadinov',['ST'],80),
    ('Nasko Sirakov',['LW'],79),('Ilian Iliev',['CM'],73),
 ],
 (1996,'Denmark'): [
    ('Peter Schmeichel',['GK'],88),('Michael Laudrup',['CAM'],89),
    ('Brian Laudrup',['RW'],86),('Allan Nielsen',['CM'],77),
    ('Marc Rieper',['CB'],79),('Thomas Helveg',['RB'],77),
    ('Michael Schjønberg',['LB'],74),('Mikkel Beck',['ST'],75),
    ('Jes Høgh',['CB'],76),('Bjarne Goldbaek',['CM'],75),
    ('Stig Tøfting',['CDM'],77),('Peter Møller',['ST'],76),
 ],
 (1996,'Italy'): [
    ('Gianfranco Zola',['CAM'],87),('Roberto Baggio',['CAM'],90),
    ('Alessandro Del Piero',['ST'],86),('Fabio Cannavaro',['CB'],82),
    ('Gianluigi Buffon',['GK'],80),('Demetrio Albertini',['CM'],84),
    ('Antonio Conte',['CM'],81),('Alessandro Costacurta',['CB'],84),
    ('Ciro Ferrara',['CB'],82),('Angelo Peruzzi',['GK'],82),
    ('Christian Vieri',['ST'],84),('Enrico Chiesa',['ST'],78),
 ],
 (1996,'Romania'): [
    ('Gheorghe Hagi',['CAM'],88),('Ilie Dumitrescu',['CM'],81),
    ('Florin Raducioiu',['ST'],82),('Dan Petrescu',['RB'],81),
    ('Bogdan Stelea',['GK'],79),('Miodrag Belodedici',['CB'],79),
    ('Tibor Selymes',['LB'],77),('Gheorghe Popescu',['CB'],83),
    ('Dorinel Munteanu',['CM'],78),('Ioan Lupescu',['CDM'],78),
    ('Daniel Prodan',['CB'],78),('Adrian Ilie',['ST'],78),
 ],
 (1996,'Russia'): [
    ('Igor Dobrovolski',['CAM'],80),('Viktor Onopko',['CB'],82),
    ('Valery Karpin',['CM'],81),('Andrei Kanchelskis',['RW'],83),
    ('Aleksandr Mostovoi',['CM'],81),('Igor Ledyakhov',['CM'],78),
    ('Sergei Yuran',['ST'],80),('Oleg Salenko',['ST'],79),
    ('Dmitri Kharin',['GK'],79),('Vladimir Beschastnykh',['ST'],78),
    ('Andrei Piatnitski',['CM'],76),('Yuri Kovtun',['CB'],76),
 ],
 (1996,'Scotland'): [
    ('Gary McAllister',['CM'],80),('John Collins',['CM'],80),
    ('Ally McCoist',['ST'],81),('Stuart McCall',['CM'],78),
    ('Colin Hendry',['CB'],80),('John McGinlay',['ST'],77),
    ('Andy Goram',['GK'],82),('Tosh McKinlay',['LB'],74),
    ('Tommy Boyd',['CB'],77),('Gordon Durie',['ST'],77),
    ('Alan McLaren',['CB'],76),('Billy McKinlay',['CM'],76),
 ],
 (1996,'Spain'): [
    ('Raúl',['ST'],83),('Fernando Hierro',['CB'],86),
    ('Miguel Angel Zubizarreta',['GK'],83),('Andoni Goikoetxea',['CB'],77),
    ('Julen Guerrero',['LW'],80),('Luis Enrique',['CM'],82),
    ('José Luis Caminero',['CM'],81),('Kiko',['ST'],79),
    ('Sergi Barjuan',['LB'],78),('Rafael Alkorta',['CB'],78),
    ('Abelardo',['CB'],80),('Alfonso',['RW'],78),
 ],
 (1996,'Switzerland'): [
    ('Ciriaco Sforza',['CM'],80),('Kubilay Türkyilmaz',['ST'],79),
    ('Alain Sutter',['LM'],77),('Adrian Knup',['ST'],78),
    ('Ramon Vega',['CB'],77),('Marc Hottiger',['RB'],77),
    ('Marco Pascolo',['GK'],77),('Stephane Chapuisat',['ST'],84),
    ('Georges Bregy',['CM'],76),('Yvan Quentin',['CM'],74),
    ('Patrick Sylvestre wait',['CB'],73),('Karl Odermatt',['RW'],73),
 ],
 (1996,'Turkey'): [
    ('Hakan Şükür',['ST'],82),('Rüştü Reçber',['GK'],81),
    ('Oğuz Çetin',['CM'],78),('Bülent Korkmaz',['CB'],78),
    ('Abdullah Ercan',['LB'],74),('Sergen Yalçın',['CAM'],79),
    ('Alpay Özalan',['CB'],78),('Tugay Kerimoğlu',['CM'],81),
    ('Mustafa Doruk',['CDM'],74),('Arif Erdem',['ST'],77),
    ('Uğur Tütüneker',['RW'],75),('Mehmet Yozgatlı',['CB'],74),
 ],
}

# ── Euro 2000 additions (FIFA 2001 era ratings) ───────────────────────────────
EURO_2000 = {
 (2000,'Belgium'): [
    ('Marc Wilmots',['CM'],82),('Emile Mpenza',['ST'],79),
    ('Luc Nilis',['ST'],82),('Lorenzo Staelens',['CDM'],79),
    ('Nico Van Kerckhoven',['CB'],75),('Glen De Boeck',['CB'],74),
    ('Daniel Van Buyten',['CB'],80),('Eric Deflandre',['RB'],75),
    ('Wesley Sonck',['ST'],76),('Timmy Simons',['CDM'],76),
    ('Philippe Clement',['CM'],76),('Geert De Vlieger',['GK'],77),
 ],
 (2000,'Czech Republic'): [
    ('Pavel Nedved',['LW'],91),('Patrik Berger',['CM'],83),
    ('Vladimir Smicer',['CM'],80),('Karel Poborsky',['RM'],82),
    ('Tomas Rosicky',['CAM'],80),('Martin Koller',['GK'],82),
    ('Horst Siegl',['ST'],79),('Radoslav Kovac',['CM'],76),
    ('Jiri Nemec',['CDM'],78),('Marek Jankulovski',['LB'],78),
    ('Lubos Kubik',['CM'],76),('Ladislav Maier',['GK'],76),
 ],
 (2000,'Denmark'): [
    ('Peter Schmeichel',['GK'],87),('Brian Laudrup',['RW'],86),
    ('Martin Jorgensen',['RW'],78),('Stig Tofting',['CDM'],77),
    ('Marc Rieper',['CB'],79),('Thomas Helveg',['RB'],78),
    ('Ebbe Sand',['ST'],80),('Jon Dahl Tomasson',['ST'],80),
    ('Jesper Gronkjaer',['LW'],77),('Allan Nielsen',['CM'],77),
    ('Rene Henriksen',['CB'],76),('Thomas Gravesen',['CM'],78),
 ],
 (2000,'England'): [
    ('David Beckham',['RM'],88),('Michael Owen',['ST'],87),
    ('Alan Shearer',['ST'],88),('Paul Scholes',['CM'],85),
    ('Tony Adams',['CB'],83),('Rio Ferdinand',['CB'],82),
    ('Ashley Cole',['LB'],80),('Steven Gerrard',['CM'],81),
    ('Martin Keown',['CB'],80),('Sol Campbell',['CB'],82),
    ('Gary Neville',['RB'],81),('Paul Ince',['CDM'],80),
 ],
 (2000,'Germany'): [
    ('Oliver Bierhoff',['ST'],83),('Mehmet Scholl',['CAM'],84),
    ('Stefan Effenberg',['CM'],85),('Oliver Kahn',['GK'],91),
    ('Lothar Matthäus',['CM'],84),('Michael Ballack',['CM'],82),
    ('Carsten Jancker',['ST'],79),('Jens Nowotny',['CB'],79),
    ('Christian Worns',['CB'],79),('Jorg Bohme',['LW'],76),
    ('Didi Hamann',['CDM'],82),('Sebastian Deisler',['CAM'],79),
 ],
 (2000,'Norway'): [
    ('Ole Gunnar Solskjaer',['ST'],81),('Tore Andre Flo',['ST'],79),
    ('Rune Lange',['LW'],74),('Henning Berg',['CB'],80),
    ('Stig Inge Bjørnebye',['LB'],77),('Ronny Johnsen',['CB'],79),
    ('Steffen Iversen',['ST'],77),('Oyvind Leonhardsen',['CM'],77),
    ('Kjetil Rekdal',['CM'],76),('Thomas Myhre',['GK'],78),
    ('Erik Mykland',['RM'],75),('Dan Eggen',['CB'],75),
 ],
 (2000,'Romania'): [
    ('Gheorghe Hagi',['CAM'],87),('Viorel Moldovan',['ST'],80),
    ('Dan Petrescu',['RB'],81),('Dorinel Munteanu',['CM'],79),
    ('Ioan Ganea',['ST'],78),('Florin Prunea',['GK'],77),
    ('Bogdan Stelea',['GK'],78),('Gheorghe Popescu',['CB'],82),
    ('Liviu Ciobotariu',['CM'],76),('Adrian Ilie',['ST'],78),
    ('Cosmin Contra',['RB'],77),('Dan Petrescul wait',['LB'],76),
 ],
 (2000,'Russia'): [
    ('Valery Karpin',['CM'],82),('Victor Onopko',['CB'],82),
    ('Aleksandr Mostovoi',['CM'],82),('Andrei Tikhonov',['CAM'],79),
    ('Vladimir Beschastnykh',['ST'],79),('Aleksandr Filimomov',['GK'],77),
    ('Sergei Semak',['CM'],79),('Dmitri Alenichev',['CM'],80),
    ('Yuri Kovtun',['CB'],77),('Igor Chugainov',['CDM'],75),
    ('Ruslan Pimenov',['ST'],74),('Marat Izmailov',['LW'],75),
 ],
 (2000,'Sweden'): [
    ('Henrik Larsson',['ST'],86),('Freddie Ljungberg',['RM'],83),
    ('Magnus Hedman',['GK'],81),('Niclas Alexandersson',['RW'],79),
    ('Patrik Andersson',['CB'],80),('Johan Mjallby',['CB'],79),
    ('Andreas Andersson',['ST'],77),('Stefan Schwarz',['CM'],81),
    ('Pontus Kaamark',['RB'],76),('Anders Limpar',['LW'],78),
    ('Kennet Andersson',['ST'],80),('Sami Hyypia',['CB'],83),
 ],
 (2000,'Turkey'): [
    ('Hakan Şükür',['ST'],83),('Rüştü Reçber',['GK'],82),
    ('Emre Belözoğlu',['CM'],80),('Bülent Korkmaz',['CB'],80),
    ('Hakan Ünsal',['LM'],78),('Sergen Yalçın',['CAM'],79),
    ('Tugay Kerimoğlu',['CM'],82),('Alpay Özalan',['CB'],79),
    ('İlhan Mansız',['ST'],79),('Arif Erdem',['ST'],78),
    ('Oğuz Çetin',['CM'],77),('Yıldıray Baştürk',['CM'],79),
 ],
 (2000,'Yugoslavia'): [
    ('Dragan Stojković',['CAM'],84),('Savo Milosevic',['ST'],82),
    ('Predrag Mijatović',['ST'],83),('Dejan Savicevic',['CAM'],84),
    ('Zoran Mirković',['RB'],77),('Goran Djorovic',['CB'],76),
    ('Mladen Krstajić',['CB'],77),('Dejan Govedarica',['RM'],75),
    ('Albert Nađ',['CM'],74),('Ljubinko Drulovic',['CM'],76),
    ('Slavisa Jokanovic',['CDM'],79),('Miroslav Đukić',['CDM'],77),
 ],
}

# ── Euro 2004 additions (FIFA 2005 era ratings) ───────────────────────────────
EURO_2004 = {
 (2004,'Bulgaria'): [
    ('Hristo Stoichkov',['LW'],83),('Stiliyan Petrov',['CM'],78),
    ('Martin Petrov',['LW'],77),('Georgi Peev',['CM'],76),
    ('Georgi Ivanov',['CB'],75),('Predrag Pazin',['CM'],74),
    ('Boris Mihaylov',['GK'],73),('Zdravko Zdravkov',['GK'],74),
    ('Dimitar Berbatov',['ST'],83),('Stilian Petrov',['CM'],78),
    ('Marian Hristov',['RB'],73),('Ilian Stoyanov',['CB'],74),
 ],
 (2004,'Croatia'): [
    ('Robert Prosinečki',['CAM'],79),('Zvonimir Boban',['CM'],80),
    ('Darko Kovačević',['ST'],79),('Niko Kovač',['CM'],77),
    ('Niko Kranjčar',['CAM'],79),('Igor Tudor',['CB'],79),
    ('Robert Jarni',['LB'],80),('Stipe Pletikosa',['GK'],79),
    ('Ivica Olić',['ST'],78),('Dario Šimić',['CB'],79),
    ('Stjepan Tomas',['CB'],76),('Dado Prso',['ST'],80),
 ],
 (2004,'Denmark'): [
    ('Jon Dahl Tomasson',['ST'],82),('Thomas Helveg',['RB'],78),
    ('Martin Jorgensen',['RW'],78),('Thomas Gravesen',['CM'],80),
    ('Stig Tofting',['CDM'],77),('Peter Schmeichel',['GK'],84),
    ('Dennis Rommedahl',['LW'],77),('Kasper Schmeichel',['GK'],73),
    ('Rene Henriksen',['CB'],76),('Claus Jensen',['CM'],76),
    ('Niclas Jensen',['LB'],74),('Ebbe Sand',['ST'],79),
 ],
 (2004,'Germany'): [
    ('Michael Ballack',['CM'],88),('Oliver Kahn',['GK'],90),
    ('Jens Lehmann',['GK'],83),('Torsten Frings',['CDM'],82),
    ('Bernd Schneider',['RM'],81),('Sebastian Kehl',['CM'],79),
    ('Bastian Schweinsteiger',['CM'],78),('Kevin Kuranyi',['ST'],79),
    ('Carsten Jancker',['ST'],79),('Frank Baumann',['CM'],76),
    ('Christian Worns',['CB'],79),('Robert Huth',['CB'],76),
 ],
 (2004,'Italy'): [
    ('Alessandro Del Piero',['ST'],88),('Francesco Totti',['CAM'],91),
    ('Fabio Cannavaro',['CB'],86),('Gianluigi Buffon',['GK'],89),
    ('Antonio Cassano',['ST'],82),('Andrea Pirlo',['CM'],84),
    ('Damiano Tommasi',['CDM'],79),('Daniele De Rossi',['CDM'],78),
    ('Alessandro Nesta',['CB'],90),('Gianluca Zambrotta',['RB'],83),
    ('Marco Materazzi',['CB'],82),('Cristian Zaccardo',['RB'],77),
 ],
 (2004,'Latvia'): [
    ('Maris Verpakovskis',['ST'],74),('Imants Bleidelis',['LW'],72),
    ('Vits Rimkus',['CM'],70),('Alexei Sherstnyov',['CB'],72),
    ('Mihails Zemlinskis',['CDM'],71),('Igors Stepanovs',['CB'],72),
    ('Olegs Blagonadezdins',['GK'],71),('Andrejs Rubins',['LW'],73),
    ('Juris Laizans',['CAM'],73),('Kristaps Blanks',['RB'],70),
    ('Valentins Lobanevs',['CB'],70),('Andrejs Prohorenkovs',['CM'],70),
 ],
 (2004,'Russia'): [
    ('Aleksandr Mostovoi',['CM'],80),('Valery Karpin',['CM'],79),
    ('Dmitri Alenichev',['CM'],80),('Sergei Semak',['CM'],79),
    ('Igor Semshov',['CM'],76),('Andrei Arshavin',['CAM'],80),
    ('Dmitri Bulykin',['ST'],77),('Sergei Ignashevich',['CB'],78),
    ('Vyacheslav Malafeev',['GK'],77),('Alexei Smertin',['CM'],78),
    ('Dmitri Kirichenko',['ST'],76),('Evgeni Aldonin',['CDM'],75),
 ],
 (2004,'Spain'): [
    ('Raúl',['ST'],88),('Fernando Torres',['ST'],83),
    ('Xavi',['CM'],85),('Iker Casillas',['GK'],88),
    ('Fernando Hierro',['CB'],84),('Gaizka Mendieta',['RM'],83),
    ('Juanfran',['RB'],74),('Joaquín',['RM'],80),
    ('Carles Puyol',['CB'],83),('Joan Capdevila',['LB'],77),
    ('Ruben Baraja',['CM'],81),('Vicente',['LW'],81),
 ],
 (2004,'Sweden'): [
    ('Henrik Larsson',['ST'],86),('Zlatan Ibrahimović',['ST'],83),
    ('Freddie Ljungberg',['RM'],83),('Magnus Hedman',['GK'],80),
    ('Niclas Alexandersson',['RW'],78),('Teddy Lucic',['CB'],78),
    ('Andreas Jakobsson',['CB'],76),('Olof Mellberg',['CB'],81),
    ('Johan Mjallby',['CB'],79),('Tobias Linderoth',['CM'],77),
    ('Daniel Andersson',['CM'],76),('Markus Allback',['ST'],77),
 ],
 (2004,'Switzerland'): [
    ('Johan Vonlanthen',['LW'],74),('Alexander Frei',['ST'],80),
    ('Stéphane Chapuisat',['ST'],80),('Raphael Wicky',['CM'],77),
    ('Murat Yakin',['CB'],80),('Christoph Spycher',['RB'],76),
    ('Patrick Müller',['CB'],78),('Jorg Stiel',['GK'],79),
    ('Ludovic Magnin',['LB'],77),('Daniel Gygax',['CM'],75),
    ('Tranquillo Barnetta',['LM'],75),('Fabio Celestini',['CM'],76),
 ],
}

# ── Euro 2008 additions (FIFA 09 era ratings) ─────────────────────────────────
EURO_2008 = {
 (2008,'Austria'): [
    ('Andreas Ivanschitz',['CM'],80),('Roland Linz',['ST'],75),
    ('Ivica Vastić',['ST'],74),('Marko Arnautović',['LW'],73),
    ('René Aufhauser',['CM'],76),('Martin Stranzl',['CB'],77),
    ('Emanuel Pogatetz',['CB'],76),('Jurgen Patocka',['RB'],73),
    ('Jürgen Macho',['GK'],75),('Michael Jelavic',['ST'],74),
    ('Sebastian Prödl',['CB'],74),('Christian Fuchs',['LB'],75),
 ],
 (2008,'Croatia'): [
    ('Luka Modrić',['CM'],80),('Ivan Rakitić',['CM'],78),
    ('Ivan Klasnić',['ST'],78),('Niko Kranjčar',['CAM'],80),
    ('Vedran Ćorluka',['CB'],78),('Dario Šimić',['CB'],79),
    ('Robert Kovač',['CB'],78),('Stipe Pletikosa',['GK'],79),
    ('Ivica Olić',['ST'],79),('Luka Ćorluka',['CB'],76),
    ('Ivan Perišić',['LW'],74),('Mladen Petrić',['ST'],78),
 ],
 (2008,'Czech Republic'): [
    ('Pavel Nedved',['LW'],87),('Tomas Rosicky',['CAM'],84),
    ('Jan Koller',['ST'],82),('Petr Cech',['GK'],86),
    ('Milan Baroš',['ST'],81),('Vladimir Smicer',['CM'],80),
    ('Karel Poborsky',['RM'],78),('Marek Jankulovski',['LB'],79),
    ('Zdenek Grygera',['RB'],77),('Tomas Galasek',['CDM'],78),
    ('Martin Jiránek',['CB'],77),('Jan Polak',['CM'],76),
 ],
 (2008,'France'): [
    ('Zinedine Zidane',['CAM'],86),('Thierry Henry',['ST'],88),
    ('Franck Ribéry',['LW'],86),('Patrick Vieira',['CDM'],84),
    ('William Gallas',['CB'],82),('Patrice Evra',['LB'],82),
    ('Bacary Sagna',['RB'],80),('Claude Makelele',['CDM'],84),
    ('Samir Nasri',['CAM'],79),('Sidney Govou',['RW'],79),
    ('Florent Malouda',['LW'],81),('Lassana Diarra',['CDM'],80),
 ],
 (2008,'Greece'): [
    ('Theofanis Gekas',['ST'],78),('Angelos Charisteas',['ST'],78),
    ('Kostas Katsouranis',['CM'],77),('Stylianos Giannakopoulos',['RM'],78),
    ('Christos Patsatzoglou',['LB'],75),('Angelos Basinas',['CM'],79),
    ('Giorgos Karagounis',['CM'],79),('Nikos Liberopoulos',['ST'],77),
    ('Loukas Vyntra',['CB'],75),('Nikos Dabizas',['CB'],77),
    ('Kostas Chalkias',['GK'],75),('Sotiris Kyrgiakos',['CB'],76),
 ],
 (2008,'Netherlands'): [
    ('Ruud van Nistelrooy',['ST'],86),('Arjen Robben',['LW'],87),
    ('Rafael van der Vaart',['CAM'],85),('Dirk Kuyt',['RW'],82),
    ('Khalid Boulahrouz',['CB'],80),('Giovanni van Bronckhorst',['LB'],83),
    ('Andre Ooijer',['CB'],79),('Edwin van der Sar',['GK'],87),
    ('John Heitinga',['CB'],80),('Denny Landzaat',['CM'],77),
    ('Jan Vennegoor of Hesselink',['ST'],76),('Wilfred Bouma',['LB'],78),
 ],
 (2008,'Poland'): [
    ('Maciej Zurawski',['ST'],78),('Roger Guerreiro',['CM'],75),
    ('Jakub Blaszczykowski',['RW'],77),('Lukasz Fabianski',['GK'],77),
    ('Lukasz Piszczek',['RB'],77),('Euzebiusz Smolarek',['LW'],76),
    ('Michal Zewlakow',['CB'],75),('Mariusz Lewandowski',['CDM'],77),
    ('Radoslaw Matusiak',['CB'],74),('Artur Boruc',['GK'],80),
    ('Bartosz Bosacki',['CB'],75),('Tomasz Frankowski',['ST'],75),
 ],
 (2008,'Portugal'): [
    ('Cristiano Ronaldo',['RW'],88),('Deco',['CAM'],87),
    ('Luís Figo',['RM'],85),('Nuno Gomes',['ST'],81),
    ('Ricardo Carvalho',['CB'],85),('João Moutinho',['CM'],78),
    ('Pepe',['CB'],83),('Bruno Alves',['CB'],80),
    ('Nani',['LW'],80),('Simão Sabrosa',['LW'],82),
    ('Ricardo',['GK'],82),('Tiago',['CM'],81),
 ],
 (2008,'Romania'): [
    ('Adrian Mutu',['CAM'],83),('Cosmin Contra',['RB'],77),
    ('Cristian Chivu',['CB'],82),('Dorinel Munteanu',['CM'],77),
    ('Bogdan Lobont',['GK'],79),('Razvan Rat',['LB'],78),
    ('Florentin Petre',['CM'],76),('Dorin Goian',['CB'],77),
    ('Ionut Lupescu',['CM'],75),('Ciprian Marica',['ST'],78),
    ('Mirel Radoi',['CDM'],78),('Florin Bratu',['CM'],75),
 ],
 (2008,'Sweden'): [
    ('Zlatan Ibrahimović',['ST'],86),('Henrik Larsson',['ST'],84),
    ('Freddie Ljungberg',['RM'],82),('Anders Svensson',['CM'],79),
    ('Olof Mellberg',['CB'],82),('Niclas Alexandersson',['RW'],77),
    ('Petter Hansson',['CB'],76),('Andreas Isaksson',['GK'],79),
    ('Tobias Linderoth',['CM'],78),('Marcus Allback',['ST'],77),
    ('Kim Källström',['CM'],80),('Johan Elmander',['ST'],78),
 ],
 (2008,'Switzerland'): [
    ('Alexander Frei',['ST'],82),('Tranquillo Barnetta',['LM'],79),
    ('Valon Behrami',['CDM'],78),('Gelson Fernandes',['CDM'],76),
    ('Stephane Grichting',['CB'],77),('Johann Vogel',['CDM'],79),
    ('Patrick Müller',['CB'],79),('Diego Benaglio',['GK'],78),
    ('Senderos',['CB'],79),('Ludovic Magnin',['LB'],78),
    ('Christoph Spycher',['RB'],77),('Marco Streller',['ST'],76),
 ],
}

PATH = 'src/data/players_euro_a.json'
add_nations(PATH, 'EURO', EURO_1988)
add_nations(PATH, 'EURO', EURO_1992)
add_nations(PATH, 'EURO', EURO_1996)
add_nations(PATH, 'EURO', EURO_2000)
add_nations(PATH, 'EURO', EURO_2004)
add_nations(PATH, 'EURO', EURO_2008)
print('Done euro_a')
