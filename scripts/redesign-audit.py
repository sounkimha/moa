"""Consumer redesign visual regression. Isolated API + fresh Chrome contexts only.
External provider requests are failed deliberately; this is not a live-provider test.
Run after npm run build. Screenshots stay in a generated temporary output directory.
"""
from playwright.sync_api import sync_playwright, expect
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from pathlib import Path
from urllib.parse import urlsplit
import copy, json, os, re, requests, subprocess, tempfile, threading, uuid

ROOT = Path(__file__).resolve().parents[1]
def button(page, name): return page.get_by_role('button', name=name, exact=True)

def check_plane_shape(page):
    plane=page.get_by_test_id('route-airplane').first
    expect(plane).to_be_visible()
    geometry=plane.evaluate('''el => {
      const svg=el.querySelector('svg'), path=svg.querySelector('path');
      const box=path.getBBox(), bounds=svg.viewBox.baseVal;
      return {svgTransform:getComputedStyle(svg).transform,pathTransform:getComputedStyle(path).transform,
        wrapperTransform:getComputedStyle(svg.parentElement).transform,
        inside:box.x>=bounds.x && box.y>=bounds.y && box.x+box.width<=bounds.x+bounds.width && box.y+box.height<=bounds.y+bounds.height};
    }''')
    assert geometry['svgTransform']=='none' and geometry['pathTransform']=='none', 'Lucide SVG/path must not receive a duplicate rotation'
    assert geometry['wrapperTransform']!='none' and geometry['inside'], 'Rotate the complete airplane, keeping its silhouette inside the SVG'

