#!/usr/bin/env python3
"""Import Premier League player data with real FIFA stats from futbin.com.

Scrapes standard gold-rare cards for all PL clubs across FIFA 22–FC 25.
Real pac/sho/pas/dri/def/phy values — no archetype derivation.

DOM layout (confirmed via probe):
  td[0]  table-name  → line 1 = rating, line 2 = name, line 3 = card type
                        img[alt='Club'].title = club name
  td[1]  table-rating
  td[2]  table-pos   → "CDM++\nCM" → strip ++ → take first line
  td[8]  table-pace
  td[9]  table-shooting
  td[10] table-passing
  td[11] table-dribbling
  td[12] table-defending
  td[13] table-physicality

Run:
  xvfb-run -a /home/vladthelad/3dprint_env/bin/python futbin_import.py [22 23 24 25]
  (no args = all supported editions)
"""
import sys, os, json, time
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

BASE     = "https://www.futbin.com"
DST      = os.path.join(os.path.dirname(__file__), "src", "data", "players_pl.json")

# Only editions confirmed working with real PL squad data.
# version=gold_rare gives us base standard cards (not promo/TOTW/specials).
EDITIONS = [22, 23, 24, 25]

CLUB_FIX = {
    "Brighton & Hove Albion": "Brighton",
    "Wolverhampton Wanderers": "Wolves", "Wolverhampton": "Wolves",
    "Queens Park Rangers": "QPR",
    "AFC Bournemouth": "Bournemouth",
    "Arsenal FC": "Arsenal",
    "Blackburn Rvrs": "Blackburn Rovers",
    "Bolton": "Bolton Wanderers",
    "Chelsea FC": "Chelsea",
    "Manchester Utd": "Manchester United",
    "Newcastle Utd": "Newcastle United",
    "Reading FC": "Reading",
    "Spurs": "Tottenham Hotspur",
    "West Brom": "West Bromwich Albion",
    "West Bromwich": "West Bromwich Albion",
    "West Ham": "West Ham United",
    "Tottenham": "Tottenham Hotspur",
    "Leicester": "Leicester City",
    "Norwich": "Norwich City",
    "Sheffield Utd": "Sheffield United",
    "Nott'm Forest": "Nottingham Forest",
    "Nott'm Forrest": "Nottingham Forest",
    "Crystal Palace FC": "Crystal Palace",
}

def norm_pos(p):
    p = (p or "").upper().strip()
    # Strip role markers: CDM++ → CDM, CM+ → CM
    p = p.split('\n')[0].rstrip('+').strip()
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

# JS extractor — uses CSS class selectors so column order changes across editions
# don't break anything. All stat cells have stable class names in every version.
ROW_JS = """rows => rows.map(r => {
    // Name: second non-empty line of td.table-name inner text
    // ("91\\nRodri\\nNormal" → "Rodri")
    const nameCell = r.querySelector('td.table-name');
    const lines = (nameCell?.innerText || '').trim().split('\\n')
        .map(s=>s.trim()).filter(Boolean);
    const name = lines.length > 1 ? lines[1] : '';

    // Club: first img[alt='Club'] inside td.table-name; title = club name
    const clubImg = nameCell?.querySelector('img[alt="Club"]');
    const club = clubImg ? (clubImg.title || '') : '';

    const num = sel => parseInt(r.querySelector(sel)?.innerText || '0') || 0;

    const ovr    = num('td.table-rating');
    const posRaw = (r.querySelector('td.table-pos')?.innerText || '').trim().split('\\n')[0].trim();
    const pac    = num('td.table-pace');
    const sho    = num('td.table-shooting');
    const pas    = num('td.table-passing');
    const dri    = num('td.table-dribbling');
    const def    = num('td.table-defending');
    const phy    = num('td.table-physicality');

    return {name, club, ovr, posRaw, pac, sho, pas, dri, def, phy};
}).filter(x => x !== null)"""

def wait_for_rows(pg, tries=22):
    for _ in range(tries):
        pg.wait_for_timeout(1200)
        title = pg.title().lower()
        if "moment" not in title and "attention" not in title:
            count = pg.eval_on_selector_all("table tbody tr.player-row", "e=>e.length")
            if count > 0:
                return True
    return False

