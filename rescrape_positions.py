#!/usr/bin/env python3
"""Re-verify every player's primary position from their individual fifaindex page.

The team-page scraper sometimes stored a variant position (e.g. LDM instead of CDM,
or a secondary position badge instead of the primary). This script loads each player's
own page and reads the FIRST position badge, which is always the primary.

Reads:
  src/data/players_pl.json   current player data
  player_urls.json           phase-1 URL cache (_href + _ed per player)
Writes:
  src/data/players_pl.json   positions corrected in-place
  position_changes.json      log of every change made

Run:
  xvfb-run -a /home/vladthelad/3dprint_env/bin/python rescrape_positions.py
"""
import os, sys, json, asyncio, re
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

BASE = "https://www.fifaindex.com"
WORKERS = 28
DATA_DIR = os.path.join(os.path.dirname(__file__), "src", "data")
OUT_FILE = os.path.join(DATA_DIR, "players_pl.json")
URL_CACHE = os.path.join(os.path.dirname(__file__), "player_urls.json")
CHANGES_FILE = os.path.join(os.path.dirname(__file__), "position_changes.json")

# Edition aliases: _ed value → URL suffix fifaindex actually uses
ED_ALIAS = {"fifa24": "fc24"}

VALID_POS = {'GK','CB','RB','LB','RWB','LWB','CDM','CM','CAM','RM','LM','RW','LW','ST'}

def norm(p):
    p = (p or "").upper().strip()
    if p in ("RCB","LCB","CB"):    return "CB"
    if p == "RB":                  return "RB"
    if p == "LB":                  return "LB"
    if p == "RWB":                 return "RWB"
    if p == "LWB":                 return "LWB"
    if p in ("RDM","LDM","CDM"):   return "CDM"
    if p in ("RCM","LCM","CM"):    return "CM"
    if p in ("CAM","RAM","LAM"):   return "CAM"
    if p == "RM":                  return "RM"
    if p == "LM":                  return "LM"
    if p in ("RW","RF"):           return "RW"
    if p in ("LW","LF"):           return "LW"
    if p in ("ST","CF","RS","LS"): return "ST"
    if p == "GK":                  return "GK"
    return None

def build_url(href: str, ed: str) -> str:
    href = href.rstrip("/")
    url_ed = ED_ALIAS.get(ed, ed)
    if href.endswith(f"/{url_ed}") or href.endswith(f"/{ed}"):
        return f"{BASE}{href}/"
    return f"{BASE}{href}/{url_ed}/"

# JS that reads the FIRST position badge on the player page
POS_JS = """()=>{
    const badges = [...document.querySelectorAll('span.rounded.bg-secondary')];
    const pos = badges.map(b=>b.innerText.trim()).filter(t=>/^[A-Z]{2,3}$/.test(t));
    return pos[0] || '';
}"""

async def fetch_pos(sem, ctx, player):
    href = player.get("_href","")
    ed   = player.get("_ed","")
    if not href or not ed:
        return None
    url = build_url(href, ed)
    async with sem:
        pg = await ctx.new_page()
        try:
            await pg.goto(url, wait_until="domcontentloaded", timeout=60000)
            for _ in range(20):
                t = (await pg.title()).lower()
                if "moment" not in t and "attention" not in t:
                    raw = await pg.evaluate(POS_JS)
                    if raw:
                        return norm(raw)
                await pg.wait_for_timeout(600)
            return None
        except:
            return None
        finally:
            await pg.close()

async def main():
    current   = json.load(open(OUT_FILE))
    url_cache = json.load(open(URL_CACHE))

    url_map = {}
    for u in url_cache:
        key = (u["name"], u["year"])
        if key not in url_map:
            url_map[key] = u

    # Build index: (name, year) → list of indices (some names appear at multiple clubs)
    idx_map = {}
    for i, p in enumerate(current):
        idx_map[(p["name"], p["year"])] = i

    # Build scrape list — one entry per unique (name, year) that has a URL
    to_scrape = [u for u in url_cache
                 if (u["name"], u["year"]) in idx_map and u.get("_href")]

    # Deduplicate by (name, year) — keep first URL (matches idx_map behaviour)
    seen = set()
    unique = []
    for u in to_scrape:
        k = (u["name"], u["year"])
        if k not in seen:
            seen.add(k)
            unique.append(u)
    to_scrape = unique

    print(f"Players to verify: {len(to_scrape)}", flush=True)

    async with Stealth().use_async(async_playwright()) as ap:
        b = await ap.chromium.launch(
            executable_path="/usr/bin/chromium", headless=False,
            args=["--no-sandbox","--disable-dev-shm-usage",
                  "--disable-blink-features=AutomationControlled"])
        ctx = await b.new_context(
            locale="en-GB", timezone_id="Europe/London",
            viewport={"width":1400,"height":900})

        print("Warming up...", flush=True)
        wp = await ctx.new_page()
        await wp.goto(f"{BASE}/players/232580-gabriel/fc26/",
                      wait_until="domcontentloaded", timeout=60000)
        for _ in range(15):
            await wp.wait_for_timeout(700)
            t = (await wp.title()).lower()
            if "moment" not in t and "attention" not in t:
                r = await wp.evaluate(POS_JS)
                if r: break
        await wp.close()
        print(f"  Warm. Scraping {len(to_scrape)} player pages...", flush=True)

        sem = asyncio.Semaphore(WORKERS)
        counter = {"n":0, "changed":0, "null":0}
        changes = []

        async def run(player):
            new_pos = await fetch_pos(sem, ctx, player)
            counter["n"] += 1
            key = (player["name"], player["year"])
            idx = idx_map.get(key)
            if idx is None:
                return
            if new_pos is None:
                counter["null"] += 1
                return
            old_pos = current[idx]["positions"][0]
            if new_pos != old_pos:
                changes.append({
                    "name": player["name"], "year": player["year"],
                    "club": current[idx]["nation"],
                    "old": old_pos, "new": new_pos
                })
                current[idx]["positions"] = [new_pos]
                counter["changed"] += 1
            if counter["n"] % 500 == 0:
                print(f"  {counter['n']}/{len(to_scrape)}  changed={counter['changed']}  null={counter['null']}", flush=True)

        await asyncio.gather(*[run(p) for p in to_scrape])

        print(f"\nDone. {counter['changed']} positions updated, {counter['null']} pages failed", flush=True)
        print("Sample changes:")
        for c in sorted(changes, key=lambda x: -x["year"])[:20]:
            print(f"  {c['name']:30} {c['year']} {c['club']:25} {c['old']:4} → {c['new']}")

        with open(OUT_FILE, "w") as f:
            json.dump(current, f, ensure_ascii=False)
        with open(CHANGES_FILE, "w") as f:
            json.dump(changes, f, ensure_ascii=False, indent=2)
        print(f"\nSaved {len(current)} players → {OUT_FILE}")
        print(f"Full change log → {CHANGES_FILE}  ({len(changes)} entries)")

        await ctx.close()
        await b.close()

if __name__ == "__main__":
    asyncio.run(main())
