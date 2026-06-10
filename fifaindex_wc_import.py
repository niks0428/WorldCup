#!/usr/bin/env python3
"""Import REAL World Cup player data from fifaindex.com national team pages.

Maps each WC to the FIFA edition released the same year:
  WC 2006 → fifa07  WC 2010 → fifa11  WC 2014 → fifa15
  WC 2018 → fifa19  WC 2022 → fifa23

Run:
  xvfb-run -a /home/vladthelad/3dprint_env/bin/python fifaindex_wc_import.py [year ...]
  (no args = 2006 2010 2014 2018 2022)

Reads/writes:
  src/data/players_wc_new.json  (2018, 2022 — merged)
  src/data/players_wc_old.json  (1986-2002 preserved; 2006-2014 replaced)

Phase caching:
  wc_player_urls.json  (phase-1 cache; auto-resumes)
"""
import sys, os, json, hashlib, asyncio, re
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

BASE = "https://www.fifaindex.com"
DATA_DIR  = os.path.join(os.path.dirname(__file__), "src", "data")
URL_CACHE = os.path.join(os.path.dirname(__file__), "wc_player_urls.json")
INTL_LEAGUE = "78-national-teams"
STATS_WORKERS = 20
TARGET = 16   # max players to keep per national team

# WC year → FIFA edition
WC_MAP = {
    2006: ("fifa07", "WC"),
    2010: ("fifa11", "WC"),
    2014: ("fifa15", "WC"),
    2018: ("fifa19", "WC"),
    2022: ("fifa23", "WC"),
}

# Nations that qualified for each WC  (FIFA naming convention)
WC_NATIONS = {
    2006: {
        "Angola","Argentina","Australia","Brazil","Costa Rica","Croatia",
        "Czech Republic","Czechia","Ecuador","England","France","Germany",
        "Ghana","Iran","Italy","Ivory Coast","Côte d'Ivoire","Japan","Mexico",
        "Netherlands","Holland","Paraguay","Poland","Portugal",
        "Rep. Of Korea","South Korea","Serbia","Serbia & Montenegro",
        "Spain","Sweden","Switzerland","Togo","Trinidad & Tobago",
        "Trinidad and Tobago","Tunisia","Ukraine","United States","Uruguay",
    },
    2010: {
        "Algeria","Argentina","Australia","Brazil","Cameroon","Chile",
        "Denmark","England","France","Germany","Ghana","Greece",
        "Honduras","Ivory Coast","Côte d'Ivoire","Japan","Mexico",
        "Netherlands","Holland","New Zealand","Nigeria","North Korea",
        "Paraguay","Portugal","Serbia","Slovakia","Slovenia",
        "South Africa","South Korea","Rep. Of Korea","Spain","Switzerland",
        "United States","Uruguay",
    },
    2014: {
        "Algeria","Argentina","Australia","Belgium","Bosnia-Herzegovina",
        "Bosnia & Herzegovina","Brazil","Cameroon","Chile","Colombia",
        "Costa Rica","Croatia","Ecuador","England","France","Germany",
        "Ghana","Greece","Honduras","Iran","Italy","Ivory Coast","Côte d'Ivoire",
        "Japan","Mexico","Netherlands","Holland","Nigeria","Portugal",
        "Russia","South Korea","Rep. Of Korea","Spain","Switzerland",
        "United States","Uruguay",
    },
    2018: {
        "Argentina","Australia","Belgium","Brazil","Colombia","Costa Rica",
        "Croatia","Denmark","Egypt","England","France","Germany","Iceland",
        "Iran","Japan","Mexico","Morocco","Nigeria","Panama","Peru",
        "Poland","Portugal","Russia","Saudi Arabia","Senegal","Serbia",
        "South Korea","Rep. Of Korea","Spain","Sweden","Switzerland",
        "Tunisia","Uruguay",
    },
    2022: {
        "Argentina","Australia","Belgium","Brazil","Cameroon","Canada",
        "Costa Rica","Croatia","Denmark","Ecuador","England","France",
        "Germany","Ghana","Iran","IR Iran","Japan","Mexico","Morocco",
        "Netherlands","Holland","Poland","Portugal","Qatar","Saudi Arabia",
        "Senegal","Serbia","South Korea","Rep. Of Korea","Spain","Switzerland",
        "Tunisia","United States","Uruguay","Wales",
    },
}

