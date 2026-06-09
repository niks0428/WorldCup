#!/usr/bin/env python3
"""Deep futwiz probe — find base-card filter + map DOM row structure.
Run: xvfb-run -a /home/vladthelad/3dprint_env/bin/python futwiz_probe3.py
"""
import json
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

BASE = "https://www.futwiz.com"

def wait_clear(pg, tries=22):
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

        # --- 1. Find base gold card filter ---
        base_url = f"{BASE}/fifa21/players?page=0&leagues[]=13"
        pg.goto(base_url, wait_until="domcontentloaded", timeout=60000)
        wait_clear(pg)

        # Dump all filter-related links to find card type options
        try:
            card_links = pg.eval_on_selector_all(
                "a[href*='release'], a[href*='type'], a[href*='gold'], a[href*='item']",
                "els=>els.slice(0,30).map(e=>({href:e.getAttribute('href'),txt:e.textContent.trim().slice(0,40)}))"
            )
            print("Card type links:", json.dumps(card_links, indent=2), flush=True)
        except Exception as e:
            print(f"Card links error: {e}", flush=True)

        # Get count with no filter vs gold filter variants
        for suffix in [
            "",
            "&release=gold_nr",
            "&release=gold_rare",
            "&release=goldrare",
            "&release=gold",
            "&releases[]=gold_nr&releases[]=gold_rare",
            "&itemtypes[]=gold_nr&itemtypes[]=gold_rare",
        ]:
            url = base_url + suffix
            pg.goto(url, wait_until="domcontentloaded", timeout=30000)
            wait_clear(pg)
            rows = pg.eval_on_selector_all("table tbody tr", "e=>e.length")
            print(f"  {suffix or '(none)'}: {rows} rows", flush=True)

        # --- 2. Map DOM row structure on the full (unfiltered) PL page ---
        print("\n=== DOM row structure (FIFA 21 PL, no filter) ===", flush=True)
        pg.goto(base_url, wait_until="domcontentloaded", timeout=60000)
        wait_clear(pg)
        rows_data = pg.eval_on_selector_all("table tbody tr", """rows => rows.slice(0,2).map(r => {
            const tds = [...r.querySelectorAll('td')];
            return tds.map((td, i) => ({
                i,
                cls: td.className.trim().slice(0,40),
                text: td.innerText.trim().slice(0,60),
                links: [...td.querySelectorAll('a')].map(a=>({
                    href: a.getAttribute('href')||'',
                    txt: a.textContent.trim().slice(0,30)
                })).slice(0,3),
                imgs: [...td.querySelectorAll('img')].map(img=>({
                    alt: img.alt, title: img.title
                })).slice(0,2),
            }));
        })""")
        for ri, row in enumerate(rows_data):
            print(f"\n--- Row {ri} ---")
            for cell in row:
                print(f"  td[{cell['i']}] cls={cell['cls']!r} text={cell['text']!r}"
                      f" links={cell['links']} imgs={cell['imgs']}")

        # --- 3. Check how many pages PL has ---
        print("\n=== Pagination check ===", flush=True)
        for page_n in [0, 1, 2, 5, 10, 15]:
            url = f"{BASE}/fifa21/players?page={page_n}&leagues[]=13"
            pg.goto(url, wait_until="domcontentloaded", timeout=30000)
            wait_clear(pg)
            rows = pg.eval_on_selector_all("table tbody tr", "e=>e.length")
            print(f"  page={page_n}: {rows} rows", flush=True)
            if rows == 0:
                print("  (stopped — no more pages)", flush=True)
                break

        # --- 4. Check which editions futwiz has PL data for ---
        print("\n=== Edition availability (PL, page 0) ===", flush=True)
        for ver in [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21]:
            url = f"{BASE}/fifa{ver}/players?page=0&leagues[]=13"
            pg.goto(url, wait_until="domcontentloaded", timeout=30000)
            for _ in range(10):
                pg.wait_for_timeout(1200)
                t = pg.title().lower()
                if "moment" not in t and "attention" not in t:
                    break
            rows = pg.eval_on_selector_all("table tbody tr", "e=>e.length")
            print(f"  FIFA {ver}: {rows} rows", flush=True)

        b.close()

if __name__ == "__main__":
    probe()