def scrape_edition(pg, ver):
    year = 2000 + ver
    players = {}  # (name, club) → record  — dedup, keep highest overall

    # Scrape gold_rare (OVR 75+) then gold_nr (OVR 65–74) to capture full squads.
    for card_version in ("gold_rare", "gold_nr"):
        page = 1
        while True:
            url = (f"{BASE}/{ver}/players"
                   f"?league=13&version={card_version}&order=desc&sort=ovr&page={page}")
            pg.goto(url, wait_until="domcontentloaded", timeout=60000)

            has_rows = wait_for_rows(pg)
            if not has_rows:
                if page == 1:
                    print(f"  [FC{ver}/{card_version}] p{page} — no rows", flush=True)
                break

            rows = pg.eval_on_selector_all("table tbody tr.player-row", ROW_JS)
            if not rows:
                break

            added = 0
            for r in rows:
                name    = r["name"].strip()
                club    = CLUB_FIX.get(r["club"].strip(), r["club"].strip())
                ovr     = r["ovr"]
                pos     = norm_pos(r["posRaw"])

                if not name or not club or not pos or not (50 <= ovr <= 99):
                    continue

                key = (name, club)
                if key not in players or players[key]["overall"] < ovr:
                    players[key] = {
                        "name": name, "nation": club,
                        "year": year, "positions": [pos], "overall": ovr,
                        "pac": r["pac"], "sho": r["sho"], "pas": r["pas"],
                        "dri": r["dri"], "def": r["def"], "phy": r["phy"],
                        "tournament": "PL",
                    }
                    added += 1

            print(f"  [FC{ver}/{card_version}] p{page} — {len(rows)} rows, {added} new", flush=True)

            if len(rows) < 30:
                break
            page += 1
            time.sleep(0.5)

    result = list(players.values())
    result.sort(key=lambda x: (-x["overall"], x["name"]))
    print(f"  [FC{ver}] Total: {len(result)} players from {len({p['nation'] for p in result})} clubs", flush=True)
    return result

def main():
    versions = [int(v) for v in sys.argv[1:]] if sys.argv[1:] else EDITIONS

    # Load existing file; keep editions we're NOT re-scraping.
    scrape_years = {2000 + v for v in versions}
    base = []
    if os.path.exists(DST):
        try:
            existing = json.load(open(DST))
            base = [p for p in existing if p.get("year") not in scrape_years and p.get("year", 0) >= 2015]
            print(f"Keeping {len(base)} players from non-scraped editions", flush=True)
        except Exception:
            base = []

    all_new = []
    with Stealth().use_sync(sync_playwright()) as p:
        b = p.chromium.launch(
            executable_path="/usr/bin/chromium",
            headless=False,
            args=["--no-sandbox","--disable-dev-shm-usage",
                  "--disable-blink-features=AutomationControlled"],
        )
        ctx = b.new_context(locale="en-GB", timezone_id="Europe/London",
                            viewport={"width":1400,"height":900})
        pg = ctx.new_page()

        for ver in versions:
            print(f"\nScraping FIFA {ver}…", flush=True)
            try:
                edition_players = scrape_edition(pg, ver)
                all_new += edition_players
            except Exception as e:
                print(f"  [FC{ver}] ERROR: {e!r}", flush=True)

            # Save after every edition so progress survives an interruption.
            if all_new:
                merged = base + all_new
                with open(DST, "w", encoding="utf-8") as f:
                    json.dump(merged, f, ensure_ascii=False, separators=(',', ':'))
                print(f"  → saved {len(merged)} total players to {DST}", flush=True)

        b.close()

    merged = base + all_new
    with open(DST, "w", encoding="utf-8") as f:
        json.dump(merged, f, ensure_ascii=False, separators=(',', ':'))

    clubs = sorted({(p["nation"], p["year"]) for p in merged})
    print(f"\n✓ Wrote {len(merged)} players, {len(clubs)} club-editions → {DST}", flush=True)

if __name__ == "__main__":
    main()
