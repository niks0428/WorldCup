#!/usr/bin/env python3
"""
Comprehensive player data fix for WC + Euro files.
1. Regenerates pac/sho/pas/dri/def/phy using the correct formula (no max(40) clamp).
2. Removes ghost players (players at tournaments after they retired).
3. Fixes wrong positions.
4. Fixes wrong overall ratings.
"""
import json, os

BASE = os.path.dirname(__file__)

FILES = [
    os.path.join(BASE, 'src/data/players_wc_old.json'),
    os.path.join(BASE, 'src/data/players_wc_new.json'),
    os.path.join(BASE, 'src/data/players_euro_a.json'),
    os.path.join(BASE, 'src/data/players_euro_b.json'),
]

# Source-of-truth AVG from expand_squads.py (derived from real FIFA 24 averages per position)
AVG = {
    'GK':  {'overall': 84, 'pac': 54, 'sho': 13, 'pas': 45, 'dri': 38, 'def': 20, 'phy': 74},
    'CB':  {'overall': 83, 'pac': 68, 'sho': 33, 'pas': 60, 'dri': 57, 'def': 83, 'phy': 78},
    'RB':  {'overall': 81, 'pac': 78, 'sho': 47, 'pas': 65, 'dri': 65, 'def': 73, 'phy': 69},
    'LB':  {'overall': 80, 'pac': 77, 'sho': 45, 'pas': 64, 'dri': 65, 'def': 72, 'phy': 68},
    'RWB': {'overall': 80, 'pac': 80, 'sho': 47, 'pas': 65, 'dri': 66, 'def': 70, 'phy': 69},
    'LWB': {'overall': 79, 'pac': 80, 'sho': 54, 'pas': 62, 'dri': 62, 'def': 60, 'phy': 70},
    'CDM': {'overall': 83, 'pac': 66, 'sho': 54, 'pas': 74, 'dri': 69, 'def': 77, 'phy': 75},
    'CM':  {'overall': 83, 'pac': 70, 'sho': 66, 'pas': 78, 'dri': 75, 'def': 62, 'phy': 70},
    'CAM': {'overall': 85, 'pac': 76, 'sho': 77, 'pas': 81, 'dri': 83, 'def': 43, 'phy': 65},
    'RM':  {'overall': 82, 'pac': 75, 'sho': 66, 'pas': 74, 'dri': 74, 'def': 45, 'phy': 66},
    'LM':  {'overall': 79, 'pac': 76, 'sho': 54, 'pas': 67, 'dri': 70, 'def': 57, 'phy': 66},
    'RW':  {'overall': 82, 'pac': 84, 'sho': 73, 'pas': 71, 'dri': 81, 'def': 33, 'phy': 64},
    'LW':  {'overall': 83, 'pac': 85, 'sho': 75, 'pas': 72, 'dri': 83, 'def': 32, 'phy': 65},
    'ST':  {'overall': 84, 'pac': 79, 'sho': 82, 'pas': 66, 'dri': 76, 'def': 29, 'phy': 73},
}
FACE = ['pac', 'sho', 'pas', 'dri', 'def', 'phy']

def clamp(v):
    return max(1, min(99, int(round(v))))

def regen_stats(player):
    """Recompute six stats from position + overall using the correct formula."""
    pos = player['positions'][0]
    base = AVG.get(pos, AVG['CM'])
    delta = player['overall'] - base['overall']
    for s in FACE:
        player[s] = clamp(base[s] + delta)
    return player

# ── Ghost players to remove ──────────────────────────────────────────────────
# (name_fragment, nation, year, tournament)
GHOSTS = [
    # Zidane retired after 2006 WC; not at Euro 2008
    ('Zidane', 'France', 2008, 'EURO'),
    ('Zinedine Zidane', 'France', 2008, 'EURO'),
    # Figo retired from international football after 2006 WC
    ('Figo', 'Portugal', 2008, 'EURO'),
    ('Luís Figo', 'Portugal', 2008, 'EURO'),
    # Stoichkov retired from internationals ~1998; was 37+ in 2004
    ('Stoichkov', 'Bulgaria', 2004, 'EURO'),
    ('Hristo Stoichkov', 'Bulgaria', 2004, 'EURO'),
]

def is_ghost(p):
    for name, nation, year, tourn in GHOSTS:
        if (name.lower() in p['name'].lower()
                and p['nation'] == nation
                and p['year'] == year
                and p['tournament'] == tourn):
            return True
    return False

