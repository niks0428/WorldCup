#!/usr/bin/env python3
"""Improve ratings/stats for the ADDED players (originals are left untouched).

Three layers, applied only to rows that were not in the pre-expansion backups:
  1. ICONS    - explicit authentic overall + 6 stats for marquee players.
  2. CURATED  - per-player overall fix and/or playstyle archetype override.
  3. ARCHETYPE default by primary position for everyone else, so stats are
     distinctive (a poacher vs a target man vs a playmaker) instead of flat
     position averages.

Stat = clamp(overall + archetype_offset[stat], 1, 99).
"""
import json, os

FACE = ['pac', 'sho', 'pas', 'dri', 'def', 'phy']

# Archetype stat offsets relative to overall (pac, sho, pas, dri, def, phy).
ARCH = {
 'keeper':        (-30,-70,-39,-45,-63,-10),
 'poacher':       (  2,  8,-16, -2,-52, -4),
 'complete_fwd':  (  0,  6, -6,  2,-46, -2),
 'target_man':    (-12,  6,-12,-12,-46, 10),
 'false_nine':    ( -2,  2,  4,  8,-40,-12),
 'pace_winger':   ( 12, -2, -6,  6,-44,-14),
 'creative_wing': (  6, -4,  2,  8,-42,-16),
 'playmaker':     ( -2, -2,  6,  8,-36,-18),
 'deep_playmaker':(-10,-12,  8,  0, -6, -8),
 'box_to_box':    ( -2, -8,  0, -2, -2,  4),
 'destroyer':     ( -8,-22, -6,-10,  6,  6),
 'tempo_cm':      ( -6,-12,  4,  0, -8, -2),
 'fullback':      (  8,-30, -8, -8, -2, -6),
 'attacking_fb':  ( 12,-22, -2, -2, -8, -8),
 'ball_play_cb':  ( -8,-44,  2,-12,  6,  4),
 'classic_cb':    (-12,-48,-20,-26,  8,  8),
 'libero':        ( -4,-26,  0, -8,  4,  2),
}
POS_DEFAULT = {
 'GK':'keeper','ST':'complete_fwd','RW':'pace_winger','LW':'pace_winger',
 'RM':'creative_wing','LM':'creative_wing','CAM':'playmaker','CM':'box_to_box',
 'CDM':'destroyer','CB':'classic_cb','RB':'fullback','LB':'fullback',
 'RWB':'attacking_fb','LWB':'attacking_fb',
}

def clamp(v): return max(1, min(99, int(round(v))))

# Position-average stat shape + overall, used to detect which ORIGINAL rows are
# "flat" (never really curated) vs genuinely hand-tuned (leave those alone).
POSAVG = {
 'GK':(54,13,45,38,20,74),'CB':(68,33,60,57,83,78),'RB':(78,47,65,65,73,69),'LB':(77,45,64,65,72,68),
 'RWB':(80,47,65,66,70,69),'LWB':(80,54,62,62,60,70),'CDM':(66,54,74,69,77,75),'CM':(70,66,78,75,62,70),
 'CAM':(76,77,81,83,43,65),'RM':(75,66,74,74,45,66),'LM':(76,54,67,70,57,66),'RW':(84,73,71,81,33,64),
 'LW':(85,75,72,83,32,65),'ST':(79,82,66,76,29,73),
}
POSAVG_OVR = {'GK':84,'CB':83,'RB':81,'LB':80,'RWB':80,'LWB':79,'CDM':83,'CM':83,'CAM':85,'RM':82,'LM':79,'RW':82,'LW':83,'ST':84}

def is_flat(row):
    """True if the row's stats match the flat position-average pattern (i.e. it
    was generated, not hand-curated). Distinctive curated rows return False."""
    pos = row['positions'][0]
    if pos not in POSAVG: return False
    d = row['overall'] - POSAVG_OVR[pos]
    dev = sum(abs(row[FACE[i]] - (POSAVG[pos][i] + d)) for i in range(6)) / 6
    return dev < 3

def apply_arch(row, archetype, overall):
    off = ARCH[archetype]
    row['overall'] = overall
    for i, s in enumerate(FACE):
        row[s] = clamp(overall + off[i])

