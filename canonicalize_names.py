#!/usr/bin/env python3
"""Unify each real player to ONE canonical name across all tournaments.

The draft de-dupes by exact name (DraftScreen "no duplicate players across eras"),
but the same player was stored as a short name in the Euro/older files and a full
name in players_wc_new.json, so they slipped through as two strings. This renames
the variants to a single canonical spelling so de-dup works and display is
consistent. Only TRUE same-player variants are mapped; distinct players who merely
share a surname are deliberately left untouched.
"""
import json

# (nation, variant_name) -> canonical_name
ALIAS = {
 # Argentina
 ('Argentina','Aguero'):'Sergio Agüero', ('Argentina','Biglia'):'Lucas Biglia',
 ('Argentina','Higuain'):'Gonzalo Higuaín', ('Argentina','Mascherano'):'Javier Mascherano',
 ('Argentina','Messi'):'Lionel Messi', ('Argentina','Rojo'):'Marcos Rojo',
 # Belgium
 ('Belgium','Alderweireld'):'Toby Alderweireld', ('Belgium','Batshuayi'):'Michy Batshuayi',
 ('Belgium','Carrasco'):'Yannick Carrasco', ('Belgium','Castagne'):'Timothy Castagne',
 ('Belgium','Chadli'):'Nacer Chadli', ('Belgium','Courtois'):'Thibaut Courtois',
 ('Belgium','Dembele M'):'Mousa Dembélé', ('Belgium','Fellaini'):'Marouane Fellaini',
 ('Belgium','Hazard E'):'Eden Hazard', ('Belgium','Januzaj'):'Adnan Januzaj',
 ('Belgium','Kompany'):'Vincent Kompany', ('Belgium','Lukaku'):'Romelu Lukaku',
 ('Belgium','Mertens'):'Dries Mertens', ('Belgium','Meunier'):'Thomas Meunier',
 ('Belgium','Onana A'):'Amadou Onana', ('Belgium','Tielemans'):'Youri Tielemans',
 ('Belgium','Trossard'):'Leandro Trossard', ('Belgium','Vertonghen'):'Jan Vertonghen',
 ('Belgium','Witsel'):'Axel Witsel',
 # England
 ('England','Alli'):'Dele Alli', ('England','Bellingham'):'Jude Bellingham',
 ('England','Dier'):'Eric Dier', ('England','Foden'):'Phil Foden',
 ('England','Grealish'):'Jack Grealish', ('England','Henderson'):'Jordan Henderson',
 ('England','Henderson J'):'Jordan Henderson', ('England','Kane'):'Harry Kane',
 ('England','Maguire'):'Harry Maguire', ('England','Mount'):'Mason Mount',
 ('England','Pickford'):'Jordan Pickford', ('England','Rashford'):'Marcus Rashford',
 ('England','Rice'):'Declan Rice', ('England','Rose D'):'Danny Rose',
 ('England','Saka'):'Bukayo Saka', ('England','Sterling'):'Raheem Sterling',
 ('England','Stones'):'John Stones', ('England','Trippier'):'Kieran Trippier',
 ('England','Vardy'):'Jamie Vardy', ('England','Young A'):'Ashley Young',
 ('England','Walker K'):'Kyle Walker',
 # France
 ('France','Camavinga'):'Eduardo Camavinga', ('France','Coman'):'Kingsley Coman',
 ('France','Dembele O'):'Ousmane Dembélé', ('France','Giroud'):'Olivier Giroud',
 ('France','Griezmann'):'Antoine Griezmann', ('France','Hernandez L'):'Lucas Hernández',
 ('France','Theo Hernandez'):'Théo Hernández', ('France','Kante'):'N\'Golo Kanté',
 ('France','Kimpembe'):'Presnel Kimpembe', ('France','Kounde'):'Jules Koundé',
 ('France','Lloris'):'Hugo Lloris', ('France','Matuidi'):'Blaise Matuidi',
 ('France','Mbappe'):'Kylian Mbappé', ('France','Pavard'):'Benjamin Pavard',
 ('France','Pogba'):'Paul Pogba', ('France','Rabiot'):'Adrien Rabiot',
 ('France','Saliba'):'William Saliba',
 ('France','Tchouameni'):'Aurélien Tchouaméni', ('France','Thuram M'):'Marcus Thuram',
 ('France','Tolisso'):'Corentin Tolisso', ('France','Upamecano'):'Dayot Upamecano',
 ('France','Varane'):'Raphaël Varane',
 # Germany
 ('Germany','Boateng'):'Jérôme Boateng', ('Germany','Boateng J'):'Jérôme Boateng',
 ('Germany','Draxler'):'Julian Draxler', ('Germany','Fullkrug'):'Niclas Füllkrug',
 ('Germany','Gnabry'):'Serge Gnabry', ('Germany','Goretzka'):'Leon Goretzka',
 ('Germany','Gundogan'):'İlkay Gündoğan', ('Germany','Havertz'):'Kai Havertz',
 ('Germany','Hummels'):'Mats Hummels', ('Germany','Khedira'):'Sami Khedira',
 ('Germany','Kimmich'):'Joshua Kimmich', ('Germany','Kroos'):'Toni Kroos',
 ('Germany','Musiala'):'Jamal Musiala', ('Germany','Neuer'):'Manuel Neuer',
 ('Germany','Ozil'):'Mesut Özil', ('Germany','Raum'):'David Raum',
 ('Germany','Reus'):'Marco Reus', ('Germany','Rudiger'):'Antonio Rüdiger',
 ('Germany','Sane'):'Leroy Sané', ('Germany','Schlotterbeck'):'Nico Schlotterbeck',
 ('Germany','Sule'):'Niklas Süle', ('Germany','Werner'):'Timo Werner',
 # Portugal
 ('Portugal','Cancelo J'):'João Cancelo', ('Portugal','Joao Cancelo'):'João Cancelo',
 ('Portugal','Carvalho R'):'Ricardo Carvalho', ('Portugal','Costa D'):'Diogo Costa',
 ('Portugal','Dalot'):'Diogo Dalot', ('Portugal','Guerreiro R'):'Raphaël Guerreiro',
 ('Portugal','Moutinho'):'João Moutinho', ('Portugal','Palhinha'):'João Palhinha',
 ('Portugal','Quaresma'):'Ricardo Quaresma', ('Portugal','C Ronaldo'):'Cristiano Ronaldo',
 ('Portugal','Valente'):'Nuno Valente',
 # Spain
 ('Spain','Busquets'):'Sergio Busquets', ('Spain','Carvajal'):'Dani Carvajal',
 ('Spain','Iniesta'):'Andrés Iniesta', ('Spain','Laporte'):'Aymeric Laporte',
 ('Spain','Morata'):'Álvaro Morata', ('Spain','Pique'):'Gerard Piqué',
 ('Spain','Silva D'):'David Silva',
 # Sweden
 ('Sweden','Andersson P'):'Patrik Andersson',
}

