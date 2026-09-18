"""Home redesign QA against the exported app and an isolated real demo API.
No production writes. Screenshots use browser viewports, not native simulators.
Run after building domain/API and exporting the mobile web bundle.
"""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import copy, json, os, subprocess, tempfile, threading
import requests
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
EXPORTED = Path(os.environ.get('MOA_HOME_EXPORT', ROOT/'apps/mobile/dist'))
DEV = os.environ.get('MOA_HOME_DEV') == '1'

def button(page, label):
    return page.get_by_role('button', name=label, exact=True)

def mode_button(page):
    return page.get_by_test_id('home-scroll').get_by_role('button', name='이용 모드 설정', exact=True)

class QuietStatic(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def handle(self):
        try: super().handle()
        except (BrokenPipeError, ConnectionResetError): pass

def inspect(page, label, output):
    page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    page.evaluate('Promise.all(document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))')
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), label + ': document overflow'
    offenders = page.evaluate('''() => [...document.querySelectorAll('input,button,[role="button"],[role="tab"],[role="radio"]')].filter(e=>{
      const r=e.getBoundingClientRect(); if(!r.width||!r.height) return false;
      for(let p=e.parentElement;p;p=p.parentElement) {const s=getComputedStyle(p);if(['auto','scroll','hidden'].includes(s.overflowX)&&p.scrollWidth>p.clientWidth+1)return false;}
      return r.left < -1 || r.right > innerWidth+1;
    }).map(e=>e.getAttribute('aria-label')||e.textContent)''')
    assert not offenders, label + ': controls outside ' + repr(offenders)
    page.screenshot(path=str(output/(label+'.png')))

def inspect_search_toggle(page, label, output):
    toolbar = page.get_by_test_id('search-results-toolbar')
    toolbar.evaluate("el=>el.scrollIntoView({block:'center'})")
    bounds = toolbar.bounding_box()
    control = page.get_by_test_id('search-view-toggle').bounding_box()
    assert control['width'] <= 145, 'Search tabs must be bounded, not grow to full page width'
    tabs = [page.get_by_role('tab', name=title, exact=True).bounding_box() for title in ['목록', '지도']]
    assert abs(tabs[0]['width']-tabs[1]['width']) < 1, 'Tabs should have equal widths'
    for rect in [control, *tabs]:
        assert rect['x'] >= bounds['x'] and rect['x']+rect['width'] <= bounds['x']+bounds['width']+1, 'Tab overflows toolbar'
    assert all(rect['height'] >= 44 for rect in tabs), 'Preserve touch target height'
    inspect(page, label, output)

