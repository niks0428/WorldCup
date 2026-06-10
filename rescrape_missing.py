#!/usr/bin/env python3
"""Re-scrape PL players whose stats are still archetype-derived.

Fixes two known issues from the original scrape:
  1. fifa24 edition: _href already contains /fc24 so the old URL builder wrongly
     appended /fifa24/ → pages 404'd → all 636 players fell back to derived.
  2. fifa05/06: fifaindex only shows 4 stats (SHO/PAS/DEF/PHY); old code required
     exactly 6, so all 933 players fell through. We now accept ≥4 stats and only
     update the attributes we actually got, leaving the rest at their archetype values.

Run:
  xvfb-run -a /home/vladthelad/3dprint_env/bin/python rescrape_missing.py

Reads:
  src/data/players_pl.json   current data (some derived)
  player_urls.json           phase-1 cache (_href + _ed per player)
Writes:
  src/data/players_pl.json   patched in-place
"""
import os, sys, json, hashlib, asyncio
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

BASE = "https://www.fifaindex.com"
STATS_WORKERS = 20   # parallel tabs — lower than original to reduce CF detection
DATA_DIR  = os.path.join(os.path.dirname(__file__), "src", "data")
OUT_FILE  = os.path.join(DATA_DIR, "players_pl.json")
URL_CACHE = os.path.join(os.path.dirname(__file__), "player_urls.json")

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

def is_derived(p):
    """True if every stat matches the archetype formula exactly."""
    pos = p["positions"][0]
    if pos not in ARCH:
        return False
    d = ARCH[pos]
    return all(p.get(ATTRS[i]) == clamp(p["overall"] + d[i] + jit(p["name"], ATTRS[i]))
               for i in range(6))

def build_url(href: str, ed: str) -> str:
    """Build the correct fifaindex player-edition URL.

    The href from phase-1 may or may not already end with the edition suffix.
    Fifaindex uses /fc24 for the FIFA 24 game (not /fifa24), so we must check
    against known aliases too.
    """
    href = href.rstrip("/")
    # Edition aliases: what fifaindex uses in the URL vs what we stored in _ed
    aliases = {"fifa24": "fc24"}
    url_ed = aliases.get(ed, ed)  # e.g. fifa24 → fc24
    # Already has the (possibly aliased) edition appended
    if href.endswith(f"/{url_ed}") or href.endswith(f"/{ed}"):
        return f"{BASE}{href}/"
    return f"{BASE}{href}/{url_ed}/"

STATS_JS = """()=>{
    const labels = ['PAC','SHO','PAS','DRI','DEF','PHY'];
    const out = {};
    document.querySelectorAll('*').forEach(el => {
        if (el.children.length !== 0) return;
        const t = (el.innerText || '').trim();
        if (!labels.includes(t) || t.toLowerCase() in out) return;
        const sib = el.previousElementSibling;
        if (sib) {
            const v = parseInt((sib.innerText || '').trim());
            if (!isNaN(v) && v > 0 && v <= 99) {
                out[t.toLowerCase()] = v;
                return;
            }
        }
        // Fallback: first child of parent may be the value
        const par = el.parentElement;
        if (par && par.firstElementChild && par.firstElementChild !== el) {
            const v = parseInt((par.firstElementChild.innerText || '').trim());
            if (!isNaN(v) && v > 0 && v <= 99) out[t.toLowerCase()] = v;
        }
    });
    return out;
}"""

async def wait_stats(pg, tries=30):
    for _ in range(tries):
        t = (await pg.title()).lower()
        if "moment" not in t and "attention" not in t:
            result = await pg.evaluate(STATS_JS)
            if len(result) >= 4:   # accept partial (fifa05/06 only show 4)
                return result
        await pg.wait_for_timeout(700)
    return {}

async def scrape_player(sem, ctx, player):
    href = player.get("_href", "")
    ed   = player.get("_ed", "")
    if not href or not ed:
        return None
    url = build_url(href, ed)
    async with sem:
        pg = await ctx.new_page()
        try:
            await pg.goto(url, wait_until="domcontentloaded", timeout=60000)
            stats = await wait_stats(pg)
            return stats if stats else None
        except Exception as e:
            print(f"    [err] {player['name']} {ed}: {e!r}", flush=True)
            return None
        finally:
            await pg.close()

async def main():
    current  = json.load(open(OUT_FILE))
    url_entries = json.load(open(URL_CACHE))

    url_map = {}
    for u in url_entries:
        key = (u["name"], u["year"])
        if key not in url_map:
            url_map[key] = u

    derived = [p for p in current if is_derived(p)]
    print(f"Derived: {len(derived)} / {len(current)} total", flush=True)

    to_scrape = []
    for p in derived:
        u = url_map.get((p["name"], p["year"]))
        if u and u.get("_href"):
            to_scrape.append(u)

    print(f"Matched {len(to_scrape)} to URL cache", flush=True)
    if not to_scrape:
        print("Nothing to do.")
        return

    # index: (name, year) → list index in current[]
    idx_map = {}
    for i, p in enumerate(current):
        idx_map[(p["name"], p["year"])] = i

    # sample URLs to verify fix
    print("Sample URLs:", flush=True)
    for u in to_scrape[:3]:
        print(f"  {u['name']} {u['year']} → {build_url(u['_href'], u['_ed'])}", flush=True)

    async with Stealth().use_async(async_playwright()) as ap:
        b = await ap.chromium.launch(
            executable_path="/usr/bin/chromium", headless=False,
            args=["--no-sandbox","--disable-dev-shm-usage",
                  "--disable-blink-features=AutomationControlled"])

        ctx = await b.new_context(
            locale="en-GB", timezone_id="Europe/London",
            viewport={"width":1400,"height":900})

        print("Warming up Cloudflare...", flush=True)
        warmup = await ctx.new_page()
        await warmup.goto(f"{BASE}/players/232580-gabriel/fc26/",
                          wait_until="domcontentloaded", timeout=60000)
        await wait_stats(warmup, tries=20)
        await warmup.close()
        print(f"  Warm. Scraping {len(to_scrape)} players ({STATS_WORKERS} workers)...", flush=True)

        sem = asyncio.Semaphore(STATS_WORKERS)
        counter = {"n": 0, "hits": 0, "partial": 0, "misses": 0}
        total = len(to_scrape)

        async def run(player):
            result = await scrape_player(sem, ctx, player)
            counter["n"] += 1
            if result:
                if len(result) == 6:
                    counter["hits"] += 1
                else:
                    counter["partial"] += 1
            else:
                counter["misses"] += 1
            if counter["n"] % 100 == 0:
                print(f"  {counter['n']}/{total}  full={counter['hits']}  "
                      f"partial={counter['partial']}  miss={counter['misses']}", flush=True)
            return result

        results = await asyncio.gather(*[run(p) for p in to_scrape])

        patched = 0
        for player, stats in zip(to_scrape, results):
            if stats:
                idx = idx_map.get((player["name"], player["year"]))
                if idx is not None:
                    current[idx].update(stats)   # only updates attrs present in stats
                    patched += 1

        print(f"\nPatched {patched} players. Full=6-stat hits={counter['hits']}, "
              f"partial(4-5 stat)={counter['partial']}", flush=True)

        with open(OUT_FILE, "w") as f:
            json.dump(current, f, ensure_ascii=False)
        print(f"Saved {len(current)} players → {OUT_FILE}", flush=True)

        await ctx.close()
        await b.close()

if __name__ == "__main__":
    asyncio.run(main())
