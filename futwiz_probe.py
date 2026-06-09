#!/usr/bin/env python3
"""Probe futwiz.com for older FIFA edition PL data.
Run: xvfb-run -a /home/vladthelad/3dprint_env/bin/python futwiz_probe.py
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

        # First check what editions futwiz has in their nav
        print("Loading futwiz home...", flush=True)
        pg.goto(BASE, wait_until="domcontentloaded", timeout=60000)
        wait_clear(pg)
        print(f"Title: {pg.title()}", flush=True)

        # Look for edition links in the nav
        try:
            edition_links = pg.eval_on_selector_all(
                "a[href*='/en/players']",
                "els => [...new Set(els.map(e=>e.getAttribute('href')))].slice(0,30)"
            )
            print(f"Player page links: {edition_links}", flush=True)
        except Exception as e:
            print(f"Nav links error: {e}", flush=True)

        # Try known URL patterns for futwiz
        # futwiz typically uses: /en/fifa{XX}/players or /en/fc{XX}/players
        test_urls = [
            f"{BASE}/en/fifa15/players",
            f"{BASE}/en/fifa16/players",
            f"{BASE}/en/fifa17/players",
            f"{BASE}/en/fifa18/players",
            f"{BASE}/en/fifa19/players",
            f"{BASE}/en/fifa20/players",
            f"{BASE}/en/fifa21/players",
            f"{BASE}/en/fifa22/players",
        ]

        print("\n--- Testing edition URLs ---", flush=True)
        for url in test_urls:
            pg.goto(url, wait_until="domcontentloaded", timeout=30000)
            wait_clear(pg)
            t = pg.title()
            print(f"  {url} → {t!r}", flush=True)

        b.close()

if __name__ == "__main__":
    probe()
