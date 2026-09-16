from playwright.sync_api import sync_playwright
import requests, subprocess, tempfile, os, json, base64
from pathlib import Path

root=str(Path(__file__).resolve().parents[1])
def button(page, label): return page.get_by_role('button',name=label,exact=True)
def field(page, label): return page.get_by_role('textbox',name=label,exact=True)
with tempfile.TemporaryDirectory(prefix='moa-audit-qa-') as tmp:
    env=dict(os.environ,DATA_FILE=tmp+'/state.json',PORT='0',QUIET='1')
    env.pop('DATABASE_URL',None)
    server=subprocess.Popen(['node','-e',"require('./apps/api/dist/main').bootstrap().then(a=>console.log(JSON.stringify({port:a.getHttpServer().address().port})))"],cwd=root,env=env,stdout=subprocess.PIPE,text=True)
    try:
        port=json.loads(server.stdout.readline())['port']
        base=f'http://localhost:{port}/api'
        tokens={actor:requests.post(base+'/auth/demo',json={'provider':'DEMO','userId':actor}).json()['token'] for actor in ['u-me','u-min']}
        headers={'Authorization':'Bearer '+tokens['u-me']}
        fixture=json.loads(subprocess.check_output(['node','-e',r"""
const w=require('zxing-wasm/writer'),fs=require('fs');const b=fs.readFileSync(require.resolve('zxing-wasm/writer/zxing_writer.wasm'));
w.prepareZXingModule({overrides:{wasmBinary:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)}});
const date=n=>new Date(Date.now()+n*86400000).toISOString().slice(0,10);
const jd=d=>String(Math.round((Date.parse(d)-Date.parse(d.slice(0,4)+'-01-01'))/86400000)+1).padStart(3,'0');
const make=async(from,to,d)=>{const r=await w.writeBarcode('M1'+'SAMPLE/TRAVELER'.padEnd(20)+'E'+'PNRDEMO'+from+to+'KE '+'00701'+jd(d)+'Y'+'001A'+'00001'+'1'+'00',{format:'QRCode',scale:5});return Buffer.from(await r.image.arrayBuffer()).toString('base64')};
(async()=>console.log(JSON.stringify({out:await make('ICN','NRT',date(4)),back:await make('NRT','ICN',date(7))})))();
"""],cwd=root,text=True))
        with sync_playwright() as p:
            browser=p.chromium.launch(channel='chrome',headless=True)
            for width,height in [(320,740),(360,800),(390,844),(430,932)]:
                page=browser.new_page(viewport={'width':width,'height':height})
                page.set_default_timeout(15000)
                page.set_default_navigation_timeout(60000)
                errors=[]
                page.on('pageerror',lambda error:errors.append(str(error)))
                page.route('**/api/**',lambda route:route.continue_(url=route.request.url.replace('localhost:4000',f'localhost:{port}')))
                page.route('https://tile.openstreetmap.org/**',lambda route:route.fulfill(content_type='image/svg+xml',body='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="#edf2f7"/></svg>'))
                page.goto('http://localhost:8081',wait_until='domcontentloaded')
                page.evaluate('(token)=>sessionStorage.setItem("moa-token",token)',tokens['u-me'])
                page.goto('http://localhost:8081/#request-form?method=photo',wait_until='domcontentloaded')
                page.reload(wait_until='domcontentloaded')
                button(page,'치이카와 샘플로 인식 체험').click()
                page.get_by_text('예시 상품을 채웠어요',exact=True).wait_for()
                button(page,'수령 방법 정하기').click()
                for label,value in [('받는 분','테스트 구매자'),('연락처','01012345678'),('우편번호','04524'),('주소','서울 중구 세종대로 110'),('상세 주소','테스트동 1203호')]:
                    field(page,label).fill(value)
                page.reload(wait_until='domcontentloaded')
                assert field(page,'상세 주소').input_value()=='테스트동 1203호'
                assert field(page,'연락처').input_value()=='01012345678'
                page.get_by_text('한국 도착 후 어떻게 받을까요?',exact=True).wait_for()
                assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
                page.screenshot(path=f'/tmp/moa-audit-request-{width}.png')
                button(page,'뒤로').click()
                button(page,'수령 방법 정하기').click()
                assert field(page,'상세 주소').input_value()=='테스트동 1203호'
                button(page,'부탁 등록하기').click()
                page.get_by_text('여행자의 수락을 기다려요',exact=False).wait_for()
                assert page.evaluate('sessionStorage.getItem("moa-request-draft-v1")') is None
                page.goto('http://localhost:8081/#trip-form',wait_until='domcontentloaded')
                field(page,'출발 도시').fill('부산')
                field(page,'최대 처리 가능한 상품 수량').fill('12')
                page.reload(wait_until='domcontentloaded')
                assert field(page,'출발 도시').input_value()=='부산'
                assert field(page,'최대 처리 가능한 상품 수량').input_value()=='12'
                assert page.evaluate('sessionStorage.getItem("moa-trip-draft-v1")') is not None
                field(page,'출발 도시').fill('서울')
                button(page,'일정 저장하고 항공권 인증하기').click()
                page.get_by_text('가는 편도, 오는 편도',exact=False).wait_for()
                assert page.evaluate('sessionStorage.getItem("moa-trip-draft-v1")') is None
                for label,key in [('가는 편 항공권 사진 올리기','out'),('오는 편 항공권 사진 올리기','back')]:
                    with page.expect_file_chooser() as chooser: button(page,label).click()
                    chooser.value.set_files({'name':'synthetic-boarding-qr.png','mimeType':'image/png','buffer':base64.b64decode(fixture[key])})
                page.get_by_role('checkbox',name='항공권의 개인정보를 일정 대조에 사용하는 데 동의해요 (필수)',exact=True).click()
                button(page,'항공권 인식하고 일정 대조하기').click()
                page.get_by_text('최근 항공권 대조 결과',exact=True).wait_for()
                page.get_by_text('일정 대조 완료 · 발권 확인 대기',exact=True).wait_for()
                assert button(page,'가는 편 항공권 사진 올리기').count()==1
                assert page.get_by_text('SAMPLE/TRAVELER',exact=False).count()==0
                assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
                page.screenshot(path=f'/tmp/moa-audit-flight-{width}.png')
                trip_id=page.url.split('/')[-1]
                page.goto(f'http://localhost:8081/#offer-form?requestId=r-2&tripId={trip_id}',wait_until='domcontentloaded')
                button(page,'먼저 왕복 항공권 인증하기').click()
                page.get_by_text('최근 항공권 대조 결과',exact=True).wait_for()
                page.goto('http://localhost:8081/#my',wait_until='domcontentloaded')
                assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
                page.screenshot(path=f'/tmp/moa-audit-my-{width}.png')
                page.goto('http://localhost:8081/#request/%E0%A4%A',wait_until='domcontentloaded')
                button(page,'사고 싶어요').click()
                page.get_by_text('찾으시는 물건을',exact=False).wait_for()
                assert not errors,errors
                print(json.dumps({'width':width,'draft_reload_back':'PASS','registration':'PASS','flight_upload_private_pending':'PASS','verification_gate':'PASS','my_overflow':'PASS','malformed_route':'PASS'}),flush=True)
                page.close()
            # Hold an old account snapshot until after switching accounts.
            page=browser.new_page(viewport={'width':390,'height':844})
            page.route('**/api/**',lambda route:route.continue_(url=route.request.url.replace('localhost:4000',f'localhost:{port}')))
            page.goto('http://localhost:8081',wait_until='domcontentloaded')
            page.evaluate('(token)=>sessionStorage.setItem("moa-token",token)',tokens['u-me'])
            page.goto('http://localhost:8081/#request-form',wait_until='domcontentloaded')
            page.reload(wait_until='domcontentloaded')
            button(page,'예시 링크로 빠르게 채우기').click()
            page.get_by_text('예시 상품을 채웠어요',exact=True).wait_for()
            page.evaluate('location.hash="#settings"')
            button(page,'최신 상태 다시 가져오기').wait_for()
            held=[]
            old_snapshot=requests.get(base+'/snapshot',headers=headers).json()
            def hold_once(route):
                if not held: held.append(route)
                else: route.continue_(url=route.request.url.replace('localhost:4000',f'localhost:{port}'))
            page.route('**/api/snapshot',hold_once)
            button(page,'최신 상태 다시 가져오기').click()
            button(page,'민트로드 계정 체험').click()
            page.get_by_text('현재 계정: 민트로드.',exact=False).wait_for()
            held[0].fulfill(json=old_snapshot)
            page.wait_for_timeout(300)
            assert page.get_by_text('현재 계정: 민트로드.',exact=False).count()==1
            assert page.evaluate('sessionStorage.getItem("moa-request-draft-v1")') is None
            page.unroute('**/api/snapshot',hold_once)
            held.clear()
            page.route('**/api/snapshot',hold_once)
            button(page,'최신 상태 다시 가져오기').click()
            button(page,'체험 로그아웃').click()
            button(page,'사고 싶어요').wait_for()
            held[0].fulfill(json=old_snapshot)
            page.wait_for_timeout(300)
            assert button(page,'사고 싶어요').count()==1
            assert page.evaluate('sessionStorage.getItem("moa-token")') is None
            print('PASS: late previous-account snapshot cannot replace new account or resurrect logout; private draft cleared',flush=True)
            page.close()
            browser.close()
    finally:
        server.terminate();server.wait(timeout=10)
