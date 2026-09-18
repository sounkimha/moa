"""Offer verification badge QA against an isolated local API (no live writes)."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import json, os, subprocess, tempfile, threading
import requests
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]

class Static(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def handle(self):
        try: super().handle()
        except (BrokenPipeError, ConnectionResetError): pass

def inspect(page, name, output):
    page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    page.evaluate('Promise.all(document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))')
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), name
    overflow = page.evaluate('''() => [...document.querySelectorAll('button,[role="button"]')].filter(el => {
      const r=el.getBoundingClientRect(); if(!r.width||!r.height) return false;
      return r.left < -1 || r.right > innerWidth+1;
    }).map(el=>el.getAttribute('aria-label')||el.textContent)''')
    assert not overflow, (name, overflow)
    page.screenshot(path=str(output/(name+'.png')))

with tempfile.TemporaryDirectory(prefix='moa-verification-state-') as state:
    output = Path(tempfile.mkdtemp(prefix='moa-verification-ui-'))
    static = ThreadingHTTPServer(('127.0.0.1', 0), partial(Static, directory=str(ROOT/'apps/mobile/dist')))
    threading.Thread(target=static.serve_forever, daemon=True).start()
    app_url = 'http://127.0.0.1:'+str(static.server_port)
    env = dict(os.environ, DATA_FILE=state+'/state.json', PORT='0', QUIET='1')
    env.pop('DATABASE_URL', None)
    server = subprocess.Popen(['node','-e',"require('./apps/api/dist/main').bootstrap().then(a=>console.log(JSON.stringify({port:a.getHttpServer().address().port})))"], cwd=ROOT, env=env, stdout=subprocess.PIPE, text=True)
    try:
        api_url = 'http://127.0.0.1:'+str(json.loads(server.stdout.readline())['port'])
        token = requests.post(api_url+'/api/auth/demo', json={'provider':'DEMO','userId':'u-me'}, timeout=10).json()['token']
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True)
            try:
                for width,height in [(320,568),(375,667),(390,844),(430,932),(412,915)]:
                    context = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce')
                    page = context.new_page(); page.set_default_timeout(15000)
                    errors=[]; page.on('pageerror', lambda error: errors.append(str(error)))
                    def local(route):
                        url=urlsplit(route.request.url)
                        if url.netloc == urlsplit(app_url).netloc and url.path.startswith('/api/'):
                            response=route.fetch(url=api_url+url.path, max_retries=2 if route.request.method=='GET' else 0)
                            if url.path == '/api/snapshot':
                                data=response.json()
                                for trip in data['trips']:
                                    if trip['travelerId']=='u-haru': trip['verificationStatus']='PENDING_REVIEW'
                                for user in data['users']:
                                    if user['id']=='u-joon': user['nickname']='아주긴이름으로여행하는여행자예요'
                                route.fulfill(response=response, json=data)
                            else: route.fulfill(response=response)
                        elif url.netloc == urlsplit(app_url).netloc: route.continue_()
                        else: route.abort()
                    page.route('**/*', local)
                    page.goto(app_url)
                    page.evaluate('(token)=>{sessionStorage.setItem("moa-token",token);localStorage.setItem("moa-role","buyer");}', token)
                    page.goto(app_url+'/#offers/r-1'); page.reload()
                    mark=page.get_by_role('button',name='민트로드 · 왕복 항공권 인증 · 예시 안내',exact=True)
                    expect(mark).to_be_visible()
                    assert not mark.evaluate("el=>!!el.parentElement.closest('button,[role=button]')"), 'Badge must not nest in a profile button'
                    inspect(page,'offers-'+str(width),output)
                    mark.click()
                    expect(page.get_by_text('왕복 항공권 인증 마크',exact=True)).to_be_visible()
                    expect(page.get_by_text('이 여행 일정의 왕복 항공권 인증을 보여주는 체험용 마크예요.',exact=False)).to_be_visible()
                    expect(page).to_have_url(app_url+'/#offers/r-1')
                    inspect(page,'explanation-'+str(width),output)
                    page.get_by_role('button',name='확인했어요',exact=True).click()
                    expect(page.get_by_text('왕복 항공권 인증 마크',exact=True)).not_to_be_visible()
                    pending=page.get_by_role('button',name='하루 · 항공권 확인 중 안내',exact=True)
                    pending.scroll_into_view_if_needed(); expect(pending).to_be_visible()
                    expect(page.get_by_role('button',name='하루님과 함께하기',exact=True)).to_be_disabled()
                    pending.click()
                    expect(page.get_by_text('왕복 항공권을 확인 중이에요',exact=True)).to_be_visible()
                    page.get_by_role('button',name='확인했어요',exact=True).click()
                    expect(page.get_by_text('왕복 항공권을 확인 중이에요',exact=True)).not_to_be_visible()
                    long_name=page.get_by_role('button',name='아주긴이름으로여행하는여행자예요 프로필',exact=True)
                    long_name.scroll_into_view_if_needed(); expect(long_name).to_be_visible()
                    inspect(page,'long-name-'+str(width),output)
                    page.get_by_role('button',name='민트로드 프로필',exact=True).click()
                    expect(page).to_have_url(app_url+'/#profile/u-min')
                    expect(page.get_by_role('button',name='민트로드 · 왕복 항공권 인증 · 예시 안내',exact=True)).to_be_attached()
                    page.goto(app_url+'/#offers/r-1')
                    page.get_by_role('button',name='이 사람의 일정 보기',exact=True).first.click()
                    # Existing recommendation order is completed trades, so Joon is first.
                    expect(page).to_have_url(app_url+'/#trip-route/trip-u-joon?placeId=p-station')
                    assert not errors, errors
                    context.close(); print(f'PASS verification badge/sheet/status/profile/schedule/long Korean at {width}x{height}',flush=True)
            finally: browser.close()
        print('Screenshots:',output,flush=True)
    finally:
        server.terminate(); server.wait(timeout=10); static.shutdown()
