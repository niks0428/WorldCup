#!/usr/bin/env python3
"""Generate a PLAYABLE SEED Premier League dataset for Lift the Trophy.

This is a *seed* only — squads + approximate overalls of iconic PL teams across
the FIFA-edition range, so PL mode is playable immediately. The six attributes
are derived from the player's position archetype (gameplay/scoring only use
`overall` + position, so attributes are cosmetic). The sofifa importer will
later overwrite this with authentic FIFA 07+ ratings, standard cards only.

Schema mirrors the WC/Euro files so the draft code is unchanged:
  { name, nation(=club), year(=FIFA edition year), positions:[pos],
    overall, pac, sho, pas, dri, def, phy, tournament:"PL" }
"""
import json, hashlib, os

# club -> FIFA-edition-year -> [(name, position, overall), ...]
# Edition year: 2007 = FIFA 07 (2006-07 season), ... 2024 = FIFA 24.
SQUADS = {
    "Arsenal": {2007: [
        ("Jens Lehmann","GK",84),("Manuel Almunia","GK",78),
        ("Bacary Sagna","RB",80),("Kolo Touré","CB",84),("William Gallas","CB",84),("Gaël Clichy","LB",80),
        ("Cesc Fàbregas","CM",85),("Gilberto Silva","CDM",83),("Alexander Hleb","CAM",82),
        ("Tomáš Rosický","CM",82),("Robin van Persie","ST",82),("Theo Walcott","RW",78),
        ("Emmanuel Adebayor","ST",82),("Thierry Henry","ST",90),("Mathieu Flamini","CM",78),
        ("José Antonio Reyes","LW",80),
    ]},
    "Manchester United": {2009: [
        ("Edwin van der Sar","GK",86),("Ben Foster","GK",76),
        ("Gary Neville","RB",80),("Rio Ferdinand","CB",87),("Nemanja Vidić","CB",87),("Patrice Evra","LB",84),
        ("Michael Carrick","CM",83),("Paul Scholes","CM",85),("Ryan Giggs","LM",84),
        ("Cristiano Ronaldo","RW",91),("Wayne Rooney","ST",87),("Carlos Tévez","ST",85),
        ("Dimitar Berbatov","ST",84),("Anderson","CM",79),("Park Ji-sung","RM",80),("Owen Hargreaves","CDM",82),
    ]},
    "Chelsea": {2010: [
        ("Petr Čech","GK",87),("Hilário","GK",74),
        ("José Bosingwa","RB",81),("John Terry","CB",87),("Ricardo Carvalho","CB",85),("Ashley Cole","LB",87),
        ("Michael Essien","CDM",86),("Frank Lampard","CM",88),("Michael Ballack","CM",84),
        ("Florent Malouda","LW",83),("Didier Drogba","ST",88),("Nicolas Anelka","ST",85),
        ("Salomon Kalou","RW",80),("Deco","CAM",83),("John Obi Mikel","CDM",80),("Branislav Ivanović","CB",82),
    ]},
    "Manchester City": {2012: [
        ("Joe Hart","GK",85),("Costel Pantilimon","GK",76),
        ("Pablo Zabaleta","RB",82),("Vincent Kompany","CB",87),("Joleon Lescott","CB",81),("Gaël Clichy","LB",82),
        ("Yaya Touré","CM",87),("Gareth Barry","CM",80),("David Silva","CAM",87),
        ("Samir Nasri","CAM",84),("Sergio Agüero","ST",89),("Carlos Tévez","ST",85),
        ("Edin Džeko","ST",83),("Mario Balotelli","ST",82),("James Milner","RM",81),("Aleksandar Kolarov","LB",80),
        ("Adam Johnson","LW",78),
    ], 2018: [
        ("Ederson","GK",85),("Claudio Bravo","GK",80),
        ("Kyle Walker","RB",84),("John Stones","CB",82),("Nicolás Otamendi","CB",84),("Benjamin Mendy","LB",81),
        ("Fernandinho","CDM",85),("Kevin De Bruyne","CM",89),("David Silva","CAM",87),
        ("Leroy Sané","LW",84),("Sergio Agüero","ST",89),("Raheem Sterling","RW",84),
        ("Gabriel Jesus","ST",83),("İlkay Gündoğan","CM",84),("Bernardo Silva","RW",84),("Kompany","CB",84),
    ]},
    "Leicester City": {2016: [
        ("Kasper Schmeichel","GK",82),("Mark Schwarzer","GK",72),
        ("Danny Simpson","RB",75),("Wes Morgan","CB",78),("Robert Huth","CB",78),("Christian Fuchs","LB",77),
        ("N'Golo Kanté","CDM",82),("Danny Drinkwater","CM",78),("Marc Albrighton","LM",76),
        ("Riyad Mahrez","RW",83),("Jamie Vardy","ST",82),("Shinji Okazaki","ST",77),
        ("Demarai Gray","RW",74),("Andy King","CM",73),("Daniel Amartey","CDM",73),("Leonardo Ulloa","ST",75),
    ]},
    "Liverpool": {2014: [
        ("Simon Mignolet","GK",80),("Brad Jones","GK",71),
        ("Glen Johnson","RB",80),("Martin Škrtel","CB",82),("Mamadou Sakho","CB",80),("Jon Flanagan","LB",72),
        ("Steven Gerrard","CM",86),("Jordan Henderson","CM",80),("Philippe Coutinho","CAM",83),
        ("Raheem Sterling","RW",80),("Luis Suárez","ST",89),("Daniel Sturridge","ST",84),
        ("Lucas Leiva","CDM",78),("Joe Allen","CM",75),("Kolo Touré","CB",78),("Jordon Ibe","RW",70),
        ("Victor Moses","LW",75),
    ], 2020: [
        ("Alisson","GK",89),("Adrián","GK",76),
        ("Trent Alexander-Arnold","RB",85),("Virgil van Dijk","CB",90),("Joël Matip","CB",83),("Andrew Robertson","LB",85),
        ("Fabinho","CDM",85),("Jordan Henderson","CM",84),("Georginio Wijnaldum","CM",84),
        ("Mohamed Salah","RW",90),("Roberto Firmino","ST",85),("Sadio Mané","LW",88),
        ("Naby Keïta","CM",82),("Alex Oxlade-Chamberlain","CM",80),("Joe Gomez","CB",81),("Divock Origi","ST",78),
    ]},
    "Tottenham Hotspur": {2017: [
        ("Hugo Lloris","GK",85),("Michel Vorm","GK",76),
        ("Kyle Walker","RB",82),("Toby Alderweireld","CB",86),("Jan Vertonghen","CB",85),("Danny Rose","LB",81),
        ("Mousa Dembélé","CM",84),("Victor Wanyama","CDM",81),("Christian Eriksen","CAM",86),
        ("Dele Alli","CAM",84),("Harry Kane","ST",86),("Son Heung-min","LW",83),
        ("Érik Lamela","RW",80),("Eric Dier","CDM",80),("Kieran Trippier","RB",78),("Ben Davies","LB",78),
    ]},
    "Manchester City_24": {2024: [
        ("Ederson","GK",88),("Stefan Ortega","GK",80),
        ("Kyle Walker","RB",84),("Rúben Dias","CB",88),("John Stones","CB",85),("Joško Gvardiol","LB",84),
        ("Rodri","CDM",89),("Kevin De Bruyne","CM",91),("Bernardo Silva","CAM",87),
        ("Phil Foden","RW",85),("Erling Haaland","ST",91),("Jack Grealish","LW",85),
        ("Julián Álvarez","ST",83),("İlkay Gündoğan","CM",87),("Nathan Aké","CB",83),("Jérémy Doku","LW",81),
    ]},
}

