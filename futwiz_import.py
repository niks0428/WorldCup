#!/usr/bin/env python3
"""Import Premier League player data with real FIFA stats from futwiz.com.

Covers FIFA 15–21 (editions unavailable on futbin).
Uses Non-Inform Gold + Rare Gold + Common Gold filters to get base standard cards.
Real pac/sho/pas/dri/def/phy values — futwiz shows them directly in the table.

DOM layout (confirmed via probe):
  Skip row 0 (header)
  td[1] cls='player'  → first <a> = player name, second <a> = club name
  td[2] cls='ovr'     → overall rating
  td[3]               → position
  td[5..10] cls='statCol' → "PAC\\n95" etc. (6 stats in order)

Run:
  xvfb-run -a /home/vladthelad/3dprint_env/bin/python futwiz_import.py [15 16 17 ...]
  (no args = FIFA 15–21)
"""
import sys, os, json, time
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

BASE = "https://www.futwiz.com"
DST  = os.path.join(os.path.dirname(__file__), "src", "data", "players_pl.json")

# Editions to cover — the gap futbin can't fill.
# futwiz has 10–21; we default to 15–21 (07-14 keep fifaindex derived stats).
DEFAULT_EDITIONS = list(range(15, 22))

CLUB_FIX = {
    "Brighton & Hove Albion": "Brighton",
    "Wolverhampton Wanderers": "Wolves",
    "Queens Park Rangers": "QPR",
    "AFC Bournemouth": "Bournemouth",
    "Arsenal FC": "Arsenal",
    "Chelsea FC": "Chelsea",
    "Manchester Utd": "Manchester United",
    "Newcastle Utd": "Newcastle United",
    "Reading FC": "Reading",
    "Spurs": "Tottenham Hotspur",
    "West Brom": "West Bromwich Albion",
    "West Bromwich Albion": "West Bromwich Albion",
    "West Ham": "West Ham United",
    "Tottenham": "Tottenham Hotspur",
    "Leicester": "Leicester City",
    "Norwich": "Norwich City",
    "Sheffield Utd": "Sheffield United",
    "Nott'm Forest": "Nottingham Forest",
    "Hull": "Hull City",
    "Stoke": "Stoke City",
    "Swansea": "Swansea City",
    "Sunderland AFC": "Sunderland",
    "Middlesbrough": "Middlesbrough",
    "Huddersfield": "Huddersfield Town",
    "Cardiff": "Cardiff City",
    "Burnley FC": "Burnley",
}

def norm_pos(p):
    p = (p or "").upper().strip()
    if p in ("RCB","LCB","CB"):  return "CB"
    if p == "RB":                return "RB"
    if p == "LB":                return "LB"
    if p == "RWB":               return "RWB"
    if p == "LWB":               return "LWB"
    if p in ("RDM","LDM","CDM"): return "CDM"
    if p in ("RCM","LCM","CM"):  return "CM"
    if p in ("CAM","RAM","LAM"): return "CAM"
    if p == "RM":                return "RM"
    if p == "LM":                return "LM"
    if p in ("RW","RF"):         return "RW"
    if p in ("LW","LF"):         return "LW"
    if p in ("ST","CF","RS","LS","SS"): return "ST"
    if p == "GK":                return "GK"
    return None

# Extracts player rows from futwiz table. Skips the header row (no td.ovr link).
ROW_JS = """rows => rows
  .filter(r => r.querySelector('td.ovr a'))
  .map(r => {
    const playerTd = r.querySelector('td.player');
    const links = [...(playerTd?.querySelectorAll('a') || [])];
    const name = links[0]?.textContent?.trim() || '';
    // Club link has href containing /club/
    const clubLink = links.find(a => (a.getAttribute('href') || '').includes('/club/'));
    const club = clubLink?.textContent?.trim() || '';

    const ovr = parseInt(r.querySelector('td.ovr')?.textContent || '0') || 0;
    const pos = r.querySelectorAll('td')[3]?.textContent?.trim() || '';

    // statCol cells: inner text is "PAC\\n95" — take the last line (the number)
    const statCols = [...r.querySelectorAll('td.statCol')];
    const stat = i => {
      const lines = (statCols[i]?.innerText || '').trim().split('\\n');
      return parseInt(lines[lines.length - 1]) || 0;
    };
    return {
      name, club, ovr, pos,
      pac: stat(0), sho: stat(1), pas: stat(2),
      dri: stat(3), def: stat(4), phy: stat(5),
    };
  })"""

def wait_clear(pg, tries=22):
    for _ in range(tries):
        pg.wait_for_timeout(1400)
        t = pg.title().lower()
        if "moment" not in t and "attention" not in t and "cloudflare" not in t:
            return True
    return False

