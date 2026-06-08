#!/usr/bin/env python3
"""Import real FIFA squad data for the Premier League mode from fifaindex.com.

fifaindex is Cloudflare-protected but a real (headful) Chromium on a virtual
display clears the challenge. We scrape, per FIFA edition:
  PL league page  -> the 20 clubs in that edition
  each club page   -> its squad (name, nation, position, overall)
and write src/data/players_pl.json in the game's schema (club in `nation`,
edition year in `year`, tournament 'PL'). Standard cards only (fifaindex lists
standard squad ratings — no special/TOTW cards).

Scoring uses only `overall` + position, so the six attributes are derived from a
position archetype (same as the seed) rather than scraped per-player (which would
need a detail page per player = thousands of extra loads).

Run:  xvfb-run -a /home/vladthelad/3dprint_env/bin/python fifaindex_import.py [edition ...]
      (no args = all editions)
"""
import sys, os, json, hashlib, time
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

BASE = "https://www.fifaindex.com"
PL_LEAGUE = "13-england-premier-league-1"
# FIFA editions on fifaindex. year = the edition's nominal year (07 -> 2007).
EDITIONS = [f"fifa{e:02d}" for e in range(7, 25)]  # fifa07 .. fifa24

# fifaindex club name -> our CLUB_META key (so crests resolve). Unmapped names
# fall through unchanged (ClubCrest monograms them).
CLUB_FIX = {
    "Brighton & Hove Albion": "Brighton",
    "Wolverhampton Wanderers": "Wolves", "Wolverhampton": "Wolves",
    "Queens Park Rangers": "QPR",
    # fifaindex abbreviates club names differently across editions — collapse the
    # variants onto the canonical (crest-mapped) name so a club isn't split in two.
    "AFC Bournemouth": "Bournemouth", "Arsenal FC": "Arsenal",
    "Blackburn Rvrs": "Blackburn Rovers", "Bolton": "Bolton Wanderers",
    "Chelsea FC": "Chelsea", "Manchester Utd": "Manchester United",
    "Newcastle Utd": "Newcastle United", "Reading FC": "Reading",
    "Spurs": "Tottenham Hotspur", "West Brom": "West Bromwich Albion",
    "West Bromwich": "West Bromwich Albion", "West Ham": "West Ham United",
}

# fifaindex position codes -> our 14 valid codes.
def norm_pos(p):
    p = (p or "").upper().strip()
    if p in ("RCB", "LCB", "CB"): return "CB"
    if p == "RB": return "RB"
    if p == "LB": return "LB"
    if p == "RWB": return "RWB"
    if p == "LWB": return "LWB"
    if p in ("RDM", "LDM", "CDM"): return "CDM"
    if p in ("RCM", "LCM", "CM"): return "CM"
    if p in ("CAM", "RAM", "LAM"): return "CAM"
    if p == "RM": return "RM"
    if p == "LM": return "LM"
    if p in ("RW", "RF"): return "RW"
    if p in ("LW", "LF"): return "LW"
    if p in ("ST", "CF", "RS", "LS"): return "ST"
    if p == "GK": return "GK"
    return None

ARCH = {
    "GK": (-28,-55,-35,-38,-55,-6), "CB": (-12,-38,-8,-16,4,3),
    "RB": (6,-22,-2,-2,-1,-4), "LB": (6,-22,-2,-2,-1,-4),
    "RWB": (8,-18,0,2,-4,-5), "LWB": (8,-18,0,2,-4,-5),
    "CDM": (-6,-16,-2,-6,6,4), "CM": (-2,-8,4,2,-4,-2), "CAM": (0,-2,6,6,-16,-6),
    "RM": (6,-8,2,6,-14,-6), "LM": (6,-8,2,6,-14,-6),
    "RW": (8,-2,0,8,-22,-8), "LW": (8,-2,0,8,-22,-8), "ST": (4,6,-8,2,-30,0),
}
ATTRS = ["pac","sho","pas","dri","def","phy"]