# Normalize nation names to canonical game names
NATION_NORM = {
    "Rep. Of Korea": "South Korea",
    "Holland": "Netherlands",
    "Côte d'Ivoire": "Ivory Coast",
    "Bosnia-Herzegovina": "Bosnia & Herzegovina",
    "IR Iran": "Iran",
    "Trinidad and Tobago": "Trinidad & Tobago",
    "Serbia & Montenegro": "Serbia",
    "Czech Republic": "Czech Republic",
    "Czechia": "Czech Republic",
    "Austria (National team)": "Austria",
    "Republic of Ireland": "Ireland",
    "China PR": "China",
}

def norm_nation(n):
    return NATION_NORM.get(n, n)

def in_wc(nation_raw, wc_year):
    return nation_raw in WC_NATIONS[wc_year] or norm_nation(nation_raw) in WC_NATIONS[wc_year]

def norm_pos(p):
    p = (p or "").upper().strip()
    if p in ("RCB","LCB","CB"): return "CB"
    if p == "RB": return "RB"
    if p == "LB": return "LB"
    if p == "RWB": return "RWB"
    if p == "LWB": return "LWB"
    if p in ("RDM","LDM","CDM"): return "CDM"
    if p in ("RCM","LCM","CM"): return "CM"
    if p in ("CAM","RAM","LAM"): return "CAM"
    if p == "RM": return "RM"
    if p == "LM": return "LM"
    if p in ("RW","RF"): return "RW"
    if p in ("LW","LF"): return "LW"
    if p in ("ST","CF","RS","LS"): return "ST"
    if p == "GK": return "GK"
    return None

ARCH = {
    "GK":  (-28,-55,-35,-38,-55,-6), "CB":  (-12,-38,-8,-16,4,3),
    "RB":  (6,-22,-2,-2,-1,-4),      "LB":  (6,-22,-2,-2,-1,-4),
    "RWB": (8,-18,0,2,-4,-5),        "LWB": (8,-18,0,2,-4,-5),
    "CDM": (-6,-16,-2,-6,6,4),       "CM":  (-2,-8,4,2,-4,-2),
    "CAM": (0,-2,6,6,-16,-6),        "RM":  (6,-8,2,6,-14,-6),
    "LM":  (6,-8,2,6,-14,-6),        "RW":  (8,-2,0,8,-22,-8),
    "LW":  (8,-2,0,8,-22,-8),        "ST":  (4,6,-8,2,-30,0),
}
ATTRS = ["pac","sho","pas","dri","def","phy"]

def jit(name, a):
    return int(hashlib.md5(f"{name}|{a}".encode()).hexdigest(), 16) % 7 - 3

def clamp(v):
    return max(28, min(96, int(round(v))))

def derive_stats(name, pos, ovr):
    d = ARCH[pos]
    return {a: clamp(ovr + d[i] + jit(name, a)) for i, a in enumerate(ATTRS)}

# ──────────────────────────────────────────────────────────────────
# Phase 1: scrape team pages
# ──────────────────────────────────────────────────────────────────
async def wait_table(pg, tries=22):
    for _ in range(tries):
        await pg.wait_for_timeout(1100)
        t = (await pg.title()).lower()
        count = await pg.eval_on_selector_all("table tbody tr", "e=>e.length")
        if "moment" not in t and "attention" not in t and count > 0:
            return True
    return False

async def scrape_team_page(pg, url, nation_raw, wc_year, ed):
    """Scrape a national team page: returns list of player dicts."""
    await pg.goto(BASE + url, wait_until="domcontentloaded", timeout=60000)
    if not await wait_table(pg):
        print(f"    [P1] table timeout: {url}", flush=True)
        return []
    rows = await pg.eval_on_selector_all("table tbody tr", """rows=>rows.map(r=>{
        const t=r.querySelectorAll('td');
        const a=t[1]?.querySelector('a');
        return {
            name:(t[1]?.innerText||'').trim(),
            pos:(t[3]?.innerText||'').trim(),
            ovr:(t[5]?.innerText||'').trim(),
            href: a ? a.getAttribute('href') : ''
        };
    })""")
    nation = norm_nation(nation_raw)
    out = []
    for r in rows:
        pos = norm_pos(r["pos"])
        try: ovr = int(r["ovr"])
        except: ovr = None
        if not r["name"] or not pos or not ovr: continue
        out.append({
            "name": r["name"], "nation": nation, "year": wc_year,
            "positions": [pos], "overall": ovr, "tournament": "WC",
            "_href": r["href"], "_ed": ed,
        })
    out.sort(key=lambda x: -x["overall"])
    return out[:TARGET]