with tempfile.TemporaryDirectory(prefix='moa-home-state-') as tmp:
    output = Path(tempfile.mkdtemp(prefix='moa-home-qa-'))
    env = dict(os.environ, DATA_FILE=tmp+'/state.json', PORT='0', QUIET='1')
    env.pop('DATABASE_URL', None)
    static = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietStatic, directory=str(EXPORTED)))
    threading.Thread(target=static.serve_forever, daemon=True).start()
    app_url = 'http://127.0.0.1:'+str(static.server_port)
    server = subprocess.Popen(['node', '-e', "require('./apps/api/dist/main').bootstrap().then(a=>console.log(JSON.stringify({port:a.getHttpServer().address().port})))"], cwd=ROOT, env=env, stdout=subprocess.PIPE, text=True)
    try:
        api_url = 'http://127.0.0.1:'+str(json.loads(server.stdout.readline())['port'])
        token = requests.post(api_url+'/api/auth/demo', json={'provider':'DEMO','userId':'u-me'}, timeout=10).json()['token']
        baseline = requests.get(api_url+'/api/snapshot', headers={'Authorization':'Bearer '+token}, timeout=10).json()
        with sync_playwright() as p:
            browser = p.chromium.launch(channel='chrome', headless=True)
            try:
                for width, height in ([(320,568),(390,844)] if DEV else [(320,568),(375,667),(390,844),(430,932),(412,915),(1440,960)]):
                    context = browser.new_context(viewport={'width':width,'height':height}, reduced_motion='reduce', geolocation={'latitude':37.5445,'longitude':127.0557}, permissions=['geolocation'])
                    context.add_init_script('''window.__geoCalls=0;
                      const get=navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);
                      navigator.geolocation.getCurrentPosition=(...args)=>{window.__geoCalls++;get(...args);};''')
                    page = context.new_page()
                    page.set_default_timeout(12000)
                    errors = []
                    page.on('pageerror', lambda error: errors.append(str(error)))
                    fixture = {'snapshot':None}
                    def route_local(route):
                        url = urlsplit(route.request.url)
                        if url.netloc == urlsplit(app_url).netloc and url.path.startswith('/api/'):
                            if url.path == '/api/snapshot' and fixture['snapshot'] is not None:
                                route.fulfill(json=fixture['snapshot'])
                            else:
                                # A fresh browser context can race a closed local keep-alive socket.
                                # Retry connection resets for read-only API checks, never writes.
                                route.fulfill(response=route.fetch(url=api_url+url.path+('?' + url.query if url.query else ''), max_retries=2 if route.request.method == 'GET' else 0))
                        elif url.netloc == urlsplit(app_url).netloc: route.continue_()
                        else: route.abort()
                    page.route('**/*', route_local)
                    page.goto(app_url)
                    page.evaluate('(token)=>sessionStorage.setItem("moa-token",token)', token)
                    def home():
                        page.goto(app_url+'/#home'); page.reload()
                        expect(button(page,'도시와 장소 검색')).to_be_visible()
                    home()
                    expect(mode_button(page)).to_contain_text('사고 싶어요')
                    expect(page.get_by_test_id('home-hero')).to_contain_text('4명의 여행자')
                    expect(page.get_by_test_id('home-hero')).to_contain_text('서울')
                    expect(page.get_by_text('부탁 가능한 여행자 예시 3명', exact=True).first).to_have_count(1)
                    assert page.evaluate('window.__geoCalls') == 0, 'Home must not request location on entry'
                    expect(button(page,'테스트 설정')).to_have_count(1 if DEV else 0)
                    if DEV:
                        button(page,'테스트 설정').click()
                        expect(button(page,'앱 설정 · 체험 계정 전환')).to_be_visible()
                        inspect(page, 'dev-menu-'+str(width), output)
                        button(page,'닫기').click()
                    expect(page.get_by_text('찾는 물건이 있나요?', exact=True)).to_have_count(0)
                    expect(page.locator('[aria-label^="사진 출처:"]')).to_have_count(0)
                    text = ' '.join(page.get_by_test_id('home-scroll').inner_text().split())
                    order = ['좋은 하루예요', '여행자 일정 보기', '요즘 떠나는 곳', '내 주변에서 떠나는 여행자', '부탁이 많은 장소', '인기 장소', '이런 부탁도 있어요']
                    positions = [text.index(item) for item in order]
                    assert positions == sorted(positions), 'Home section order'
                    inspect(page, 'home-top-'+str(width), output)
                    # The second city peeks through, rather than hiding that this is a carousel.
                    cards = page.get_by_test_id('home-cities').get_by_role('button')
                    bounds = page.get_by_test_id('home-cities').bounding_box()
                    second = cards.nth(1).bounding_box()
                    if width < 500:
                        visible_ratio = (bounds['x']+bounds['width']-second['x'])/second['width']
                        assert 0.15 <= visible_ratio <= 0.22, visible_ratio
                    page.get_by_text('내 주변에서 떠나는 여행자', exact=True).scroll_into_view_if_needed()
                    nearby = page.get_by_test_id('home-nearby')
                    nearby.evaluate("el=>el.scrollIntoView({block:'start'})")
                    expect(nearby.get_by_text('성수동 근처에서 출발하는 여행자예요', exact=True)).to_be_visible()
                    expect(nearby.get_by_text('성수동 · 반경 2km · 테스트 데이터', exact=True)).to_be_visible()
                    expect(nearby.get_by_test_id('home-nearby-list')).to_have_count(1)
                    expect(nearby.get_by_test_id('nearby-traveler-divider')).to_have_count(2)
                    for traveler in ['민트로드', '하루', '준의 여행']:
                        row = nearby.get_by_role('button', name=traveler+'님의 여행 보기', exact=True)
                        expect(row).to_contain_text('여행 일정 인증')
                        expect(row).to_contain_text('서울')
                        expect(row).to_contain_text('도쿄')
                        expect(row).to_contain_text('시부야 · 마루노우치 방문 예정')
                        expect(row).to_contain_text('내 위치에서 ')
                        assert '위치 예시' not in row.inner_text()
                    # The list is one white surface; rows have no independent borders/shadows.
                    assert nearby.get_by_test_id('home-nearby-list').evaluate('el=>getComputedStyle(el).backgroundColor') == 'rgb(255, 255, 255)'
                    inspect(page, 'home-nearby-'+str(width), output)
                    button(page,'위치 확인').click()
                    expect(page.get_by_text('현재 위치 · 반경 2km · 테스트 데이터', exact=True)).to_be_visible()
                    expect(page.get_by_text('현재 위치 근처에서 출발하는 여행자예요', exact=True)).to_be_visible()
                    assert page.evaluate('window.__geoCalls') > 0
                    button(page,'민트로드님의 여행 보기').click()
                    expect(page.get_by_text('민트로드님의 여행', exact=True)).to_be_visible()
                    button(page,'뒤로').click()
                    expect(button(page,'도시와 장소 검색')).to_be_visible()
                    page.get_by_text('부탁이 많은 장소', exact=True).scroll_into_view_if_needed()
                    inspect(page, 'home-places-'+str(width), output)
                    page.get_by_test_id('home-scroll').evaluate('el=>el.scrollTop=el.scrollHeight')
                    inspect(page, 'home-requests-'+str(width), output)
                    if width < 1060:
                        content = page.get_by_test_id('home-scroll').bounding_box()
                        nav = page.get_by_role('tab', name='홈', exact=True).bounding_box()
                        assert content['y']+content['height'] <= nav['y']+1, 'Bottom nav overlaps scroll content'
                    button(page,'치이카와 도쿄역 한정 키링').click()
                    expect(page).to_have_url(app_url+'/#request/r-1')
                    button(page,'뒤로').click()
                    button(page,'도쿄 여행자 일정 보기').click()
                    expect(page.get_by_text('이 경로로 가는 여행자', exact=True)).to_be_visible()
                    expect(button(page,'민트로드님의 여행 보기')).to_have_count(1)
                    button(page,'민트로드님의 여행 보기').click()
                    expect(page.get_by_text('민트로드님의 여행', exact=True)).to_be_visible()
                    button(page,'뒤로').click()
                    page.get_by_role('tab', name='홈', exact=True).click()
                    button(page,'도시와 장소 검색').click()
                    expect(page.get_by_text('상품 찾기', exact=True)).to_be_visible()
                    inspect(page, 'search-entry-'+str(width), output)
                    expect(page.get_by_role('tab', name='목록', exact=True)).to_have_attribute('aria-selected', 'true')
                    inspect_search_toggle(page, 'search-list-tabs-'+str(width), output)
                    page.get_by_role('tab', name='지도', exact=True).click()
                    expect(page.get_by_role('tab', name='지도', exact=True)).to_have_attribute('aria-selected', 'true')
                    expect(button(page, '시부야 PARCO 지도에서 보기')).to_have_count(1)
                    inspect_search_toggle(page, 'search-map-tabs-'+str(width), output)
                    page.get_by_role('tab', name='목록', exact=True).click()
                    expect(page.get_by_role('tab', name='목록', exact=True)).to_have_attribute('aria-selected', 'true')
                    expect(button(page, '시부야 PARCO 지도에서 보기')).to_have_count(0)
                    if width == 320:
                        search = page.get_by_role('textbox', name='장소 또는 상품 검색', exact=True)
                        search.fill('no-moa-places-qa')
                        expect(page.get_by_test_id('search-results-toolbar')).to_contain_text('장소 0곳')
                        page.get_by_role('tab', name='지도', exact=True).click()
                        expect(page.get_by_text('표시할 장소가 없어요', exact=True)).to_have_count(1)
                        inspect_search_toggle(page, 'search-empty-map-tabs-320', output)
                        page.get_by_role('tab', name='목록', exact=True).click()
                        search.fill('')
                    button(page,'링크 붙여넣기').click()
                    expect(page).to_have_url(app_url+'/#request-form?method=link')
                    expect(page.get_by_role('textbox', name='상품 링크', exact=True)).to_be_visible()
                    button(page,'뒤로').click()
                    button(page,'사진으로 찾기').click()
                    expect(page).to_have_url(app_url+'/#request-form?method=photo')
                    expect(button(page,'사진 선택하고 바로 인식하기')).to_be_visible()
                    button(page,'뒤로').click()
                    page.get_by_role('tab', name='홈', exact=True).click()
                    button(page,'도쿄 사진·장소 정보').click()
                    credit = page.locator('[aria-label^="사진 출처:"]').first
                    credit.click()
                    expect(button(page,'원본 및 라이선스 보기')).to_be_visible()
                    button(page,'닫기').click()
                    button(page,'뒤로').click()
                    for choice, expected in [('여행 일정 등록','trip-form'),('구매 요청 등록','request-form')]:
                        page.get_by_role('tab', name='등록', exact=True).click()
                        expect(page.get_by_text('무엇을 할까요?', exact=True)).to_be_visible()
                        inspect(page, 'create-'+expected+'-'+str(width), output)
                        button(page,choice).click()
                        expect(page).to_have_url(app_url+'/#'+expected)
                        button(page,'뒤로').click()
                    mode_button(page).click()
                    inspect(page, 'role-sheet-'+str(width), output)
                    page.get_by_role('radio', name='가져올게요', exact=True).click()
                    expect(page.get_by_text('한 곳에서 한 번에', exact=True)).to_be_visible()
                    mode_button(page).click()
                    page.get_by_role('radio', name='사고 싶어요', exact=True).click()
                    expect(button(page,'도시와 장소 검색')).to_be_visible()
                    if width == 320:
                        fixture['snapshot'] = copy.deepcopy(baseline)
                        fixture['snapshot']['me']['nickname'] = '아주긴이름으로여행하는사람'
                        for user in fixture['snapshot']['users']:
                            if user['id'] == 'u-min': user['nickname'] = '주말마다다른도시로떠나는여행자'
                        for trip in fixture['snapshot']['trips']:
                            if trip['travelerId'] == 'u-min':
                                trip['departureCity'] = '아주 긴 이름의 출발 도시'
                                trip['destinationCity'] = '아주 긴 이름의 여행 목적지'
                                trip['placeIds'] = []
                                trip['customStops'] = ['이름이 아주 긴 방문 예정 편집숍', '산티아고데콤포스텔라 대성당']
                                trip['verificationStatus'] = 'UNVERIFIED'
                        home(); inspect(page,'long-korean-320',output)
                        page.get_by_text('내 주변에서 떠나는 여행자',exact=True).scroll_into_view_if_needed()
                        page.get_by_test_id('home-nearby').evaluate("el=>el.scrollIntoView({block:'start'})")
                        inspect(page,'long-traveler-320',output)
                        long_row = page.get_by_test_id('nearby-traveler-trip-u-min')
                        expect(long_row).to_contain_text('왕복 항공권 인증 필요')
                        expect(long_row).not_to_contain_text('여행 일정 인증')
                        fixture['snapshot']['trips'] = []
                        fixture['snapshot']['requests'] = []
                        home()
                        expect(page.get_by_text('근처에서 떠나는 여행자를 기다려요',exact=True)).to_have_count(1)
                        expect(page.get_by_text('아직 공개된 부탁이 없어요',exact=True)).to_have_count(1)
                        inspect(page,'empty-home-320',output)
                    assert not errors, errors
                    context.close()
                    print(f'PASS: home/search/role/create/location/itinerary/detail at {width}x{height}', flush=True)
            finally: browser.close()
        print('Screenshots: '+str(output))
    finally:
        server.terminate(); server.wait(timeout=10)
        static.shutdown(); static.server_close()