def jit(name, a):
    return int(hashlib.md5(f"{name}|{a}".encode()).hexdigest(), 16) % 7 - 3
def clamp(v):
    return max(28, min(96, int(round(v))))

def wait_table(pg, tries=22):
    for _ in range(tries):
        pg.wait_for_timeout(1100)
        t = pg.title().lower()
        if ("moment" not in t and "attention" not in t
                and pg.eval_on_selector_all("table tbody tr", "e=>e.length") > 0):
            return True
    return False

def edition_year(ed):
    n = int(ed.replace("fifa", ""))
    return 2000 + n

def scrape_team(pg, url, club, year):
    pg.goto(BASE + url, wait_until="domcontentloaded", timeout=60000)
    if not wait_table(pg):
        return []
    # team page columns: # | Player | Nation | Pos | Age | OVR | POT | ...
    rows = pg.eval_on_selector_all("table tbody tr", """r=>r.map(x=>{
        const t=x.querySelectorAll('td');
        return {name:(t[1]?.innerText||'').trim(), nat:(t[2]?.innerText||'').trim(),
                pos:(t[3]?.innerText||'').trim(), ovr:(t[5]?.innerText||'').trim()};
    })""")
    out = []
    for r in rows:
        pos = norm_pos(r["pos"])
        try: ovr = int(r["ovr"])
        except: ovr = None
        if not r["name"] or not pos or not ovr: continue
        rec = {"name": r["name"], "nation": club, "year": year,
               "positions": [pos], "overall": ovr}
        d = ARCH[pos]
        for i, a in enumerate(ATTRS):
            rec[a] = clamp(ovr + d[i] + jit(r["name"], a))
        rec["tournament"] = "PL"
        out.append(rec)
    # keep the top 30 by overall — plenty of squad depth for drafting
    out.sort(key=lambda x: -x["overall"])
    return out[:30]

def scrape_edition(pg, ed):
    year = edition_year(ed)
    pg.goto(f"{BASE}/leagues/{PL_LEAGUE}/{ed}", wait_until="domcontentloaded", timeout=60000)
    if not wait_table(pg):
        print(f"  [{ed}] league page did not load — skipping", flush=True)
        return []
    teams = pg.eval_on_selector_all("table tbody tr a[href*='/teams/']",
        "els=>[...new Map(els.map(e=>[e.getAttribute('href'),e.textContent.trim()])).entries()]"
        ".filter(([h])=>/\\/teams\\/\\d+/.test(h))")
    players, clubs = [], []
    for href, name in teams:
        club = CLUB_FIX.get(name, name)
        sq = scrape_team(pg, href, club, year)
        if sq:
            players += sq; clubs.append(club)
        time.sleep(0.6)
    print(f"  [{ed}] {len(clubs)} clubs, {len(players)} players", flush=True)
    return players

def main():
    eds = sys.argv[1:] or EDITIONS
    dst = os.path.join(os.path.dirname(__file__), "src", "data", "players_pl.json")
    all_players = []
    with Stealth().use_sync(sync_playwright()) as p:
        b = p.chromium.launch(executable_path="/usr/bin/chromium", headless=False,
            args=["--no-sandbox","--disable-dev-shm-usage","--disable-blink-features=AutomationControlled"])
        pg = b.new_context(locale="en-GB", timezone_id="Europe/London",
                           viewport={"width":1400,"height":900}).new_page()
        for ed in eds:
            try:
                all_players += scrape_edition(pg, ed)
            except Exception as e:
                print(f"  [{ed}] ERROR {e!r}", flush=True)
            # Persist after every edition so a long run survives interruption.
            if all_players:
                with open(dst, "w") as f:
                    json.dump(all_players, f, ensure_ascii=False)
        b.close()
    if all_players:
        clubs = sorted({(p["nation"], p["year"]) for p in all_players})
        print(f"\nWrote {len(all_players)} players, {len(clubs)} club-editions -> {dst}", flush=True)
    else:
        print("\nNo players scraped — file left unchanged.", flush=True)

if __name__ == "__main__":
    main()
