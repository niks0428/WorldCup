#!/usr/bin/env python3
"""Fix pre-existing data errors flagged after the squad expansion.

- Remove Italy from WC 2018 & 2022 (Italy did not qualify for either).
- De-duplicate players that appear twice under different spellings/nicknames,
  and remove a wrong-nationality row, replacing each with a real squad member
  so the affected squad stays at 16 with valid position coverage.
New replacement players reuse the same stat-derivation as expand_squads.py.
"""
import json
from expand_squads import make

def load(p):  return json.load(open(p))
def save(p,d): json.dump(d, open(p,'w'), ensure_ascii=False, separators=(',',':'))

# ── players_wc_new.json: drop Italy 2018/2022, fix Mexico & Morocco ──────────────
f = 'src/data/players_wc_new.json'
d = load(f)
before = len(d)

# 1. Italy did not qualify for WC 2018 or 2022 — remove entirely.
d = [p for p in d if not (p['nation'] == 'Italy' and p['year'] in (2018, 2022))]

# 2. Mexico 2022: "Chucky Lozano" duplicates "Hirving Lozano".
d = [p for p in d if not (p['year'] == 2022 and p['nation'] == 'Mexico' and p['name'] == 'Chucky Lozano')]
d.append(make('Luis Romo', 'Mexico', 2022, 'WC', ['CDM'], 76))

# 3. Morocco 2018: duplicate Benatia spelling + wrong-nationality keeper.
d = [p for p in d if not (p['year'] == 2018 and p['nation'] == 'Morocco'
                          and p['name'] in ('Medhi Benatia', 'Rui Patricio'))]
d.append(make('Munir Mohamedi', 'Morocco', 2018, 'WC', ['GK'], 74))   # real Morocco GK
d.append(make('Manuel da Costa', 'Morocco', 2018, 'WC', ['CB'], 75))

save(f, d)
print(f'{f}: {before} -> {len(d)}')

# ── players_euro_a.json: fix USSR 1988 "Rats A" duplicate ────────────────────────
f = 'src/data/players_euro_a.json'
d = load(f)
before = len(d)
d = [p for p in d if not (p['year'] == 1988 and p['nation'] == 'USSR' and p['name'] == 'Rats A')]
d.append(make('Dobrovolski', 'USSR', 1988, 'EURO', ['CAM', 'CM'], 79))
save(f, d)
print(f'{f}: {before} -> {len(d)}')

if __name__ == '__main__':
    pass