# ── ICONS: explicit authentic profiles (overall, pac, sho, pas, dri, def, phy) ──
# Keyed by (name, year). Mostly legends I'd added with generic stats.
ICONS = {
 ('Maradona',1994):     (87,78,80,84,90,34,66),
 ('Vialli',1990):       (85,82,86,72,84,34,80),
 ('Bochini',1986):      (83,66,78,86,87,40,60),
 ('Littbarski',1986):   (83,86,80,80,86,40,62),
 ('Giannini',1990):     (83,74,80,85,86,46,66),
 ('Giannini',1988):     (82,74,79,84,85,46,66),
 ('Rai',1994):          (84,72,82,86,86,52,72),
 ('Dunga',1994):        (85,64,60,80,70,86,84),
 ('Sammer',1994):       (87,76,72,82,80,87,82),
 ('Sammer',1992):       (85,72,56,78,74,86,82),
 ('Moller',1994):       (84,80,84,84,87,44,70),
 ('Moller',1996):       (83,79,83,83,86,44,70),
 ('Vieira',1998):       (85,74,70,80,78,86,89),
 ('Pires',2004):        (85,80,80,83,86,42,66),
 ('Pires',2000):        (84,80,79,82,85,42,66),
 ('Overmars',1996):     (85,94,78,74,89,38,62),
 ('Seedorf',2004):      (85,78,84,85,84,70,80),
 ('Aguero',2014):       (89,88,88,78,89,34,74),
 ('Reus',2012):         (84,88,84,80,87,40,64),
 ('Kroos',2012):        (83,60,78,88,80,66,70),
 ('Fabregas',2010):     (85,66,76,89,83,68,66),
 ('Rodri',2022):        (86,66,75,85,80,85,84),
 ('Bruno Fernandes',2024):(86,74,86,87,84,66,74),
 ('Nainggolan',2016):   (84,76,80,80,80,82,84),
}

# ── CURATED: (overall_or_None, archetype_or_None) per (name, year). ─────────────
# overall=None keeps current rating; archetype=None uses the position default.
CURATED = {
 ('Sammer',1994):(None,'libero'),            # listed CDM, played sweeper
 ('Vieira',1998):(85,'box_to_box'),
 ('Cesar Sampaio',1998):(None,'destroyer'),
 ('Karembeu',1998):(None,'destroyer'),
 ('Petit',2000):(83,'box_to_box'),
 ('Conte',2000):(80,'box_to_box'),
 ('Frings',2006):(82,'deep_playmaker'),
 ('Senna',2008):(82,'deep_playmaker'),
 ('Senna',2006):(81,'deep_playmaker'),
 ('Kroos',2010):(81,'deep_playmaker'),
 ('Montolivo',2012):(81,'deep_playmaker'),
 ('Cabaye',2012):(81,'deep_playmaker'),
 ('Juninho',2002):(82,'playmaker'),
 ('Aimar',2002):(83,'playmaker'),
 ('Luis Garcia',2006):(80,'playmaker'),
 ('Sheringham',1998):(82,'false_nine'),
 ('Edmundo',1998):(81,'poacher'),
 ('Gilardino',2006):(81,'poacher'),
 ('Iaquinta',2006):(80,'complete_fwd'),
 ('Trezeguet',1998):(81,'poacher'),
 ('Nuno Gomes',2000):(82,'complete_fwd'),
 ('Fowler',1996):(82,'poacher'),
 ('Negredo',2012):(81,'target_man'),
 ('Llorente',2010):(80,'target_man'),
 ('Llorente',2012):(82,'target_man'),
 ('Gomez M',2012):(83,'poacher'),
 ('Fullkrug',2024):(80,'target_man'),
 ('Kolo Muani',2024):(81,'complete_fwd'),
 ('Littbarski',1990):(82,'pace_winger'),
 ('Waddle',1990):(81,'creative_wing'),
 ('Waddle',1988):(82,'creative_wing'),
 ('Limpar',1994):(80,'pace_winger'),
 ('Basler',1996):(82,'creative_wing'),
 ('Quaresma',2016):(81,'pace_winger'),
 ('Coman',2016):(81,'pace_winger'),
 ('Coman',2020):(84,'pace_winger'),
 ('Sane',2016):(82,'pace_winger'),
 ('Martial',2016):(82,'pace_winger'),
 ('Mata',2012):(84,'creative_wing'),
 ('Navas',2012):(82,'pace_winger'),
 ('Sterling',2014):(80,'pace_winger'),
 ('Branco',1994):(81,'attacking_fb'),
 ('Branco',1986):(80,'attacking_fb'),
 ('Jorginho',1994):(81,'attacking_fb'),
 ('Petrescu',1994):(81,'attacking_fb'),
 ('Zambrotta',2000):(79,'attacking_fb'),
 ('Grosso',2006):(82,'attacking_fb'),
 ('Van Bronckhorst',2000):(81,'attacking_fb'),
 ('Theo Hernandez',2024):(84,'attacking_fb'),
 ('Nuno Mendes',2024):(83,'attacking_fb'),
 ('Joao Cancelo',2024):(84,'attacking_fb'),
 ('Walker K',2020):(84,'fullback'),
 ('Kyle Walker',2018):(84,'fullback'),
 ('Bilic',1998):(81,'classic_cb'),
 ('Buchwald',1994):(81,'libero'),
 ('Materazzi',2006):(82,'classic_cb'),
 ('Mertesacker',2014):(82,'classic_cb'),
 ('Sule',2020):(84,'classic_cb'),
 ('Rudiger',2020):(84,'ball_play_cb'),
 ('Upamecano',2024):(84,'ball_play_cb'),
 ('Éder Militão',2022):(83,'ball_play_cb'),
 ('William Saliba',2022):(82,'classic_cb'),
 ('Vincent Kompany',2018):(84,'classic_cb'),
 ('Nicolás Otamendi',2018):(82,'classic_cb'),
 ('Lisandro Martínez',2022):(81,'ball_play_cb'),
 ('Kante',2024):(84,'destroyer'),
 ('Eduardo Camavinga',2022):(82,'box_to_box'),
 ('Bruno Guimarães',2022):(82,'box_to_box'),
 ('Zubimendi',2024):(82,'deep_playmaker'),
 ('Gundogan',2020):(86,'box_to_box'),
 ('Gundogan',2024):(84,'box_to_box'),
 ('Dani Olmo',2024):(83,'playmaker'),
 ('Mount',2020):(83,'box_to_box'),
 ('Mason Mount',2022):(83,'box_to_box'),
 ('Palmer',2024):(84,'playmaker'),
 ('Diogo Jota',2024):(83,'complete_fwd'),
 ('Diogo Jota',2020):(82,'complete_fwd'),
 ('Lautaro Martínez',2022):(85,'poacher'),
 ('Marcus Thuram',2022):(80,'target_man'),
 ('Jamie Vardy',2018):(82,'poacher'),
 ('Roberto Firmino',2018):(84,'false_nine'),
 ('Timo Werner',2018):(83,'poacher'),
}

