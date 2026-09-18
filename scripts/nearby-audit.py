"""Nearby UI/navigation audit: local exported web + isolated API only.
Native OS permission/notification delivery is covered with adapter tests and
must additionally be checked on iOS/Android devices; web does not emulate it.
"""
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
    overflow = page.evaluate('''() => [...document.querySelectorAll('button,[role="button"],[role="radio"],[role="switch"]')].filter(el => {
      const r=el.getBoundingClientRect(); if(!r.width||!r.height) return false;
      for(let p=el.parentElement;p;p=p.parentElement) {const s=getComputedStyle(p);if(['auto','scroll','hidden'].includes(s.overflowX)&&p.scrollWidth>p.clientWidth+1)return false;}
      return r.left < -1 || r.right > innerWidth+1;
    }).map(el=>el.getAttribute('aria-label')||el.textContent)''')
    assert not overflow, (name, overflow)
    page.screenshot(path=str(output/(name+'.png')))

with tempfile.TemporaryDirectory(prefix='moa-nearby-state-') as state:
    output = Path(tempfile.mkdtemp(prefix='moa-nearby-ui-'))
    static = ThreadingHTTPServer(('127.0.0.1', 0), partial(Static, directory=str(ROOT/'apps/mobile/dist')))
    threading.Thread(target=static.serve_forever, daemon=True).start()
    app_url = 'http://127.0.0.1:'+str(static.server_port)
    env = dict(os.environ, DATA_FILE=state+'/state.json', PORT='0', QUIET='1')
    env.pop('DATABASE_URL', None)
    server = subprocess.Popen(['node','-e',"require('./apps/api/dist/main').bootstrap().then(a=>console.log(JSON.stringify({port:a.getHttpServer().address().port})))"], cwd=ROOT, env=env, stdout=subprocess.PIPE, text=True)
    try:
        api_url = 'http://127.0.0.1:'+str(json.loads(server.stdout.readline())['port'])
        token = requests.post(api_url+'/api/auth/demo', json={'provider':'DEMO','userId':'u-min'}, timeout=10).json()['token']
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True)
            try:
                for width,height in [(320,568),(375,667),(390,844),(430,932),(412,915)]:
                    context = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce')
                    context.add_init_script('''window.__locationCalls=0;
                      navigator.geolocation.getCurrentPosition=()=>window.__locationCalls++;
                      navigator.geolocation.watchPosition=()=>{window.__locationCalls++;return 1;};''')
                    page = context.new_page(); page.set_default_timeout(15000)
                    errors=[]; page.on('pageerror', lambda error: errors.append(str(error)))
                    def local(route):
                        url=urlsplit(route.request.url)
                        if url.netloc == urlsplit(app_url).netloc and url.path.startswith('/api/'):
                            route.fulfill(response=route.fetch(url=api_url+url.path, max_retries=2 if route.request.method=='GET' else 0))
                        elif url.netloc == urlsplit(app_url).netloc: route.continue_()
                        else: route.abort()
                    page.route('**/*', local)
                    page.goto(app_url)
                    page.evaluate('(token)=>{sessionStorage.setItem("moa-token",token);localStorage.setItem("moa-role","traveler");}', token)
                    page.reload()
                    entry=page.get_by_role('button',name='근처 부탁 둘러보기',exact=True)
                    expect(entry).to_be_visible(); entry.click()
                    expect(page).to_have_url(app_url+'/#notification-settings')
                    expect(page.get_by_text('휴대폰 Expo 앱에서 사용할 수 있어요.',exact=False)).to_be_visible()
                    expect(page.get_by_role('switch',name='근처 부탁 알림',exact=True)).not_to_be_checked()
                    expect(page.get_by_role('switch',name='근처 부탁 알림',exact=True)).to_be_disabled()
                    inspect(page,'settings-'+str(width),output)
                    page.get_by_role('radio',name='알림 거리 300m',exact=True).click()
                    page.get_by_role('radio',name='하루 최대 알림 5회',exact=True).click()
                    page.reload()
                    expect(page.get_by_role('radio',name='알림 거리 300m',exact=True)).to_have_attribute('aria-checked','true')
                    expect(page.get_by_role('radio',name='하루 최대 알림 5회',exact=True)).to_have_attribute('aria-checked','true')
                    page.goto(app_url+'/#nearby')
                    expect(page.get_by_text('가는 길의 부탁을 발견해보세요',exact=True)).to_be_visible()
                    inspect(page,'nearby-off-'+str(width),output)
                    page.goto(app_url+'/#nearby?placeId=p-shibuya&requestId=r-2&requestId=r-3')
                    expect(page.get_by_text('알림에 담긴 부탁 · 현재 모집 상태 기준',exact=True)).to_be_visible()
                    rows=page.get_by_role('button',name='요청 보기',exact=False)
                    expect(rows).to_have_count(2)
                    inspect(page,'nearby-group-'+str(width),output)
                    rows.first.click()
                    expect(page.get_by_text('가는 김에 가져와요',exact=True)).to_be_visible()
                    expect(page.get_by_role('button',name='가져오겠다고 지원하기',exact=True)).to_be_visible()
                    inspect(page,'request-context-'+str(width),output)
                    assert page.evaluate('window.__locationCalls') == 0, 'Web must never track location for nearby alerts'
                    assert not errors, errors
                    context.close(); print(f'PASS nearby settings/persistence/group/detail/no-GPS at {width}x{height}',flush=True)
            finally: browser.close()
        print('Screenshots:',output,flush=True)
    finally:
        server.terminate(); server.wait(timeout=10); static.shutdown()