# ── Position corrections  (name_fragment, nation, year, new_pos) ─────────────
POS_FIXES = [
    # Pirlo was firmly CDM (regista) from 2004 Euro onwards
    ('Pirlo', 'Italy', 2004, 'CDM'),
    ('Andrea Pirlo', 'Italy', 2004, 'CDM'),
    ('Pirlo', 'Italy', 2006, 'CDM'),
    ('Pirlo', 'Italy', 2008, 'CDM'),
    ('Andrea Pirlo', 'Italy', 2008, 'CDM'),
    ('Andrea Pirlo', 'Italy', 2010, 'CDM'),
    ('Pirlo', 'Italy', 2012, 'CDM'),
    ('Andrea Pirlo', 'Italy', 2014, 'CDM'),
    ('Andrea Pirlo', 'Italy', 2016, 'CDM'),
    # CR7 played as RW, not LW, at Euro 2012 (FIFA 12 lists him RW 94)
    ('Cristiano Ronaldo', 'Portugal', 2012, 'RW'),
    # Henry played as a winger (LW) at WC 1998 — already correct, no change needed
    # Rijkaard played CM (not CDM) at 1988 Euro
    ('Rijkaard', 'Netherlands', 1988, 'CM'),
    # Stam was CB not RB — check if misclassified
]

def apply_pos_fix(p):
    for name, nation, year, new_pos in POS_FIXES:
        if (name.lower() in p['name'].lower()
                and p['nation'] == nation
                and p['year'] == year):
            p['positions'] = [new_pos]
            return
    return

# ── Overall rating corrections  (name_fragment, nation, year, new_ovr) ──────
# Only for clear misratings of well-known players
OVR_FIXES = [
    # Henry wasn't elite-level yet in 1998 (he was a fringe winger for France)
    ('Henry', 'France', 1998, 83),
    # Henry 2000 was already top-tier after Wenger converted him to ST
    ('Henry', 'France', 2000, 89),
    # CR7 won Ballon d'Or 2008 — should be 90
    ('Cristiano Ronaldo', 'Portugal', 2008, 90),
    # Zidane was already world-class at Euro 1996 (not just 88)
    ('Zidane', 'France', 1996, 90),
    # Figo was already a top winger at Euro 1996
    ('Figo', 'Portugal', 1996, 87),
    # Baresi was arguably the best CB in the world by WC 1986
    ('Franco Baresi', 'Italy', 1986, 90),
    # Messi won Ballon d'Or 2010 and was already the best player in the world
    ('Lionel Messi', 'Argentina', 2010, 91),
    # Pirlo was CDM/CM at 2002 WC (before his regista reinvention)
    # His rating of 84 for both 2000 and 2002 seems fair
    # Suárez Uruguay 2010 ovr=84 → check career context (fair)
    # Torres Spain 2008 = ST 89 is fine for peak Torres
    # Cannavaro Italy 2008 = CB 90 → reasonable for post-WC winner
    # Buffon Italy 1996 = GK 80 → he was only 18, OK
    # Buffon Italy 2016 = GK 90 → reasonable, still elite
]

def apply_ovr_fix(p):
    for name, nation, year, new_ovr in OVR_FIXES:
        if (name.lower() in p['name'].lower()
                and p['nation'] == nation
                and p['year'] == year):
            p['overall'] = new_ovr
            return

# ── Apply all fixes ──────────────────────────────────────────────────────────
total_removed = 0
total_pos_fixed = 0
total_ovr_fixed = 0

for path in FILES:
    data = json.load(open(path))
    original_count = len(data)

    new_data = []
    for p in data:
        # 1. Remove ghosts
        if is_ghost(p):
            total_removed += 1
            print(f'  REMOVE ghost: {p["name"]} ({p["nation"]} {p["year"]} {p["tournament"]})')
            continue

        # 2. Fix position before stat regen
        old_pos = p['positions'][0]
        apply_pos_fix(p)
        if p['positions'][0] != old_pos:
            total_pos_fixed += 1
            print(f'  POS FIX: {p["name"]} {p["nation"]} {p["year"]}: {old_pos} → {p["positions"][0]}')

        # 3. Fix overall before stat regen
        old_ovr = p['overall']
        apply_ovr_fix(p)
        if p['overall'] != old_ovr:
            total_ovr_fixed += 1
            print(f'  OVR FIX: {p["name"]} {p["nation"]} {p["year"]}: {old_ovr} → {p["overall"]}')

        # 4. Regenerate stats using correct formula
        regen_stats(p)

        new_data.append(p)

    json.dump(new_data, open(path, 'w'), ensure_ascii=False, indent=2)
    print(f'{os.path.basename(path)}: {original_count} → {len(new_data)} players')

print(f'\nSummary: removed {total_removed} ghosts, {total_pos_fixed} pos fixes, {total_ovr_fixed} ovr fixes')
print('All stats regenerated with correct formula.')

# Quick verification
data = json.load(open(FILES[0]))
gks = [p for p in data if p['positions'][0] == 'GK']
print(f'\nGK stat sample (should have sho≈9-20, def≈11-27):')
for p in sorted(gks, key=lambda x: -x['overall'])[:5]:
    print(f'  {p["name"]:25} ovr={p["overall"]} sho={p["sho"]} def={p["def"]} pac={p["pac"]}')
