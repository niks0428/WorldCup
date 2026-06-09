#!/usr/bin/env python3
"""Probe futbin row structure — full HTML + cell dump.
Run: xvfb-run -a /home/vladthelad/3dprint_env/bin/python futbin_probe2.py
"""
import json
from playwright.sync_api import sync_playwright
from playwright_stealth import Stealth

# Test with gold_rare version filter (standard base cards)
TEST_URL = "https://www.futbin.com/25/players?league=13&version=gold_rare&page=1"

def probe():
    with Stealth().use_sync(sync_playwright()) as p:
        b = p.chromium.launch(
            executable_path="/usr/bin/chromium", headless=False,
            args=["--no-sandbox","--disable-dev-shm-usage",
                  "--disable-blink-features=AutomationControlled"],
        )
        pg = b.new_context(locale="en-GB", timezone_id="Europe/London",
                           viewport={"width":1400,"height":900}).new_page()
        pg.goto(TEST_URL, wait_until="domcontentloaded", timeout=60000)
        for i in range(20):
            pg.wait_for_timeout(1500)
            t = pg.title()
            if "moment" not in t.lower() and "attention" not in t.lower():
                break
        print(f"Title: {pg.title()}", flush=True)
        row_count = pg.eval_on_selector_all("table tbody tr", "e=>e.length")
        print(f"Rows: {row_count}", flush=True)

        # Dump first 3 rows fully
        rows = pg.eval_on_selector_all("table tbody tr.player-row", """rows => rows.slice(0,3).map(r => {
            const tds = [...r.querySelectorAll('td')];
            const cells = tds.map((td, i) => ({
                i,
                cls: td.className,
                text: td.innerText.trim().slice(0,60),
                imgs: [...td.querySelectorAll('img')].map(img=>({alt:img.alt, title:img.title, src:(img.src||'').slice(-50)})),
                links: [...td.querySelectorAll('a')].map(a=>({href:a.getAttribute('href')||'', txt:a.textContent.trim().slice(0,30)})),
            }));
            return cells;
        })""")
        for ri, row in enumerate(rows):
            print(f"\n=== Row {ri} ===")
            for cell in row:
                print(f"  td[{cell['i']}] cls={cell['cls']!r} text={cell['text']!r} imgs={cell['imgs']} links={cell['links']}")

        # Also check if older editions exist
        print("\n--- Checking edition availability ---", flush=True)
        b2 = p.chromium.launch(executable_path="/usr/bin/chromium", headless=False,
            args=["--no-sandbox"])
        pg2 = b2.new_context(locale="en-GB").new_page()
        for ver in [15, 16, 17, 18, 19, 20, 21, 22, 23, 24]:
            url = f"https://www.futbin.com/{ver}/players?league=13&version=gold_rare&page=1"
            pg2.goto(url, wait_until="domcontentloaded", timeout=30000)
            pg2.wait_for_timeout(2000)
            t = pg2.title()
            rc = pg2.eval_on_selector_all("table tbody tr.player-row", "e=>e.length")
            print(f"  FIFA {ver}: title={t!r} rows={rc}", flush=True)

        b.close(); b2.close()

if __name__ == "__main__":
    probe()