# Position archetype attribute deltas relative to `overall`: (pac,sho,pas,dri,def,phy)
ARCH = {
    "GK":  (-28, -55, -35, -38, -55,  -6),
    "CB":  (-12, -38,  -8, -16,  +4,  +3),
    "RB":  ( +6, -22,  -2,  -2,  -1,  -4),
    "LB":  ( +6, -22,  -2,  -2,  -1,  -4),
    "RWB": ( +8, -18,  +0,  +2,  -4,  -5),
    "LWB": ( +8, -18,  +0,  +2,  -4,  -5),
    "CDM": ( -6, -16,  -2,  -6,  +6,  +4),
    "CM":  ( -2,  -8,  +4,  +2,  -4,  -2),
    "CAM": ( +0,  -2,  +6,  +6, -16,  -6),
    "RM":  ( +6,  -8,  +2,  +6,  -14, -6),
    "LM":  ( +6,  -8,  +2,  +6,  -14, -6),
    "RW":  ( +8,  -2,  +0,  +8,  -22, -8),
    "LW":  ( +8,  -2,  +0,  +8,  -22, -8),
    "ST":  ( +4,  +6,  -8,  +2,  -30, +0),
}
ATTRS = ["pac","sho","pas","dri","def","phy"]

def jitter(name, attr):
    h = int(hashlib.md5(f"{name}|{attr}".encode()).hexdigest(), 16)
    return (h % 7) - 3  # -3..+3, deterministic

def clamp(v): return max(28, min(96, int(round(v))))

def build():
    out = []
    for club_key, editions in SQUADS.items():
        club = club_key.split("_")[0]  # "Manchester City_24" -> "Manchester City"
        for year, players in editions.items():
            for name, pos, overall in players:
                deltas = ARCH[pos]
                rec = {
                    "name": name, "nation": club, "year": year,
                    "positions": [pos], "overall": overall,
                }
                for i, attr in enumerate(ATTRS):
                    rec[attr] = clamp(overall + deltas[i] + jitter(name, attr))
                rec["tournament"] = "PL"
                out.append(rec)
    return out

if __name__ == "__main__":
    data = build()
    dst = os.path.join(os.path.dirname(__file__), "src", "data", "players_pl.json")
    with open(dst, "w") as f:
        json.dump(data, f, ensure_ascii=False)
    clubs = sorted({p["nation"] for p in data})
    editions = sorted({(p["nation"], p["year"]) for p in data})
    print(f"Wrote {len(data)} players, {len(clubs)} clubs, {len(editions)} club-editions -> {dst}")
