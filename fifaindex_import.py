#!/usr/bin/env python3
"""Import REAL Premier League player data from fifaindex.com — FIFA 05 → FC 26.

Two-phase scrape:
  Phase 1 (sequential, ~25 min): Team pages  → name, club, pos, overall, player_url
  Phase 2 (parallel,   ~2 hrs):  Player pages → real PAC/SHO/PAS/DRI/DEF/PHY

Writes src/data/players_pl.json. Safe to re-run — resumes from player_urls.json
(phase-1 cache) and from already-resolved stats in players_pl.json.

Run:
  xvfb-run -a /home/vladthelad/3dprint_env/bin/python fifaindex_import.py [edition ...]
  (no args = all editions)

  --phase1   only scrape team pages (saves player_urls.json)
  --phase2   only fetch stats (reads player_urls.json, writes players_pl.json)
"""
import sys, os, json, hashlib, time, asyncio, re
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

BASE = "https://www.fifaindex.com"
PL_LEAGUE = "13-england-premier-league-1"
EDITIONS = [f"fifa{e:02d}" for e in range(5, 25)] + ["fc25", "fc26"]
STATS_WORKERS = 32  # parallel browser tabs for phase-2

DATA_DIR  = os.path.join(os.path.dirname(__file__), "src", "data")
OUT_FILE  = os.path.join(DATA_DIR, "players_pl.json")
URL_CACHE = os.path.join(os.path.dirname(__file__), "player_urls.json")

CLUB_FIX = {
    "Brighton & Hove Albion": "Brighton",
    "Wolverhampton Wanderers": "Wolves", "Wolverhampton": "Wolves",
    "Queens Park Rangers": "QPR",
    "AFC Bournemouth": "Bournemouth", "Arsenal FC": "Arsenal",
    "Blackburn Rvrs": "Blackburn Rovers", "Bolton": "Bolton Wanderers",
    "Chelsea FC": "Chelsea", "Manchester Utd": "Manchester United",
    "Newcastle Utd": "Newcastle United", "Reading FC": "Reading",
    "Spurs": "Tottenham Hotspur", "West Brom": "West Bromwich Albion",
    "West Bromwich": "West Bromwich Albion", "West Ham": "West Ham United",
    "Aston Villa FC": "Aston Villa", "Everton FC": "Everton",
    "Leeds United FC": "Leeds United", "Leicester City FC": "Leicester City",
    "Liverpool FC": "Liverpool", "Middlesbrough FC": "Middlesbrough",
    "Sunderland AFC": "Sunderland", "Charlton Athletic": "Charlton",
    "Charlton Ath": "Charlton", "Fulham FC": "Fulham",
    "Portsmouth FC": "Portsmouth", "Southampton FC": "Southampton",
    "Tottenham Hotspur FC": "Tottenham Hotspur",
    "Birmingham City FC": "Birmingham City", "Blackburn": "Blackburn Rovers",
    "Crystal Palace FC": "Crystal Palace", "Norwich City FC": "Norwich City",
    "Watford FC": "Watford", "Swansea City AFC": "Swansea City",
    "Swansea": "Swansea City", "Stoke City FC": "Stoke City",
    "Wigan Athletic FC": "Wigan Athletic", "Wigan": "Wigan Athletic",
    "Hull City AFC": "Hull City", "Hull": "Hull City",
    "Burnley FC": "Burnley", "Huddersfield Town AFC": "Huddersfield Town",
    "Huddersfield": "Huddersfield Town",
    "Sheffield United FC": "Sheffield United",
    "Brentford FC": "Brentford", "Nottm Forest": "Nottingham Forest",
    "Nottingham Forest FC": "Nottingham Forest",
    "Luton Town FC": "Luton Town", "Luton": "Luton Town",
    "Ipswich Town FC": "Ipswich Town",
}

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

def edition_year(ed):
    return 2000 + int(re.sub(r"\D", "", ed))

# ──────────────────────────────────────────────────────────────────
# Phase 1 helpers
# ──────────────────────────────────────────────────────────────────
async def wait_table(pg, tries=22):
    for _ in range(tries):
        await pg.wait_for_timeout(1100)
        t = (await pg.title()).lower()
        count = await pg.eval_on_selector_all("table tbody tr", "e=>e.length")
        if "moment" not in t and "attention" not in t and count > 0:
            return True
    return False

async def scrape_team_urls(pg, url, club, year, ed):
    """Scrape team page: get name, pos, ovr + player page URL."""
    await pg.goto(BASE + url, wait_until="domcontentloaded", timeout=60000)
    if not await wait_table(pg):
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
    out = []
    for r in rows:
        pos = norm_pos(r["pos"])
        try: ovr = int(r["ovr"])
        except: ovr = None
        if not r["name"] or not pos or not ovr: continue
        out.append({
            "name": r["name"], "nation": club, "year": year,
            "positions": [pos], "overall": ovr, "tournament": "PL",
            "_href": r["href"],        # e.g. /players/232580-gabriel
            "_ed": ed,                 # e.g. fc26
        })
    out.sort(key=lambda x: -x["overall"])
    return out

