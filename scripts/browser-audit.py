"""Local, isolated layout regression test; never modifies the user's API data.
Uses the exported app, temporary static/API servers and a fresh Chrome context.
External maps/fonts are stubbed: this checks layout, not provider integration.
"""
from playwright.sync_api import sync_playwright, expect
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from pathlib import Path
from urllib.parse import urlsplit
import requests, subprocess, tempfile, threading, os, json, sys

ROOT = Path(__file__).resolve().parents[1]
def button(page, label): return page.get_by_role('button', name=label, exact=True)
def field(page, label): return page.get_by_role('textbox', name=label, exact=True)

class QuietStatic(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def handle(self):
        try: super().handle()
        except (BrokenPipeError, ConnectionResetError): pass

def check_layout(page, name, output):
    # Let React effects start sheet animations before waiting for them to finish.
    page.evaluate('new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    page.evaluate('Promise.all(document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))')
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), name + ': page overflow'
    # Horizontal carousels are intentionally clipped; vertical form/modal contents must fit.
    offenders = page.evaluate("""() => [...document.querySelectorAll('input,button,[role="button"],[role="tab"]')].filter(e => {
      const r=e.getBoundingClientRect(); if(!r.width || !r.height) return false;
      let p=e.parentElement;
      while(p) { const s=getComputedStyle(p); if(['auto','scroll','hidden'].includes(s.overflowX) && p.scrollWidth>p.clientWidth+1) return false; p=p.parentElement; }
      return r.left < -1 || r.right > innerWidth+1;
    }).map(e=>e.getAttribute('aria-label')||e.textContent)""")
    assert not offenders, name + ': controls outside viewport ' + repr(offenders)
    page.screenshot(path=str(output / (name + '.png')), full_page=False)

