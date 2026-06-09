#!/usr/bin/env python3
"""Probe futwiz PL player pages — URL structure, filters, DOM layout.
Run: xvfb-run -a /home/vladthelad/3dprint_env/bin/python futwiz_probe2.py
"""
import json
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

BASE = "https://www.futwiz.com"

def wait_clear(pg, tries=20):
    for _ in range(tries):
        pg.wait_for_timeout(1400)
        t = pg.title().lower()
        if "moment" not in t and "attention" not in t and "cloudflare" not in t:
            return True
    return False

def probe():
    with Stealth().use_sync(sync_playwright()) as p:
        b = p.chromium.launch(
            executable_path="/usr/bin/chromium", headless=False,
            args=["--no-sandbox","--disable-dev-shm-usage",
                  "--disable-blink-features=AutomationControlled"],
        )
        pg = b.new_context(locale="en-GB", timezone_id="Europe/London",
                           viewport={"width":1400,"height":900}).new_page()

        # Try different PL filter URL formats for FIFA 21
        test_urls = [
            f"{BASE}/en/fifa21/players?league=13",
            f"{BASE}/en/fifa21/players?league=English+Premier+League",
            f"{BASE}/en/fifa21/players?leagueid=13",
            f"{BASE}/en/fifa21/players?filter=league&league=Premier+League",
        ]
        print("=== Testing PL filter URLs for FIFA 21 ===", flush=True)
        for url in test_urls:
            pg.goto(url, wait_until="domcontentloaded", timeout=30000)
            wait_clear(pg)
            t = pg.title()
            # Count any player-like rows
            for sel in [".player-card","tr.player","div.player",".players-list li","table tr"]:
                try:
                    c = pg.eval_on_selector_all(sel,"e=>e.length")
                    if c > 3:
                        print(f"  {url}\n    → title={t!r}  sel={sel!r} count={c}", flush=True)
                        break
                except: pass
            else:
                print(f"  {url}\n    → title={t!r}  (no rows found)", flush=True)

        # Now look at the FIFA 21 players page without filter to understand structure
        print("\n=== FIFA 21 base players page structure ===", flush=True)
        pg.goto(f"{BASE}/en/fifa21/players", wait_until="domcontentloaded", timeout=60000)
        wait_clear(pg)
        print(f"Title: {pg.title()}", flush=True)
        print(f"URL: {pg.url}", flush=True)

        # Dump first 2000 chars of body to understand layout
        body = pg.inner_text("body")[:2000]
        print(f"\nBody snippet:\n{body}", flush=True)

        # Check what filter options exist on the page
        try:
            filters = pg.eval_on_selector_all(
                "select option, input[type=text], [class*='filter']",
                "els => els.slice(0,20).map(e=>({tag:e.tagName,cls:e.className,val:e.value||e.textContent.trim().slice(0,40)}))"
            )
            print(f"\nFilter elements: {json.dumps(filters, indent=2)}", flush=True)
        except Exception as e:
            print(f"Filters: {e}", flush=True)

        # Check any links/forms related to league filtering
        try:
            league_links = pg.eval_on_selector_all(
                "a[href*='league'], a[href*='premier']",
                "els=>els.slice(0,10).map(e=>({href:e.href,txt:e.textContent.trim().slice(0,40)}))"
            )
            print(f"\nLeague links: {json.dumps(league_links, indent=2)}", flush=True)
        except Exception as e:
            print(f"League links: {e}", flush=True)

        b.close()

if __name__ == "__main__":
    probe()