class QuietStatic(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
    def handle(self):
        try: super().handle()
        except (BrokenPipeError, ConnectionResetError): pass

def inspect(page, name, output):
    page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
    page.evaluate('Promise.all(document.getAnimations().filter(a=>a.effect.getComputedTiming().iterations!==Infinity).map(a=>a.finished.catch(()=>{})))')
    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'), name + ': document overflow'
    outside = page.evaluate('''() => [...document.querySelectorAll('input,button,[role="button"],[role="tab"],[role="radio"]')].filter(e=>{
      const r=e.getBoundingClientRect(); if(!r.width||!r.height) return false;
      for(let p=e.parentElement;p;p=p.parentElement) {const s=getComputedStyle(p);if(['auto','scroll','hidden'].includes(s.overflowX)&&p.scrollWidth>p.clientWidth+1)return false;}
      return r.left < -1 || r.right > innerWidth+1;
    }).map(e=>e.getAttribute('aria-label')||e.textContent)''')
    assert not outside, name + ': controls outside ' + repr(outside)
    page.screenshot(path=str(output/(name+'.png')))

with tempfile.TemporaryDirectory(prefix='moa-redesign-state-') as tmp:
    output=Path(tempfile.mkdtemp(prefix='moa-redesign-qa-'))
    env=dict(os.environ, DATA_FILE=tmp+'/state.json', PORT='0', QUIET='1')
    env.pop('DATABASE_URL',None)
    static=ThreadingHTTPServer(('127.0.0.1',0),partial(QuietStatic,directory=str(ROOT/'apps/mobile/dist')))
    threading.Thread(target=static.serve_forever,daemon=True).start()
    app_url='http://127.0.0.1:'+str(static.server_port)
    server=subprocess.Popen(['node','-e',"require('./apps/api/dist/main').bootstrap().then(a=>console.log(JSON.stringify({port:a.getHttpServer().address().port})))"],cwd=ROOT,env=env,stdout=subprocess.PIPE,text=True)
    try:
        api_url='http://127.0.0.1:'+str(json.loads(server.stdout.readline())['port'])
        token=requests.post(api_url+'/api/auth/demo',json={'provider':'DEMO','userId':'u-me'},timeout=10).json()['token']
        headers={'Authorization':'Bearer '+token,'Idempotency-Key':str(uuid.uuid4())}
        baseline=requests.get(api_url+'/api/snapshot',headers=headers,timeout=10).json()
        response=requests.post(api_url+'/api/offers/offer-1/accept',headers=headers,json={'expectedRevision':0},timeout=10)
        assert response.ok, 'Seed traveler selection must succeed: '+str(response.status_code)
        transaction=response.json()
        matched=requests.get(api_url+'/api/snapshot',headers=headers,timeout=10).json()
        draft_body={key:value for key,value in baseline['requests'][0].items() if key in ['productName','productUrl','productImage','storeName','art','placeId','localPrice','quantity','requestedReward','desiredDate','deliveryCountry','deliveryCity','category','option','transport','deliveryRecipient','deliveryPhone','deliveryPostalCode','deliveryAddress1','deliveryAddress2','meetupLocation','meetupPoint']}
        draft_response=requests.post(api_url+'/api/requests',headers={**headers,'Idempotency-Key':str(uuid.uuid4())},json=draft_body,timeout=10)
        assert draft_response.ok, draft_response.text
        unpaid=draft_response.json()
        with sync_playwright() as p:
            browser=p.chromium.launch(channel='chrome',headless=True)
            try:
                for width,height in [(360,780),(390,844),(430,932),(412,915),(1440,960)]:
                    context=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce')
                    page=context.new_page(); page.set_default_timeout(12000)
                    errors=[]; page.on('pageerror',lambda error: errors.append(str(error)))
                    fixture={'snapshot':copy.deepcopy(baseline),'fail':False}
                    def route_local(route):
                        url=urlsplit(route.request.url)
                        if url.netloc==urlsplit(app_url).netloc and url.path=='/api/snapshot':
                            route.fulfill(status=503,json={'message':'QA unavailable'}) if fixture['fail'] else route.fulfill(json=fixture['snapshot'])
                        elif url.netloc==urlsplit(app_url).netloc and url.path.startswith('/api/'):
                            response=route.fetch(url=api_url+url.path+('?' + url.query if url.query else ''))
                            route.fulfill(response=response)
                        elif url.netloc==urlsplit(app_url).netloc: route.continue_()
                        else: route.abort()
                    page.route('**/*',route_local)
                    page.goto(app_url)
                    expect(page.get_by_text('01 · 부탁하기',exact=True)).to_be_visible()
                    expect(page.get_by_text('여행에 취향을 싣다.',exact=True)).to_be_visible()
                    inspect(page,'guide-1-'+str(width),output)
                    button(page,'다음').click()
                    expect(page.get_by_test_id('plane-route')).to_be_visible()
                    check_plane_shape(page)
                    inspect(page,'guide-2-'+str(width),output)
                    button(page,'다음').click()
                    inspect(page,'guide-3-'+str(width),output)
                    button(page,'이전').click()
                    expect(page.get_by_text('02 · 가는 길에 묶기',exact=True)).to_be_visible()
                    button(page,'다음').click()
                    expect(page.get_by_text('앞의 안내',exact=True)).to_have_count(0)
                    button(page,'모아 시작하기').click()
                    expect(button(page,'체험 계정으로 로그인')).to_be_visible()
                    inspect(page,'login-'+str(width),output)
                    page.evaluate('(token)=>sessionStorage.setItem("moa-token",token)',token)
                    def go(path):
                        page.goto(app_url+'/#'+path); page.reload()
                        expect(page.get_by_role('tab',name='홈',exact=True)).to_be_visible()
                    for path,label in [('home','home'),('search','search'),('place/p-shibuya','place'),('offers/r-1','travelers'),('profile/u-min','profile'),('trip-route/trip-u-min?placeId=p-station','route'),('request/r-1','request'),('wallet','wallet'),('my','my'),('settings','settings'),('notifications','notifications'),('reviews','reviews')]:
                        go(path)
                        inspect(page,label+'-'+str(width),output)
                        if label=='travelers' and width==390:
                            expect(page.get_by_role('button',name=re.compile('님과 함께하기$')).first).to_be_in_viewport(ratio=1)
                    go('home')
                    page.get_by_role('tab',name='등록',exact=True).click()
                    expect(page.get_by_text('어떤 물건을 부탁할까요?',exact=True)).to_be_visible()
                    inspect(page,'create-buyer-'+str(width),output)
                    button(page,'뒤로').click()
                    expect(button(page,'도시와 장소 검색')).to_be_visible()
                    go('settings')
                    button(page,'여행하기 모드로 전환').click()
                    go('home'); inspect(page,'traveler-home-'+str(width),output)
                    go('bundle?placeId=p-shibuya&tripId=trip-u-me'); inspect(page,'bundle-'+str(width),output)
                    go('settings'); button(page,'부탁하기 모드로 전환').click()
                    fixture['snapshot']=copy.deepcopy(matched)
                    go('chat/'+transaction['id'])
                    expect(page.get_by_text('이렇게 말해볼까요?',exact=True)).to_be_visible()
                    expect(page.get_by_text('상황에 맞춘 기본 추천이에요.',exact=True)).to_be_visible()
                    inspect(page,'chat-replies-'+str(width),output)
                    button(page,'옵션 확인 부탁해요').click()
                    expect(page.get_by_role('textbox',name='메시지',exact=True)).to_have_value('옵션 확인 부탁해요')
                    expect(button(page,'전송')).to_be_enabled()
                    messages=requests.get(api_url+'/api/snapshot',headers=headers,timeout=10).json()['messages']
                    assert len(messages)==len(matched['messages']), 'Selecting a draft must never send it'
                    fixture['snapshot']['requests'].append(copy.deepcopy(unpaid))
                    go('payment?requestId='+unpaid['id']); inspect(page,'prepayment-'+str(width),output)
                    expect(page.get_by_role('button',name=re.compile('결제 체험하기$')).first).to_be_disabled()
                    go('payment/'+transaction['id']); inspect(page,'payment-'+str(width),output)
                    go('transaction/'+transaction['id']); inspect(page,'transaction-'+str(width),output)
                    go('trades'); inspect(page,'trades-'+str(width),output)
                    # Same source state, rendered at each stage. This does not bypass production APIs.
                    for status in ['TRAVELING','SHIPPED','SETTLED']:
                        fixture['snapshot']['transactions'][0]['status']=status
                        go('transaction/'+transaction['id']); inspect(page,'transaction-'+status.lower()+'-'+str(width),output)
                    if width==390:
                        fixture['snapshot']=copy.deepcopy(baseline)
                        fixture['snapshot']['requests'][0]['productName']='아주 긴 한국어 상품명 테스트 도쿄역 한정 캐릭터 콜라보레이션 트래블 에디션 키링 세트'
                        fixture['snapshot']['requests'][0]['productImage']='data:image/png;base64,bm90LWFuLWltYWdl'
                        fixture['snapshot']['places'][0]['name']='아주 긴 한국어 장소명 테스트 시부야 PARCO 캐릭터 팝업 스토어와 함께하는 특별한 여행'
                        go('request/r-1')
                        expect(page.get_by_label('상품 사진을 불러오지 못했어요',exact=True)).to_be_visible()
                        inspect(page,'missing-image-long-title',output)
                        go('search'); inspect(page,'long-place-title',output)
                        fixture['snapshot']['requests']=[]; fixture['snapshot']['transactions']=[]
                        go('trades'); inspect(page,'empty-trades',output)
                        fixture['fail']=True
                        page.reload(); expect(page.get_by_role('alert').first).to_be_visible()
                        inspect(page,'error-state',output)
                        fixture['fail']=False
                        button(page,'다시 연결하기').click()
                        expect(page.get_by_role('tab',name='홈',exact=True)).to_be_visible()
                        print('PASS: initial API failure → retry → preserved session',flush=True)
                    assert not errors, errors
                    context.close()
                    print(json.dumps({'width':width,'height':height,'layout':'PASS','main_routes':'PASS','guide_and_create_sheet':'PASS','runtime':'PASS'}),flush=True)
                # A separate context with animation enabled checks actual motion, not just the icon.
                context=browser.new_context(viewport={'width':390,'height':844},reduced_motion='no-preference')
                page=context.new_page()
                page.route('**/*',lambda route: route.fulfill(json=baseline) if urlsplit(route.request.url).path=='/api/snapshot' else route.continue_() if urlsplit(route.request.url).netloc==urlsplit(app_url).netloc else route.abort())
                page.goto(app_url)
                page.evaluate('(token)=>sessionStorage.setItem("moa-token",token)',token)
                page.add_init_script('''const originalFetch=window.fetch; window.fetch=(input,options)=>String(input).includes('/api/snapshot') ? new Promise(resolve=>setTimeout(resolve,800)).then(()=>originalFetch(input,options)) : originalFetch(input,options);''')
                page.reload()
                expect(page.get_by_role('progressbar',name='화면을 불러오는 중',exact=True)).to_be_visible()
                inspect(page,'loading-skeleton',output)
                page.goto(app_url+'/#trip-route/trip-u-min?placeId=p-station'); page.reload()
                plane=page.get_by_test_id('route-airplane').first
                expect(plane).to_be_visible()
                check_plane_shape(page)
                start=plane.bounding_box(); page.wait_for_timeout(650); middle=plane.bounding_box()
                assert start and middle and abs(middle['x']-start['x'])>5, 'Plane must move along the route'
                page.wait_for_timeout(1200)
                expect(button(page,'시부야 PARCO 방문 상세').first).to_be_visible()
                button(page,'시부야 PARCO 방문 상세').first.click()
                inspect(page,'route-stop-sheet',output)
                print('PASS: airplane motion → revealed stops → interactive stop detail',flush=True)
                context.close()
            finally:
                if not page.is_closed():
                    page.screenshot(path=str(output/'last-state.png'))
                    print('Last screen: '+page.locator('body').inner_text()[-1600:],flush=True)
                browser.close()
    finally:
        print('Screenshots: '+str(output),flush=True)
        server.terminate(); server.wait(timeout=10)
        static.shutdown(); static.server_close()