async def phase1(browser, wc_years):
    pg = await (await browser.new_context(
        locale="en-GB", timezone_id="Europe/London",
        viewport={"width":1400,"height":900})).new_page()
    all_players = []
    for wc_year in wc_years:
        ed, _ = WC_MAP[wc_year]
        print(f"  [P1/WC{wc_year}/{ed}] fetching league page …", flush=True)
        await pg.goto(f"{BASE}/leagues/{INTL_LEAGUE}/{ed}/", wait_until="domcontentloaded", timeout=60000)
        if not await wait_table(pg):
            print(f"  [P1/WC{wc_year}] league page failed — skip", flush=True)
            continue
        teams = await pg.eval_on_selector_all(
            "table tbody tr a[href*='/teams/']",
            "els=>[...new Map(els.map(e=>[e.getAttribute('href'),e.textContent.trim()])).entries()]"
            ".filter(([h])=>h.includes('/teams/'))")
        yr_players = []
        for href, name in teams:
            if not in_wc(name, wc_year):
                continue
            sq = await scrape_team_page(pg, href, name, wc_year, ed)
            yr_players += sq
            print(f"    WC{wc_year} {norm_nation(name)}: {len(sq)} players", flush=True)
            await pg.wait_for_timeout(500)
        print(f"  [P1/WC{wc_year}] {len(yr_players)} players from {len(teams)} teams", flush=True)
        all_players += yr_players
    await pg.close()
    return all_players

# ──────────────────────────────────────────────────────────────────
# Phase 2: real per-player stats
# ──────────────────────────────────────────────────────────────────
STATS_JS = """()=>{
    const labels = ['PAC','SHO','PAS','DRI','DEF','PHY'];
    const out = {};
    document.querySelectorAll('span').forEach(sp => {
        const t = sp.innerText.trim();
        if (labels.includes(t) && !(t.toLowerCase() in out)) {
            const sib = sp.previousElementSibling || sp.parentElement?.firstElementChild;
            if (sib && sib !== sp) {
                const v = parseInt(sib.innerText.trim());
                if (!isNaN(v)) out[t.toLowerCase()] = v;
            }
        }
    });
    return out;
}"""

async def wait_stats(pg, tries=25):
    for _ in range(tries):
        t = (await pg.title()).lower()
        if "moment" not in t and "attention" not in t:
            result = await pg.evaluate(STATS_JS)
            if len(result) == 6:
                return result
        await pg.wait_for_timeout(600)
    return {}

async def scrape_player_stats(sem, ctx, player):
    href = player.get("_href", "").rstrip("/")
    ed   = player.get("_ed", "")
    if not href or not ed:
        return None
    url = f"{BASE}{href}/{ed}/" if not href.endswith(f"/{ed}") else f"{BASE}{href}/"
    async with sem:
        pg = await ctx.new_page()
        try:
            await pg.goto(url, wait_until="domcontentloaded", timeout=60000)
            stats = await wait_stats(pg)
            return stats if len(stats) == 6 else None
        except Exception as e:
            print(f"    [P2] {player['name']} {ed}: {e!r}", flush=True)
            return None
        finally:
            await pg.close()

