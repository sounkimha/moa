"""Check real demo photos in bundle/detail/offer screens with external hosts blocked.
Run after building domain/API and exporting mobile web. Uses isolated local data.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import json, os, re, subprocess, tempfile, threading
import requests
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = [
    ('r-5', '하치와레 트래블 파우치', '하치와레 블루 체크 파우치'),
    ('r-6', '도쿄 한정 아크릴 키링', '도쿄역 역명판 아크릴 키링'),
    ('r-15', '몰랑 여행 미니 인형', '몰랑 12cm 봉제인형'),
]

class QuietStatic(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def handle(self):
        try: super().handle()
        except (BrokenPipeError, ConnectionResetError): pass

def button(page, label):
    return page.get_by_role('button', name=label, exact=True)

def check_photos(page):
    for _, _, label in PRODUCTS:
        photo = page.get_by_role('img', name=label+' 실제 상품 참고 사진', exact=True)
        expect(photo).to_have_count(1)
        bitmap = photo.locator('xpath=self::img | .//img')
        expect(bitmap).to_have_js_property('complete', True)
        assert bitmap.evaluate('el=>el.naturalWidth') >= 600
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')

with tempfile.TemporaryDirectory(prefix='moa-photo-state-') as tmp:
    output = Path(tempfile.mkdtemp(prefix='moa-photos-qa-'))
    env = dict(os.environ, DATA_FILE=tmp+'/state.json', PORT='0', QUIET='1')
    env.pop('DATABASE_URL', None)
    static = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietStatic, directory=str(ROOT/'apps/mobile/dist')))
    threading.Thread(target=static.serve_forever, daemon=True).start()
    app_url = 'http://127.0.0.1:'+str(static.server_port)
    server = subprocess.Popen(['node', '-e', "require('./apps/api/dist/main').bootstrap().then(a=>console.log(JSON.stringify({port:a.getHttpServer().address().port})))"], cwd=ROOT, env=env, stdout=subprocess.PIPE, text=True)
    try:
        api_url = 'http://127.0.0.1:'+str(json.loads(server.stdout.readline())['port'])
        token = requests.post(api_url+'/api/auth/demo', json={'provider':'DEMO','userId':'u-me'}, timeout=10).json()['token']
        # Synthetic demo identity on the temporary local API only, to reach offer confirmation.
        verified = requests.post(api_url+'/api/auth/identity/verify', headers={'Authorization':'Bearer '+token}, json={'name':'테스트', 'phone':'01000000000', 'birthDate':'900101', 'consent':True}, timeout=10)
        verified.raise_for_status()
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True)
            try:
                for width, height in [(320,568), (390,844), (430,932)]:
                    context = browser.new_context(viewport={'width':width, 'height':height}, reduced_motion='reduce')
                    page = context.new_page()
                    page.set_default_timeout(15000)
                    errors = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    def route_local(route):
                        url = urlsplit(route.request.url)
                        if url.netloc == urlsplit(app_url).netloc and url.path.startswith('/api/'):
                            route.fulfill(response=route.fetch(url=api_url+url.path+('?' + url.query if url.query else '')))
                        elif url.netloc == urlsplit(app_url).netloc: route.continue_()
                        else: route.abort()
                    page.route('**/*', route_local)
                    page.goto(app_url)
                    page.evaluate('(token)=>sessionStorage.setItem("moa-token",token)', token)
                    page.goto(app_url+'/#bundle?placeId=p-station&tripId=trip-u-me')
                    page.reload()
                    check_photos(page)
                    first = page.get_by_role('checkbox', name=PRODUCTS[0][1], exact=True)
                    expect(first).to_be_checked()
                    first.click()
                    expect(first).not_to_be_checked()
                    expect(button(page, '2건 한 번에 지원하기')).to_be_enabled()
                    first.click()
                    expect(button(page, '3건 한 번에 지원하기')).to_be_enabled()
                    # Scroll the last card into view; all photos are included in this mobile capture.
                    page.get_by_role('checkbox', name=PRODUCTS[-1][1], exact=True).scroll_into_view_if_needed()
                    page.screenshot(path=str(output/f'bundle-photos-{width}.png'))
                    button(page, '3건 한 번에 지원하기').click()
                    expect(page).to_have_url(re.compile(r'.*/#offer-form\?'))
                    check_photos(page)
                    for request_id, _, label in PRODUCTS:
                        page.goto(app_url+'/#request/'+request_id)
                        photo = page.get_by_role('img', name=label+' 실제 상품 참고 사진', exact=True)
                        expect(photo).to_be_visible()
                        expect(photo.locator('xpath=self::img | .//img')).to_have_js_property('complete', True)
                        expect(page.get_by_text('실제 상품 참고 사진 · 체험용', exact=True)).to_be_visible()
                        expect(button(page, '상품 사진 출처 보기')).to_be_visible()
                        assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1')
                        if width == 390: page.screenshot(path=str(output/f'{request_id}-photo.png'))
                    assert not errors, errors
                    context.close()
                    print(f'PASS: 3 bundled photos, selection, offer and detail at {width}x{height}', flush=True)
            finally: browser.close()
        print('Screenshots: '+str(output))
    finally:
        server.terminate(); server.wait(timeout=10)
        static.shutdown(); static.server_close()