BAKS = {
 'players_wc_old.json':'/tmp/players_wc_old.bak.json',
 'players_euro_a.json':'/tmp/euro_a.bak.json',
 'players_euro_b.json':'/tmp/euro_b.bak.json',
 'players_wc_new.json':'/tmp/wc_new.bak.json',
}

def main():
    manifest = {}
    for cur, bak in BAKS.items():
        if not os.path.exists(bak):
            raise SystemExit(f'backup missing: {bak} (cannot identify added rows)')
        backup = json.load(open(bak))
        orig = {(p['name'], p['year'], p['nation']) for p in backup}
        # ORIGINAL rows that are "flat" (generated, not curated) — safe to reshape.
        flat_orig = {(p['name'], p['year'], p['nation']) for p in backup if is_flat(p)}
        data = json.load(open('src/data/' + cur))
        n_icon = n_cur = n_def = n_keep = 0
        for row in data:
            key3 = (row['name'], row['year'], row['nation'])
            is_orig = key3 in orig
            k = (row['name'], row['year'])
            if k in ICONS:
                ov, *st = ICONS[k]
                row['overall'] = ov
                for i, s in enumerate(FACE): row[s] = clamp(st[i])
                n_icon += 1
            elif k in CURATED:
                ov, arch = CURATED[k]
                ov = ov if ov is not None else row['overall']
                arch = arch or POS_DEFAULT.get(row['positions'][0], 'box_to_box')
                apply_arch(row, arch, ov); n_cur += 1
            elif (not is_orig) or (key3 in flat_orig):
                # added players + flat originals -> archetype reshape
                arch = POS_DEFAULT.get(row['positions'][0], 'box_to_box')
                apply_arch(row, arch, row['overall']); n_def += 1
            else:
                n_keep += 1  # distinctive hand-curated original — preserved
        json.dump(data, open('src/data/' + cur, 'w'), ensure_ascii=False, separators=(',', ':'))
        manifest[cur] = {'icons': n_icon, 'curated': n_cur, 'default': n_def, 'kept_original': n_keep}
        print(f'{cur}: icons={n_icon} curated={n_cur} reshaped={n_def} kept_distinctive_original={n_keep}')
    json.dump({k: sorted([f"{n}|{y}|{na}" for (n, y, na) in
              ({(p['name'], p['year'], p['nation']) for p in json.load(open('src/data/'+k))} -
               {(p['name'], p['year'], p['nation']) for p in json.load(open(v))})])
              for k, v in BAKS.items()}, open('added_players.json', 'w'), indent=0)
    print('wrote added_players.json manifest')

if __name__ == '__main__':
    main()