with tempfile.TemporaryDirectory(prefix='moa-isolated-ui-') as tmp:
    output = Path(tempfile.mkdtemp(prefix='moa-layout-results-'))
    env=dict(os.environ, DATA_FILE=tmp+'/state.json', PORT='0', QUIET='1')
    env.pop('DATABASE_URL', None)
    static=ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietStatic, directory=str(ROOT/'apps/mobile/dist')))
    worker=threading.Thread(target=static.serve_forever, daemon=True); worker.start()
    app_url='http://127.0.0.1:' + str(static.server_port)
    server=subprocess.Popen(['node','-e',"require('./apps/api/dist/main').bootstrap().then(a=>console.log(JSON.stringify({port:a.getHttpServer().address().port})))"], cwd=ROOT, env=env, stdout=subprocess.PIPE, text=True)
    try:
        api_url='http://127.0.0.1:' + str(json.loads(server.stdout.readline())['port'])
        token=requests.post(api_url+'/api/auth/demo', json={'provider':'DEMO','userId':'u-me'}, timeout=10).json()['token']
        with sync_playwright() as p:
            browser=p.chromium.launch(channel='chrome', headless=True)
            try:
                for width,height in [(360,800),(390,844),(548,734)]:
                    context=browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce')
                    page=context.new_page(); page.set_default_timeout(10000)
                    errors=[]
                    meetup_fixture={'searchAvailable': False}
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    def route_local(route):
                        url=urlsplit(route.request.url)
                        if url.netloc==urlsplit(app_url).netloc and url.path.startswith('/api/'):
                            if url.path=='/api/meetup/status':
                                route.fulfill(json={'searchAvailable':meetup_fixture['searchAvailable'],'countries':['KR']}); return
                            if url.path=='/api/meetup/search':
                                route.fulfill(json={'results':[{'providerId':'qa-only','name':'서울역 테스트 만남 장소','address':'테스트 주소','latitude':37.55,'longitude':126.97,'detail':''}]}); return
                            target=api_url+url.path+('?' + url.query if url.query else '')
                            response=route.fetch(url=target)
                            route.fulfill(response=response)
                        elif url.netloc==urlsplit(app_url).netloc:
                            route.continue_()
                        else:
                            if route.request.resource_type=='script':
                                route.fulfill(status=503, content_type='text/javascript', body='')
                            elif route.request.resource_type=='stylesheet':
                                route.fulfill(status=200, content_type='text/css', body='')
                            else:
                                route.fulfill(status=200, content_type='text/html', body='<html lang="ko"><body style="background:#eaf2ff">테스트용 외부 지도</body></html>')
                    page.route('**/*', route_local)
                    page.goto(app_url)
                    page.evaluate('(token)=>sessionStorage.setItem("moa-token",token)', token)
                    def go(route): page.goto(app_url+'/#'+route); page.reload()
                    go('home')
                    expect(button(page,'링크로 찾기')).to_be_visible()
                    check_layout(page, 'home-'+str(width), output)
                    go('request-form?placeId=p-station')
                    button(page,'예시 링크로 빠르게 채우기').click()
                    expect(page.get_by_text('예시 상품을 채웠어요', exact=True)).to_be_visible()
                    button(page,'수령 방법 정하기').click()
                    field(page,'여행자 보상 (원)').fill('5000')
                    button(page,'부탁 등록하기').scroll_into_view_if_needed()
                    check_layout(page, 'request-'+str(width), output)
                    page.reload()
                    expect(field(page,'여행자 보상 (원)')).to_have_value('5000')
                    button(page,'뒤로').click()
                    button(page,'수령 방법 정하기').click()
                    expect(field(page,'여행자 보상 (원)')).to_have_value('5000')
                    button(page,'희망 수령일 달력 열기').click()
                    check_layout(page, 'request-date-'+str(width), output)
                    button(page,'희망 수령일 달력 열기').click()
                    button(page,'직접 전달 · 무료').click()
                    expect(page.get_by_role('textbox', name='장소 검색', exact=True)).to_be_visible()
                    expect(button(page,'장소 검색하기')).to_be_disabled()
                    expect(page.get_by_text('이 환경에서는 장소 이름 검색이 아직 연결되지 않았어요. 아래 지도에서 위치를 지정할 수 있어요.',exact=True)).to_be_visible()
                    button(page,'닫기').click()
                    expect(button(page,'국내 택배 · ₩3,500')).to_have_attribute('aria-pressed','true')
                    meetup_fixture['searchAvailable']=True
                    button(page,'직접 전달 · 무료').click()
                    field(page,'장소 검색').fill('서울역')
                    expect(button(page,'장소 검색하기')).to_be_enabled()
                    button(page,'장소 검색하기').click()
                    button(page,'서울역 테스트 만남 장소 지도에서 확인').click()
                    field(page,'만나는 위치 상세 설명').fill('1번 출구 앞')
                    button(page,'이 위치에서 만날게요').click()
                    expect(page.get_by_text('직거래 위치가 저장됐어요',exact=True)).to_be_visible()
                    button(page,'직거래 위치 변경').click()
                    field(page,'만나는 위치 상세 설명').fill('취소할 편집')
                    check_layout(page, 'meetup-'+str(width), output)
                    button(page,'닫기').click()
                    expect(page.get_by_text('1번 출구 앞',exact=True)).to_be_visible()
                    page.reload()
                    expect(page.get_by_text('1번 출구 앞',exact=True)).to_be_visible()
                    stored=page.evaluate('JSON.parse(sessionStorage.getItem("moa-request-draft-v1")).draft')
                    assert stored['meetupPoint']['latitude']==37.55
                    assert stored['meetupPoint']['detail']=='1번 출구 앞'
                    assert stored['transport']=='MEETUP'
                    go('trip-form')
                    button(page,'여행지 선택 열기').click()
                    page.get_by_role('checkbox',name='도쿄 선택',exact=True).click()
                    page.get_by_role('checkbox',name='이시가키섬 선택',exact=True).click()
                    button(page,'2곳 선택 완료').click()
                    button(page,'방문 예정지 선택').click()
                    page.get_by_role('checkbox',name='시부야 PARCO 방문',exact=True).click()
                    page.get_by_role('checkbox',name='도쿄역 캐릭터 스트리트 방문',exact=True).click()
                    page.get_by_role('checkbox',name='유글레나 몰 방문',exact=True).click()
                    button(page,'3곳을 일정에 저장').click()
                    page.reload()
                    expect(page.get_by_text('시부야 PARCO · 도쿄역 캐릭터 스트리트 · 유글레나 몰',exact=True)).to_be_visible()
                    check_layout(page, 'trip-'+str(width), output)
                    button(page,'여행 날짜 선택').click()
                    expect(page.get_by_text('가는 날부터 차례로 선택해주세요.',exact=True)).to_be_visible()
                    footer=page.get_by_role('button',name=__import__('re').compile(' — .* 확인$'))
                    expect(footer).to_be_in_viewport(ratio=1)
                    check_layout(page, 'trip-dates-'+str(width), output)
                    box=footer.bounding_box()
                    assert box and box['y']>=0 and box['y']+box['height']<=height, 'calendar footer must remain visible'
                    button(page,'닫기').click()
                    go('search')
                    page.get_by_role('tab',name='지도',exact=True).click()
                    check_layout(page, 'map-'+str(width), output)
                    go('my')
                    expect(button(page,'이용 모드 설정')).to_be_visible()
                    check_layout(page, 'my-'+str(width), output)
                    button(page,'이용 모드 설정').click()
                    button(page,'여행하기 모드로 전환').click()
                    go('home')
                    check_layout(page, 'traveler-home-'+str(width), output)
                    go('trades')
                    check_layout(page, 'trades-'+str(width), output)
                    assert not errors, errors
                    print(json.dumps({'width':width,'request_reload_back':'PASS','meetup_search_save_cancel':'PASS','trip_draft':'PASS','calendar_footer':'PASS','layout':'PASS','runtime':'PASS'}), flush=True)
                    context.close()
            finally:
                if sys.exc_info()[0] is not None and not page.is_closed():
                    page.screenshot(path=str(output/'failure.png'))
                    print('Failure page: '+page.url+'\n'+page.locator('body').inner_text()[-2400:],flush=True)
                browser.close()
    finally:
        print('Screenshots: '+str(output), flush=True)
        server.terminate(); server.wait(timeout=10)
        static.shutdown(); static.server_close()