async def phase2(browser, players):
    ctx = await browser.new_context(
        locale="en-GB", timezone_id="Europe/London",
        viewport={"width":1400,"height":900})
    # Warm up
    warmup = await ctx.new_page()
    await warmup.goto(f"{BASE}/player/232580-gabriel/fifa23/", wait_until="domcontentloaded", timeout=60000)
    await wait_stats(warmup, tries=15)
    await warmup.close()
    print(f"  [P2] warmed up; {len(players)} players, {STATS_WORKERS} workers", flush=True)

    sem = asyncio.Semaphore(STATS_WORKERS)
    counter = {"n": 0}
    total = len(players)

    async def scrape_and_track(player):
        result = await scrape_player_stats(sem, ctx, player)
        counter["n"] += 1
        if counter["n"] % 100 == 0:
            print(f"  [P2] {counter['n']}/{total}", flush=True)
        return result

    results = await asyncio.gather(*[scrape_and_track(p) for p in players])
    await ctx.close()
    return results

# ──────────────────────────────────────────────────────────────────
# Merge helpers
# ──────────────────────────────────────────────────────────────────
def merge_into_files(scraped):
    """Merge scraped WC 2006-2022 into the wc_new / wc_old JSON files."""
    new_path = os.path.join(DATA_DIR, "players_wc_new.json")
    old_path = os.path.join(DATA_DIR, "players_wc_old.json")

    existing_new = json.load(open(new_path))
    existing_old = json.load(open(old_path))

    # Keep 1986-2002 from old file
    keep_old = [p for p in existing_old if p["year"] < 2006]

    scraped_new = [p for p in scraped if p["year"] >= 2018]
    scraped_mid = [p for p in scraped if 2006 <= p["year"] < 2018]

    # For wc_new: merge existing 13-nation data with scraped, deduplicate
    # Scraped data takes priority for nations we now have from fifaindex;
    # keep existing rows for nations not in scrape result.
    scraped_new_key = {(p["nation"], p["year"]) for p in scraped_new}
    kept_existing_new = [p for p in existing_new
                         if (p["nation"], p["year"]) not in scraped_new_key]
    final_new = scraped_new + kept_existing_new

    # For wc_old: replace 2006-2014 with scraped, keep 1986-2002
    final_old = keep_old + scraped_mid

    json.dump(final_new, open(new_path, "w"), ensure_ascii=False, separators=(",", ":"))
    json.dump(final_old, open(old_path, "w"), ensure_ascii=False, separators=(",", ":"))

    print(f"players_wc_new.json: {len(final_new)} players "
          f"({len(scraped_new)} scraped + {len(kept_existing_new)} kept)")
    print(f"players_wc_old.json: {len(final_old)} players "
          f"({len(keep_old)} kept 1986-2002 + {len(scraped_mid)} scraped 2006-2014)")

# ──────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────
async def main():
    args = sys.argv[1:]
    do_phase1 = "--phase2" not in args
    do_phase2 = "--phase1" not in args
    year_args = [int(a) for a in args if a.isdigit()]
    wc_years = year_args or list(WC_MAP.keys())
    print(f"WC years: {wc_years}", flush=True)

    async with Stealth().use_async(async_playwright()) as ap:
        b = await ap.chromium.launch(
            executable_path="/usr/bin/chromium", headless=False,
            args=["--no-sandbox","--disable-dev-shm-usage",
                  "--disable-blink-features=AutomationControlled"])

        if do_phase1:
            print("=== Phase 1: team pages ===", flush=True)
            players = await phase1(b, wc_years)
            json.dump(players, open(URL_CACHE, "w"), ensure_ascii=False)
            print(f"Phase 1 done — {len(players)} players → {URL_CACHE}", flush=True)
        else:
            players = json.load(open(URL_CACHE))
            # Filter to requested years if specified
            if year_args:
                players = [p for p in players if p["year"] in year_args]
            print(f"Phase 1 skipped — {len(players)} players from cache", flush=True)

        if do_phase2:
            print("=== Phase 2: individual stats ===", flush=True)
            stat_results = await phase2(b, players)
            updated = []
            hit = miss = 0
            for player, stats in zip(players, stat_results):
                p = {k: v for k, v in player.items() if not k.startswith("_")}
                if stats and len(stats) == 6:
                    p.update(stats)
                    hit += 1
                else:
                    p.update(derive_stats(p["name"], p["positions"][0], p["overall"]))
                    miss += 1
                updated.append(p)
            print(f"Real stats: {hit}  Archetype fallback: {miss}", flush=True)

            merge_into_files(updated)
            print("Done.", flush=True)

if __name__ == "__main__":
    asyncio.run(main())
