#!/usr/bin/env python3
"""Probe futbin.com to discover the player list page structure.
Run: xvfb-run -a /home/vladthelad/3dprint_env/bin/python futbin_probe.py
"""
import json
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

BASE = "https://www.futbin.com"
TEST_URL = f"{BASE}/25/players?league=13&page=1"

def probe():
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

        print(f"Loading: {TEST_URL}", flush=True)
        pg.goto(TEST_URL, wait_until="domcontentloaded", timeout=60000)

        # Wait for Cloudflare to clear
        for i in range(20):
            pg.wait_for_timeout(1500)
            title = pg.title()
            url = pg.url
            print(f"  [{i}] title={title!r} url={url}", flush=True)
            if "Just a moment" not in title and "attention" not in title.lower():
                break

        print(f"\nFinal URL: {pg.url}", flush=True)
        print(f"Title: {pg.title()}", flush=True)

        # Dump first 3000 chars of body text to understand structure
        body = pg.inner_text("body")[:3000]
        print(f"\nBody text snippet:\n{body}", flush=True)

        # Try to find the player table
        print("\n--- Checking for table/row elements ---", flush=True)
        for sel in ["table tbody tr", ".player-list-item", ".players-table tr",
                    "[class*='player'] tr", "tbody tr", ".table tr"]:
            try:
                count = pg.eval_on_selector_all(sel, "e=>e.length")
                if count > 0:
                    print(f"  Selector {sel!r}: {count} rows", flush=True)
                    # Get first row HTML
                    first = pg.eval_on_selector(sel, "e=>e.outerHTML")
                    print(f"  First row HTML (500 chars):\n{first[:500]}", flush=True)
                    break
            except Exception as e:
                print(f"  Selector {sel!r}: error {e}", flush=True)

        # Also dump available hrefs containing '/player/'
        try:
            links = pg.eval_on_selector_all("a[href*='/player/']",
                "els=>els.slice(0,5).map(e=>({href:e.href,text:e.textContent.trim()}))")
            print(f"\nPlayer links sample: {json.dumps(links, indent=2)}", flush=True)
        except Exception as e:
            print(f"Player links: {e}", flush=True)

        b.close()

if __name__ == "__main__":
    probe()