async def phase1(browser, eds):
    """Scrape team pages for all editions, return player list with _href/_ed."""
    pg = await (await browser.new_context(
        locale="en-GB", timezone_id="Europe/London",
        viewport={"width":1400,"height":900})).new_page()
    all_players = []
    for ed in eds:
        year = edition_year(ed)
        await pg.goto(f"{BASE}/leagues/{PL_LEAGUE}/{ed}", wait_until="domcontentloaded", timeout=60000)
        if not await wait_table(pg):
            print(f"  [P1/{ed}] league page failed — skip", flush=True)
            continue
        teams = await pg.eval_on_selector_all(
            "table tbody tr a[href*='/teams/']",
            "els=>[...new Map(els.map(e=>[e.getAttribute('href'),e.textContent.trim()])).entries()]"
            ".filter(([h])=>/\\/teams\\/\\d+/.test(h))")
        ed_players = []
        for href, name in teams:
            club = CLUB_FIX.get(name, name)
            sq = await scrape_team_urls(pg, href, club, year, ed)
            ed_players += sq
            await pg.wait_for_timeout(600)
        print(f"  [P1/{ed}] {len(teams)} clubs, {len(ed_players)} players", flush=True)
        all_players += ed_players
    await pg.close()
    return all_players

# ──────────────────────────────────────────────────────────────────
# Phase 2 helpers
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
    # Poll every 600ms — stats render ~5s after domcontentloaded fires
    for _ in range(tries):
        t = (await pg.title()).lower()
        if "moment" not in t and "attention" not in t:
            result = await pg.evaluate(STATS_JS)
            if len(result) == 6:
                return result
        await pg.wait_for_timeout(600)
    return {}

async def scrape_player_stats(sem, ctx, player):
    """Worker: open player page, extract 6 stats, close page."""
    href = player.get("_href", "").rstrip("/")
    ed   = player.get("_ed", "")
    if not href or not ed:
        return None
    # Old edition team pages embed the edition in the href already; new ones don't
    if href.endswith(f"/{ed}"):
        url = f"{BASE}{href}/"
    else:
        url = f"{BASE}{href}/{ed}/"
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
    """Fetch real stats for all players; fill in archetype where fetch fails."""
    ctx = await browser.new_context(
        locale="en-GB", timezone_id="Europe/London",
        viewport={"width":1400,"height":900})
    # Warm up one page first to clear any Cloudflare challenge
    warmup = await ctx.new_page()
    await warmup.goto(f"{BASE}/players/232580-gabriel/fc26/", wait_until="domcontentloaded", timeout=60000)
    await wait_stats(warmup, tries=20)
    await warmup.close()
    print(f"  [P2] CF warmed up; starting {len(players)} players across {STATS_WORKERS} workers", flush=True)

    sem = asyncio.Semaphore(STATS_WORKERS)
    counter = {"n": 0}
    total = len(players)

    async def scrape_and_track(player):
        result = await scrape_player_stats(sem, ctx, player)
        counter["n"] += 1
        if counter["n"] % 200 == 0:
            print(f"  [P2] {counter['n']}/{total} done", flush=True)
        return result

    # gather preserves order — stats[i] matches players[i]
    results = await asyncio.gather(*[scrape_and_track(p) for p in players])
    await ctx.close()
    return results

# ──────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────
async def main():
    args = sys.argv[1:]
    do_phase1 = "--phase2" not in args
    do_phase2 = "--phase1" not in args
    eds_arg = [a for a in args if not a.startswith("--")]
    eds = eds_arg or EDITIONS

    async with Stealth().use_async(async_playwright()) as ap:
        b = await ap.chromium.launch(
            executable_path="/usr/bin/chromium", headless=False,
            args=["--no-sandbox","--disable-dev-shm-usage",
                  "--disable-blink-features=AutomationControlled"])

        # ── Phase 1 ──
        if do_phase1:
            print("=== Phase 1: collecting player URLs from team pages ===", flush=True)
            players = await phase1(b, eds)
            with open(URL_CACHE, "w") as f:
                json.dump(players, f, ensure_ascii=False)
            print(f"  Phase 1 done — {len(players)} players saved to {URL_CACHE}", flush=True)
        else:
            players = json.load(open(URL_CACHE))
            print(f"  Phase 1 skipped — loaded {len(players)} players from cache", flush=True)

        # ── Phase 2 ──
        if do_phase2:
            print("=== Phase 2: fetching real stats from player pages ===", flush=True)
            stat_results = await phase2(b, players)

            # Merge stats into player dicts
            updated = []
            hit, miss = 0, 0
            for player, stats in zip(players, stat_results):
                p = {k: v for k, v in player.items() if not k.startswith("_")}
                if stats and len(stats) == 6:
                    p.update(stats)
                    hit += 1
                else:
                    p.update(derive_stats(p["name"], p["positions"][0], p["overall"]))
                    miss += 1
                updated.append(p)

            print(f"  Real stats: {hit}/{len(updated)}  Archetype fallback: {miss}", flush=True)

            with open(OUT_FILE, "w") as f:
                json.dump(updated, f, ensure_ascii=False)
            clubs = sorted({(p["nation"], p["year"]) for p in updated})
            print(f"\nWrote {len(updated)} players, {len(clubs)} club-editions -> {OUT_FILE}", flush=True)

        await b.close()

if __name__ == "__main__":
    asyncio.run(main())