# Year-specific: same name string refers to different players by era.
ALIAS_YEAR = {
 ('England','Walker',2016):'Kyle Walker',   # Des Walker (1990) and Ian Walker (1996) left alone
}

# DELIBERATELY NOT MERGED (distinct players sharing a surname):
#   Argentina Romero (Sergio GK) vs Cristian Romero; Fernandez F (Federico) vs Enzo Fernández
#   Brazil Junior vs Roque Junior; Denmark Larsen B vs Stryger Larsen
#   England Ashley Cole vs Cole J (Joe); Walker (Des/Ian) — see year rule
#   France Lucas vs Théo Hernández (split above); Lilian (Thuram) vs Marcus Thuram
#   Italy Baggio R (Roberto) vs Dino Baggio; Mexico Ochoa G (1986 mislabel) vs Guillermo Ochoa
#   Portugal Ricardo/William Carvalho; Jorge/Rui/Diogo Costa (split above)
#   Spain Fernando/Ferran/Pau Torres; Fernando vs Marcos Llorente
#   Sweden Kennet (Andersson K) vs Patrik Andersson; Uruguay Maxi Pereira vs Pereira A

def main():
    files = ['players_wc_old.json','players_euro_a.json','players_euro_b.json','players_wc_new.json']
    renamed = 0
    for f in files:
        data = json.load(open('src/data/'+f))
        for p in data:
            ky = (p['nation'], p['name'], p['year'])
            kn = (p['nation'], p['name'])
            new = ALIAS_YEAR.get(ky) or ALIAS.get(kn)
            if new and new != p['name']:
                p['name'] = new; renamed += 1
        json.dump(data, open('src/data/'+f, 'w'), ensure_ascii=False, separators=(',',':'))
    print(f'renamed {renamed} rows to canonical names')

if __name__ == '__main__':
    main()
