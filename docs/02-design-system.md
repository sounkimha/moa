# MOA · 디자인 시스템

## 성격

새 MOA 워드마크의 둥근 글자와 비행 궤적을 기준으로 한 밝고 경쾌한 여행 서비스. 깨끗한 쿨 화이트 바탕, 전기빛 블루 CTA, 옅은 스카이 블루 선택 영역과 딥 블루 정보 카드를 사용한다. 이동 경로와 티켓 형태를 유지하되, 안전결제와 진행 상태가 한눈에 읽히는 파란색 정보 위계를 만든다.

| 토큰          | 값      | 용도                       |
| ------------- | ------- | -------------------------- |
| background    | #F7FAFF | 밝은 앱 배경               |
| surface       | #FFFFFF | 폼·정보 영역               |
| textPrimary   | #10213A | 기본 텍스트                |
| textSecondary | #5E718C | 보조 텍스트                |
| primary       | #0877F9 | 흰 글자 CTA·활성 탐색      |
| primaryStrong | #0064E8 | 현재 위치·중요 방문 지점   |
| primarySoft   | #EAF4FF | 선택 상태·인증·경로 배경   |
| primaryTint   | #CDE5FF | 딥 블루 위 금액 강조       |
| accentSoft    | #EEF0FF | 여행/장소 보조 배경        |
| warningSoft   | #FFF4D8 | 현장 확인 필요 안내        |
| border        | #DDE8F6 | 최소 구분선                |
| danger        | #D63B50 | 오류·분쟁                  |

한글 UI는 플랫폼 시스템 폰트를 사용하고 웹에서는 Inter·Pretendard를 우선한다. 본문은 Regular/Medium, 행동 문구는 Semibold, 큰 제목에만 Bold를 사용해 화면 전체가 무거워지지 않게 한다. 로고 이미지를 텍스트로 다시 조판하지 않는다. 옅은 파랑 위 흰색 작은 글자를 사용하지 않는다. 본문 15~~16, 보조 최소 12~~13, 제목 24~~32, 금액 24~~34. 터치 영역 최소 44×44. 가격은 KRW 정수 단위, 엔화 기호와 원화 기호를 분리한다.

간격 4/8/12/16/20/24/32. 카드 radius 26, 버튼 18, 칩 999. 카드에는 파란색 계열의 매우 옅은 그림자와 얇은 테두리를 함께 사용한다. 상품 리스트는 카드보다 구분선 행을 사용하고 장소 이미지는 넓게 사용한다.

하단 내비게이션 홈/찾아보기/+/거래/MY. 구매자·여행자 모드 선택은 홈 상단에서 항상 변경 가능하다. 상세에서는 뒤로가기와 핵심 CTA를 고정한다. 웹은 가운데 앱 폭을 유지하고 큰 화면에서 탐색 정보를 넓혀 보여준다.

모든 프로필·거래 건수·가격·장소 방문 인원은 데모 데이터다. 화면 상단에 '체험 모드'를 유지한다. 샘플 인증을 실제 본인인증으로 표현하지 않는다. 예시 상품 그래픽과 사진은 실제 재고·상품 증명이 아니다.

## 공통 컴포넌트

Page, Heading, AppText, Button, IconButton, Chip, Field, Notice, PlaceCard, ProductArt, ProductRow, TravelerAvatar, MoneyBreakdown, StatusTimeline, TravelRouteMap, PlaneRouteAnimation, LocalRoutePath, TripTimeline, EmptyState, LoadingState, ErrorBoundary, Toast, Sheet.

국제 이동은 약 1.5초의 곡선 비행기 Motion, 현지 이동은 Point와 Route Line을 사용한다. 운영체제 Reduced Motion 설정이 켜져 있으면 비행기는 도착 위치에 정적으로 표시한다. 경로·날짜·시간 텍스트는 애니메이션과 무관하게 즉시 읽을 수 있어야 한다.

## 상태 UX

- Loading: 지표/목록 로딩 표시, 중복 제출 방지.
- Empty: '아직 요청이 없어요'와 장소 선택 또는 요청 만들기.
- Error: 구체적인 이유와 다시 시도; 폼 값은 보존.
- Success: 생성한 객체의 상세나 거래로 이동.
- Offline: 연결 오류 화면, 다시 연결; 데이터 저장 성공처럼 표현하지 않음.

키보드·스크린리더를 위해 버튼 역할, 입력 레이블, 선택 상태, 오류 live region을 제공한다. 실제 길찾기 대신 쓰는 개념 지도에는 '위치 미리보기 · 실제 길찾기 아님'을 표시한다.