def row_count(pg):
    return pg.eval_on_selector_all("table tbody tr", "e=>e.length")

def scrape_edition(pg, ver):
    year = 2000 + ver
    players = {}  # (name, club) → record, keep LOWEST overall (base < special)

    # nifgold = Non-Inform Gold (base standard gold cards, no TOTW/promo).
    # raregold + commongold covers the same set split by tier.
    # We try nifgold first; if it returns < 5 player rows fall back to all gold
    # and deduplicate by keeping lowest OVR (which is always the base card).
    releases = ["nifgold"]
    page0_url = f"{BASE}/fifa{ver}/players?page=0&leagues[]=13&release=nifgold"
    pg.goto(page0_url, wait_until="domcontentloaded", timeout=60000)
    wait_clear(pg)
    rows_test = pg.eval_on_selector_all("table tbody tr.player-row, table tbody tr", "e=>e.length")
    if rows_test < 5:
        print(f"  [FIFA{ver}] nifgold gave {rows_test} rows — falling back to all gold", flush=True)
        releases = ["raregold", "commongold"]

    keep_lowest = (releases == ["raregold", "commongold"] or releases == ["nifgold"])

    for release in releases:
        page = 0
        while True:
            url = f"{BASE}/fifa{ver}/players?page={page}&leagues[]=13&release={release}"
            pg.goto(url, wait_until="domcontentloaded", timeout=60000)
            if not wait_clear(pg):
                break

            n_rows = row_count(pg)
            if n_rows <= 1:   # only header row = no more data
                break

            rows = pg.eval_on_selector_all("table tbody tr", ROW_JS)
            if not rows:
                break

            added = 0
            for r in rows:
                name  = r["name"].strip()
                club  = CLUB_FIX.get(r["club"].strip(), r["club"].strip())
                ovr   = r["ovr"]
                pos   = norm_pos(r["pos"])

                if not name or not club or not pos or not (50 <= ovr <= 99):
                    continue

                key = (name, club)
                # Base card = lowest OVR for the same player.  Special cards always
                # have higher OVR, so keeping the minimum gives us the base rating.
                existing = players.get(key)
                if existing is None or ovr < existing["overall"]:
                    players[key] = {
                        "name": name, "nation": club,
                        "year": year, "positions": [pos], "overall": ovr,
                        "pac": r["pac"], "sho": r["sho"], "pas": r["pas"],
                        "dri": r["dri"], "def": r["def"], "phy": r["phy"],
                        "tournament": "PL",
                    }
                    added += 1

            print(f"  [FIFA{ver}/{release}] p{page} — {len(rows)} rows, {added} new/updated", flush=True)

            if n_rows < 26:   # partial last page
                break
            page += 1
            time.sleep(0.4)

    result = list(players.values())
    result.sort(key=lambda x: (-x["overall"], x["name"]))
    clubs = {p["nation"] for p in result}
    print(f"  [FIFA{ver}] Total: {len(result)} players from {len(clubs)} clubs", flush=True)
    return result

def main():
    editions = [int(v) for v in sys.argv[1:]] if sys.argv[1:] else DEFAULT_EDITIONS

    scrape_years = {2000 + v for v in editions}
    base = []
    if os.path.exists(DST):
        try:
            existing = json.load(open(DST))
            base = [p for p in existing if p.get("year") not in scrape_years]
            print(f"Keeping {len(base)} players from non-scraped editions", flush=True)
        except Exception:
            base = []

    all_new = []
    with Stealth().use_sync(sync_playwright()) as p:
        b = p.chromium.launch(
            executable_path="/usr/bin/chromium", headless=False,
            args=["--no-sandbox","--disable-dev-shm-usage",
                  "--disable-blink-features=AutomationControlled"],
        )
        ctx = b.new_context(locale="en-GB", timezone_id="Europe/London",
                            viewport={"width":1400,"height":900})
        pg = ctx.new_page()

        for ver in editions:
            print(f"\nScraping FIFA {ver}…", flush=True)
            try:
                ep = scrape_edition(pg, ver)
                all_new += ep
            except Exception as e:
                print(f"  [FIFA{ver}] ERROR: {e!r}", flush=True)

            if all_new:
                merged = base + all_new
                with open(DST, "w", encoding="utf-8") as f:
                    json.dump(merged, f, ensure_ascii=False, separators=(',', ':'))
                print(f"  → saved {len(merged)} total players", flush=True)

        b.close()

    merged = base + all_new
    with open(DST, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, separators=(',', ':'))

    clubs = sorted({(p["nation"], p["year"]) for p in merged})
    print(f"\n✓ Wrote {len(merged)} players, {len(clubs)} club-editions → {DST}", flush=True)

if __name__ == "__main__":
    main()
