"""Real API signup/login UI checks; isolated storage, never production writes."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import json, os, subprocess, tempfile, threading
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]

class QuietStatic(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass

def button(page, name): return page.get_by_role('button', name=name, exact=True)

def inspect(page, name, output):
    page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    page.evaluate('Promise.all(document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))')
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth+1'), name + ': horizontal overflow'
    assert not page.evaluate('''() => [...document.querySelectorAll('input,[role="button"]')].filter(el=> {
        const r=el.getBoundingClientRect(); if (!r.width || !r.height) return false;
        for(let p=el.parentElement;p;p=p.parentElement) {const s=getComputedStyle(p);if(['auto','scroll','hidden'].includes(s.overflowX)&&p.scrollWidth>p.clientWidth+1)return false;}
        return r.left < -1 || r.right > innerWidth+1;
    }).length'''), name + ': clipped control'
    page.screenshot(path=str(output/(name+'.png')))

with tempfile.TemporaryDirectory(prefix='moa-credential-state-') as tmp:
    output = Path(tempfile.mkdtemp(prefix='moa-credential-qa-'))
    env = dict(os.environ, DATA_FILE=tmp+'/accounts.json', PORT='0', QUIET='1')
    for key in ['DATABASE_URL','MOA_TEST_USERNAME','MOA_TEST_PASSWORD_SHA256','MOA_TRAVELER_TEST_PASSWORD_SHA256','MOA_SERVE_WEB']: env.pop(key, None)
    static = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietStatic, directory=str(ROOT/'apps/mobile/dist')))
    threading.Thread(target=static.serve_forever, daemon=True).start()
    app_url = 'http://127.0.0.1:'+str(static.server_port)
    server = subprocess.Popen(['node','-e',"require('./apps/api/dist/main').bootstrap().then(a=>console.log(JSON.stringify({port:a.getHttpServer().address().port})))"], cwd=ROOT, env=env, stdout=subprocess.PIPE, text=True)
    try:
        api_url = 'http://127.0.0.1:'+str(json.loads(server.stdout.readline())['port'])
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True)
            for width, height in [(320,568),(375,667),(390,844),(430,932),(412,915)]:
                context = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce')
                page = context.new_page()
                page.set_default_timeout(15000)
                errors, snapshots = [], []
                page.on('pageerror', lambda e: errors.append(str(e)))
                def proxy(route):
                    url = urlsplit(route.request.url)
                    if url.netloc == urlsplit(app_url).netloc and url.path.startswith('/api/'):
                        response = route.fetch(url=api_url+url.path+('?' + url.query if url.query else ''), max_retries=2 if route.request.method == 'GET' else 0)
                        if url.path == '/api/snapshot' and response.ok: snapshots.append(response.json()['me']['id'])
                        route.fulfill(response=response)
                    elif url.netloc == urlsplit(app_url).netloc: route.continue_()
                    else: route.abort()
                page.route('**/*', proxy)
                page.goto(app_url+'/#login')
                expect(button(page,'회원가입')).to_be_visible()
                inspect(page, 'login-'+str(width), output)
                button(page,'회원가입').click()
                expect(button(page,'가입하고 시작하기')).to_be_visible()
                expect(page.get_by_text('아이디로 로그인', exact=True)).to_have_count(0)
                inspect(page, 'signup-'+str(width), output)
                if width == 390:
                    def fill_signup(username, password='Travel123!', confirmation='Travel123!'):
                        page.get_by_label('회원가입 아이디', exact=True).fill(username)
                        page.get_by_label('닉네임', exact=True).fill('가입 여행자')
                        page.get_by_label('회원가입 비밀번호', exact=True).fill(password)
                        page.get_by_label('비밀번호 확인', exact=True).fill(confirmation)
                    fill_signup('qa_traveler', confirmation='Different123!')
                    button(page,'가입하고 시작하기').click()
                    expect(page.get_by_text('비밀번호가 일치하지 않아요. 다시 확인해주세요.', exact=True)).to_be_visible()
                    fill_signup('mintroad')
                    button(page,'가입하고 시작하기').click()
                    expect(page.get_by_test_id('signup-scroll').get_by_text('이미 사용 중인 아이디예요. 다른 아이디를 입력해주세요.', exact=True)).to_be_visible()
                    expect(page.get_by_text('연결을 다시 확인해주세요.', exact=True)).to_have_count(0)
                    fill_signup('qa_traveler')
                    button(page,'가입하고 시작하기').click()
                    expect(page.get_by_test_id('home-scroll')).to_be_visible()
                    member = snapshots[-1]
                    assert member not in ['u-me','u-min','u-haru','u-joon']
                    assert page.evaluate('localStorage.getItem("moa-token")') is None
                    inspect(page, 'signup-success', output)
                    def logout():
                        page.goto(app_url+'/#settings')
                        button(page,'로그아웃').click()
                        page.goto(app_url+'/#login')
                        expect(button(page,'회원가입')).to_be_visible()
                    logout()
                    page.get_by_label('아이디', exact=True).fill('qa_traveler')
                    page.get_by_label('비밀번호', exact=True).fill('WrongPass123!')
                    button(page,'로그인하기').click()
                    expect(page.get_by_text('아이디 또는 비밀번호를 확인해주세요.', exact=True).first).to_be_visible()
                    expect(page.get_by_text('연결을 다시 확인해주세요.', exact=True)).to_have_count(0)
                    for username, password, expected in [('qa_traveler','Travel123!',member),('mintroad','h112828!','u-min'),('haru','h112828!','u-haru'),('joon','h112828!','u-joon')]:
                        page.get_by_label('아이디', exact=True).fill(username)
                        page.get_by_label('비밀번호', exact=True).fill(password)
                        button(page,'로그인하기').click()
                        expect(page.get_by_test_id('home-scroll')).to_be_visible()
                        assert snapshots[-1] == expected
                        inspect(page, 'logged-in-'+username, output)
                        logout()
                assert not errors, errors
                print(json.dumps({'viewport':str(width)+'x'+str(height),'status':'passed'}), flush=True)
                context.close()
            browser.close()
        print('Screenshots: '+str(output))
    finally:
        server.terminate(); server.wait(timeout=10)
        static.shutdown()
