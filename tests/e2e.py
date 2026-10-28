"""End-to-end browser test (Playwright + Chrome). Run: python3 tests/e2e.py  [--video DIR]"""
import sys, json, threading, http.server, functools, os, time
from playwright.sync_api import sync_playwright
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
video = sys.argv[sys.argv.index('--video') + 1] if '--video' in sys.argv else None
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
H.log_message = lambda *a: None
srv = http.server.ThreadingHTTPServer(('127.0.0.1', 8765), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
ok = 0
def check(name, cond):
    global ok
    if not cond: print('FAIL -', name); sys.exit(1)
    ok += 1; print('ok -', name)
slow = 1 if video else 0
with sync_playwright() as p:
    b = p.chromium.launch(channel='chrome')
    ctx = b.new_context(viewport={'width': 1366, 'height': 820}, **({'record_video_dir': video, 'record_video_size': {'width': 1366, 'height': 820}} if video else {}))
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://127.0.0.1:8765/index.html'); pg.wait_for_timeout(1500 * slow + 200)
    check('page loads', 'JobWalk' in pg.title())
    pg.fill('#company', ''); pg.type('#company', 'Brower Builds', delay=60 * slow)
    pg.click('#sample') if not video else None
    if video:
        note = "Client is Dana Ruiz, 412 Maple St. Hall bathroom, about 5x8.\nDemo the tub surround and vanity, haul it all off. Soft spot by the toilet, probably rot, gonna check subfloor.\nInstall new 60 inch tub and tile surround to ceiling. New 30 inch vanity w/ faucet.\nAdd GFCI outlet by sink and a new exhaust fan vented outside. Paint walls and ceiling.\nOwner supplies the tile and vanity. Not sure if she wants a niche? Tile allowance $6 per sq ft.\nShould take 8 working days."
        pg.click('#clear'); pg.type('#note', note, delay=18)
    pg.type('#price', '$7,850', delay=80 * slow); pg.wait_for_timeout(600 * slow)
    pg.click('#go'); pg.wait_for_selector('#doc h1')
    pg.wait_for_timeout(2500 * slow)
    doc = pg.inner_text('#doc')
    check('title', 'Scope of Work' in doc)
    for s in ['Dana Ruiz', '412 Maple St', 'Brower Builds', '$7,850', 'GFCI', 'Owner supplies the tile', 'niche', '8 working days', 'Conditions That May Change'.upper()]:
        check('doc contains ' + s, s.lower() in doc.lower())
    check('coverage meter 100%', '6/6' in pg.inner_text('#meter') or 'accounted' in pg.inner_text('#meter'))
    pg.hover('#doc li:has-text("GFCI")'); pg.wait_for_timeout(600 * slow)
    pg.click('#doc li:has-text("GFCI")'); pg.wait_for_timeout(2200 * slow)
    check('source trace highlights', 'GFCI' in pg.inner_text('#srcView .hit'))
    pg.click('#doc li:has-text("niche")'); pg.wait_for_timeout(1800 * slow)
    # AI path via local Ollama (mocked): one good rewrite, one that changes a number must be rejected
    def fake(route):
        body = json.loads(route.request.post_data); pr = body['prompt']
        if '60 inch' in pr: out = 'Install a new 72 inch tub with a tiled surround to the ceiling.'
        else: out = 'Professionally: ' + pr.rstrip('.') + ', complete and clean.'
        route.fulfill(status=200, content_type='application/json', body=json.dumps({'response': out}))
    pg.route('http://localhost:11434/api/generate', fake)
    pg.select_option('#aiMode', 'ollama'); pg.wait_for_timeout(900 * slow)
    pg.click('#go'); pg.wait_for_function("document.getElementById('status').textContent.startsWith('Done')", timeout=15000)
    pg.wait_for_timeout(2500 * slow)
    doc2 = pg.inner_text('#doc'); st = pg.inner_text('#status')
    check('AI rewrite applied', 'Professionally' in doc2)
    check('number-changing rewrite rejected', '72 inch' not in doc2 and '60 inch' in doc2 and '1 kept' in st)
    # Ollama down -> graceful fallback
    pg.unroute('http://localhost:11434/api/generate'); pg.route('http://localhost:11434/api/generate', lambda r: r.abort())
    pg.click('#go'); pg.wait_for_function("/AI stopped|unavailable/.test(document.getElementById('status').textContent)", timeout=15000)
    check('AI down falls back with full doc', 'Scope of Work' in pg.inner_text('#doc'))
    pg.select_option('#aiMode', 'off'); pg.click('#go'); pg.wait_for_timeout(1500 * slow)
    pg.evaluate("window.scrollTo(0,0)"); pg.locator('#doc').evaluate("e=>e.scrollIntoView()"); pg.wait_for_timeout(1500 * slow)
    pg.reload(); check('note persists after reload', 'Dana Ruiz' in pg.input_value('#note'))
    pg.emulate_media(media='print'); pg.screenshot(path=os.path.join(ROOT, 'docs', 'print-preview.png')) if not video else None
    check('no page errors', not errs)
    ctx.close(); b.close()
srv.shutdown(); print(f'\n{ok} e2e checks passed')
