import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertCircle, ArrowLeft, ArrowRight, Bell, ChevronDown,
  ChevronLeft, ChevronRight, CircleHelp, ClipboardList, CreditCard, LayoutDashboard,
  LogOut, Menu, PackageCheck, Search, ShieldAlert, Truck, Users,
} from 'lucide-react';
import { adminApi, ApiError } from './services/api';
import type { AdminIdentity, DashboardData, Issue, TimelineEntry, TransactionDetail, TransactionList, TransactionRow } from './types';
import './style.css';
import './overrides.css';

const roleLabel: Record<AdminIdentity['role'], string> = {
  SUPER_ADMIN: '최고 관리자', OPERATIONS: '운영', CUSTOMER_SUPPORT: '고객 지원', FINANCE: '재무', VIEWER: '조회 전용',
};
const issueLabel: Record<Issue, string> = {
  ALL: '전체', PAYMENT_WAIT: '결제 대기 24시간+', PURCHASE_DELAY: '결제 후 미구매 24시간+',
  RETURN_DELAY: '귀국 예정일 경과', SHIPPING_DELAY: '배송 후 미수령 7일+',
  SETTLEMENT_DELAY: '수령 확정 후 미정산 24시간+', DISPUTED: '진행 중인 분쟁',
};
const statusLabel: Record<string, string> = {
  MATCHED: '매칭 완료', PAYMENT_HELD: '결제금 보관', PURCHASED: '구매 인증', TRAVELING: '귀국/전달 준비',
  SHIPPED: '배송 시작', DELIVERED: '수령 등록', CONFIRMED: '구매 확정', SETTLED: '모의 정산 완료',
  CANCELLED: '취소', DISPUTED: '분쟁', REQUESTED: '요청 등록', OFFER_RECEIVED: '제안 접수',
};
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '기록 없음';
const won = (value: number | null | undefined) => value == null ? '권한 없음' : `₩${value.toLocaleString('ko-KR')}`;
const text = (value?: string | null) => value || '기록 없음';

function useLocation() {
  const [location, setLocation] = useState(() => window.location.pathname + window.location.search);
  useEffect(() => {
    const change = () => setLocation(window.location.pathname + window.location.search);
    window.addEventListener('popstate', change);
    return () => window.removeEventListener('popstate', change);
  }, []);
  const navigate = (path: string) => {
    if (window.location.pathname.startsWith('/transactions') && /^\/transactions\/[^/]+$/.test(path)) {
      sessionStorage.setItem('moaAdminListUrl', window.location.pathname + window.location.search);
      sessionStorage.setItem('moaAdminListScroll', String(window.scrollY));
    }
    if (path !== window.location.pathname + window.location.search) window.history.pushState(null, '', path);
    setLocation(path);
    window.scrollTo(0, 0);
  };
  return { location, navigate };
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === 'DISPUTED' || status === 'CANCELLED' || status === 'REFUNDED' ? 'danger'
    : status === 'SETTLED' || status === 'CONFIRMED' || status === 'MOCK_SETTLED' ? 'success'
      : status === 'SHIPPED' || status === 'TRAVELING' ? 'info' : 'neutral';
  return <span className={`status status-${tone}`}><i />{statusLabel[status] || status.replaceAll('_', ' ')}</span>;
}

function State({ kind, title, message, retry }: { kind: 'loading' | 'empty' | 'error' | 'permission'; title: string; message?: string; retry?: () => void }) {
  if (kind === 'loading') return <div className="state state-loading"><div className="skeleton" /><div className="skeleton short" /><div className="skeleton" /></div>;
  return <div className="state"><CircleHelp size={28} /><h3>{title}</h3>{message && <p>{message}</p>}{retry && <button className="button secondary" onClick={retry}>다시 시도</button>}</div>;
}

function useRequest<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data?: T; error?: Error; loading: boolean }>({ loading: true });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setState({ loading: true });
    load().then((data) => { if (alive) setState({ data, loading: false }); }).catch((error) => { if (alive) setState({ error, loading: false }); });
    return () => { alive = false; };
  }, [...deps, retry]);
  return { ...state, retry: () => setRetry((value) => value + 1) };
}

function Login({ onLogin }: { onLogin: (admin: AdminIdentity) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError('');
    try { onLogin((await adminApi.login(email, password, code)).admin); }
    catch (cause) { setError((cause as Error).message); }
    finally { setBusy(false); }
  };
  return <div className="login-wrap"><div className="login-card">
    <div className="login-brand"><div className="brand-mark">M</div><div><strong>MOA Admin</strong><span>운영 콘솔</span></div></div>
    <div className="login-heading"><p className="eyebrow">SECURE ACCESS</p><h1>운영자 로그인</h1><p>일반 사용자 계정과 분리된 운영자 계정으로 접속합니다.</p></div>
    <form onSubmit={submit} className="login-form">
      <label>관리자 이메일<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <label>비밀번호<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      <label>인증 앱 6자리 코드<input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))} required /></label>
      {error && <div className="inline-error" role="alert"><AlertCircle size={16} />{error}</div>}
      <button className="button primary" type="submit" disabled={busy}>{busy ? '확인 중…' : '운영 콘솔 열기'}<ArrowRight size={16} /></button>
    </form>
    <p className="login-foot">모의 거래 데이터 · 읽기 전용 · 중요 조회와 조치에는 관리자 권한이 적용됩니다.</p>
  </div></div>;
}

function Shell({ admin, location, navigate, onLogout, children }: { admin: AdminIdentity; location: string; navigate: (path: string) => void; onLogout: () => void; children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const onSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (globalSearch.trim()) params.set('q', globalSearch.trim());
    navigate(`/transactions${params.size ? `?${params}` : ''}`);
  };
  return <div className={`shell ${collapsed ? 'shell-collapsed' : ''}`}>
    <aside className="sidebar">
      <button className="brand" onClick={() => navigate('/')} aria-label="대시보드로 이동"><div className="brand-mark">M</div><div className="brand-copy"><strong>MOA</strong><small>ADMIN CONSOLE</small></div></button>
      <div className="nav-group"><span className="nav-caption">WORKSPACE</span>
        <button className={`nav-item ${location === '/' ? 'active' : ''}`} onClick={() => navigate('/')}><LayoutDashboard size={18} /><span>대시보드</span></button>
        <button className={`nav-item ${location.startsWith('/transactions') ? 'active' : ''}`} onClick={() => navigate('/transactions')}><ClipboardList size={18} /><span>거래 관리</span></button>
      </div>
      <div className="nav-group future"><span className="nav-caption">NEXT PHASE</span>
        <div className="nav-item disabled"><Users size={18} /><span>회원 · 여행자</span></div>
        <div className="nav-item disabled"><CreditCard size={18} /><span>결제 · 정산</span></div>
        <div className="nav-item disabled"><Truck size={18} /><span>배송 · 분쟁</span></div>
      </div>
      <div className="sidebar-bottom"><div className="read-only"><Activity size={15} /><span>읽기 전용 운영 환경</span></div><button className="collapse" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}><Menu size={18} /><span>{collapsed ? '펼치기' : '메뉴 접기'}</span></button></div>
    </aside>
    <div className="workspace"><header className="topbar"><form className="global-search" onSubmit={onSearch}><Search size={18} /><input aria-label="전체 거래 검색" placeholder="거래번호, 요청번호, 닉네임, 상품명, 운송장 검색" value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} /><kbd>↵</kbd></form><div className="top-actions"><span className="readonly-pill">DEMO · READ ONLY</span><button className="icon-button" title="알림 센터는 다음 단계에서 연결됩니다" disabled><Bell size={18} /></button><div className="profile"><div className="avatar">{admin.email.slice(0, 1).toUpperCase()}</div><div><strong>{admin.email}</strong><small>{roleLabel[admin.role]}</small></div><ChevronDown size={14} /></div><button className="icon-button" onClick={onLogout} aria-label="로그아웃" title="로그아웃"><LogOut size={18} /></button></div></header><main className="main">{children}</main></div>
  </div>;
}

function TransactionTable({ rows, navigate, compact = false }: { rows: TransactionRow[]; navigate: (path: string) => void; compact?: boolean }) {
  return <div className="table-wrap"><table><thead><tr><th>거래 / 생성</th><th>구매자 → 여행자</th><th>상품 / 장소</th><th>현재 단계</th><th>결제 · 배송 · 정산</th><th className="align-right">총액</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} onClick={() => navigate(`/transactions/${encodeURIComponent(row.id)}`)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/transactions/${encodeURIComponent(row.id)}`); }}><td><strong className="mono">{row.id}</strong><small>{formatDate(row.createdAt)}</small></td><td><strong>{row.buyer.nickname}</strong><span className="muted"> → </span>{row.traveler.nickname}<small>{row.buyer.id} · {row.traveler.id}</small></td><td><strong className="clamp">{row.productName}</strong><small>{row.place}</small></td><td><StatusBadge status={row.status} />{row.issue !== 'ALL' && <small className="risk-text">{issueLabel[row.issue]}</small>}</td><td><span className="mini-states">{row.paymentStatus === 'NOT_PAID' ? '결제 전' : '결제 기록'} · {row.shipmentStatus === 'NOT_SHIPPED' ? '배송 전' : '배송 기록'} · {row.settlementStatus === 'NOT_SETTLED' ? '정산 전' : '정산 기록'}</span></td><td className="align-right money-cell">{won(row.amounts?.totalPrice)}</td><td className="row-arrow"><ArrowRight size={16} /></td></tr>)}</tbody></table>{!rows.length && <State kind="empty" title="해당하는 거래가 없습니다" message={compact ? '거래가 생성되면 이곳에 나타납니다.' : '검색어나 필터를 바꿔보세요.'} />}</div>;
}

function Dashboard({ navigate }: { navigate: (path: string) => void }) {
  const { data, error, loading, retry } = useRequest(() => adminApi.dashboard(), []);
  if (loading) return <State kind="loading" title="대시보드를 불러오는 중" />;
  if (error || !data) return <State kind="error" title="대시보드를 불러오지 못했습니다" message={error?.message} retry={retry} />;
  const d: DashboardData = data;
  const kpis = [
    ['오늘 신규 요청', d.kpis.newRequestsToday, ClipboardList], ['오늘 매칭', d.kpis.matchedToday, PackageCheck],
    ['진행 중 거래', d.kpis.activeTransactions, Activity], ['오늘 배송 시작', d.kpis.shippedToday, Truck],
    ['진행 중 분쟁', d.kpis.openDisputes, ShieldAlert], ['모의 결제 보관액', d.kpis.gmv == null ? '권한 없음' : won(d.kpis.gmv), CreditCard],
    ['오늘 신규 가입', d.kpis.newUsersToday, Users], ['모의 정산 누적액', d.kpis.settled == null ? '권한 없음' : won(d.kpis.settled), CreditCard],
  ] as const;
  const activeAlerts = d.alerts.filter((item) => item.count > 0);
  return <>
    <div className="page-heading"><div><p className="eyebrow">OPERATIONS OVERVIEW</p><h1>대시보드</h1><p>현재 서비스 상태와 바로 확인할 거래를 한눈에 봅니다. <span className="muted">{formatDate(d.generatedAt)} 기준</span></p></div><button className="button secondary" onClick={retry}>새로고침</button></div>
    <div className="notice-banner"><Activity size={16} /><span>현재 데이터는 체험 환경의 실제 기록입니다. 결제·정산은 모의 처리이며, 실시간 배송사·항공편 데이터는 포함되지 않습니다.</span></div>
    <div className="kpi-grid">{kpis.map(([label, value, Icon]) => <div className="kpi" key={label}><div className="kpi-top"><span>{label}</span><Icon size={18} /></div><strong>{value}</strong></div>)}</div>
    <div className="dashboard-grid"><section className="panel"><div className="panel-head"><div><p className="eyebrow">NEEDS ATTENTION</p><h2>운영 경고</h2></div><span className="count-tag">{activeAlerts.reduce((sum, item) => sum + item.count, 0)}건</span></div>{activeAlerts.length ? <div className="alert-list">{activeAlerts.map((item) => <button key={item.key} className="alert-row" onClick={() => navigate(`/transactions?issue=${item.key}`)}><span className="alert-dot" /><span>{issueLabel[item.key]}</span><strong>{item.count}건</strong><ArrowRight size={16} /></button>)}</div> : <div className="quiet-state"><PackageCheck size={22} /><strong>현재 기준의 지연·분쟁 경고가 없습니다</strong><span>등록된 거래의 최신 상태를 기준으로 계산했습니다.</span></div>}</section>
      <section className="panel"><div className="panel-head"><div><p className="eyebrow">TRANSACTION FUNNEL</p><h2>거래 흐름</h2></div><span className="subtle">누적 단계 진입 건수</span></div><div className="funnel">{d.funnel.map((step, index) => { const previous = d.funnel[index - 1]?.count; const rate = previous ? `${Math.round(step.count / previous * 100)}%` : '—'; return <div className="funnel-row" key={step.key}><span className="step-index">{String(index + 1).padStart(2, '0')}</span><span className="step-label">{step.label}</span><div className="bar-track"><div style={{ width: `${Math.min(100, d.funnel[0]?.count ? step.count / d.funnel[0].count * 100 : 0)}%` }} /></div><strong>{step.count}</strong><small>{index ? rate : '기준'}</small></div>; })}</div><p className="footnote">전환율은 직전 단계 대비입니다. 취소·분쟁은 별도 상태로 집계되므로 코호트 분석값이 아닙니다.</p></section></div>
    <section className="panel recent-panel"><div className="panel-head"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>최근 거래</h2></div><button className="text-button" onClick={() => navigate('/transactions')}>모든 거래 보기 <ArrowRight size={15} /></button></div><TransactionTable rows={d.recent} navigate={navigate} compact /></section>
  </>;
}

function TransactionListPage({ location, navigate, admin }: { location: string; navigate: (path: string) => void; admin: AdminIdentity }) {
  const params = new URLSearchParams(location.split('?')[1] || '');
  const q = params.get('q') || '';
  const status = params.get('status') || 'ALL';
  const issue = params.get('issue') || 'ALL';
  const sort = params.get('sort') || 'created_desc';
  const from = params.get('from') || '';
  const to = params.get('to') || '';
  const page = Number(params.get('page') || 1);
  const [draft, setDraft] = useState(q);
  useEffect(() => setDraft(q), [q]);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (!value || value === 'ALL' || (key === 'sort' && value === 'created_desc')) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    navigate(`/transactions${next.size ? `?${next}` : ''}`);
  };
  const requestParams = new URLSearchParams(params);
  requestParams.set('page', String(Number.isFinite(page) && page > 0 ? page : 1));
  const { data, error, loading, retry } = useRequest(() => adminApi.transactions(requestParams), [location]);
  useEffect(() => {
    if (data && sessionStorage.getItem('moaAdminListUrl') === location) {
      const y = Number(sessionStorage.getItem('moaAdminListScroll') || 0);
      requestAnimationFrame(() => window.scrollTo(0, y));
      sessionStorage.removeItem('moaAdminListScroll');
    }
  }, [data, location]);
  const views: { label: string; issue: Issue }[] = [
    { label: '전체 거래', issue: 'ALL' }, { label: '미구매 24시간+', issue: 'PURCHASE_DELAY' },
    { label: '귀국 예정일 경과', issue: 'RETURN_DELAY' }, { label: '배송 7일+ 미수령', issue: 'SHIPPING_DELAY' }, { label: '분쟁', issue: 'DISPUTED' },
  ];
  return <><div className="page-heading"><div><p className="eyebrow">TRANSACTION OPERATIONS</p><h1>거래 관리</h1><p>거래 흐름을 추적하고 고객 문의의 원인을 찾습니다.</p></div><span className="page-count">{data?.total ?? '—'}건의 거래</span></div>
    <div className="saved-views">{views.map((view) => <button key={view.issue} className={`view-chip ${issue === view.issue ? 'selected' : ''}`} onClick={() => update('issue', view.issue)}>{view.label}</button>)}</div>
    <section className="panel list-panel"><div className="filters"><form className="filter-search" onSubmit={(event) => { event.preventDefault(); update('q', draft.trim()); }}><Search size={17} /><input aria-label="거래 검색" placeholder="거래번호 · 닉네임 · 상품명 · 운송장" value={draft} onChange={(event) => setDraft(event.target.value)} /><button type="submit">검색</button></form><label className="select-field">상태<select value={status} onChange={(event) => update('status', event.target.value)}><option value="ALL">전체 상태</option>{Object.entries(statusLabel).filter(([key]) => !['REQUESTED', 'OFFER_RECEIVED'].includes(key)).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label><label className="select-field">시작일<input type="date" value={from} onChange={(event) => update('from', event.target.value)} /></label><label className="select-field">종료일<input type="date" value={to} onChange={(event) => update('to', event.target.value)} /></label><label className="select-field">정렬<select value={sort} onChange={(event) => update('sort', event.target.value)}><option value="created_desc">최신순</option><option value="created_asc">오래된순</option>{['SUPER_ADMIN', 'OPERATIONS', 'FINANCE'].includes(admin.role) && <><option value="amount_desc">금액 높은순</option><option value="amount_asc">금액 낮은순</option></>}</select></label></div>
      {loading ? <State kind="loading" title="거래를 불러오는 중" /> : error ? <State kind={error instanceof ApiError && error.status === 403 ? 'permission' : 'error'} title="거래 목록을 불러오지 못했습니다" message={error.message} retry={retry} /> : <TransactionTable rows={data?.rows || []} navigate={navigate} />}
      {!loading && !error && data && <div className="pagination"><span>{data.total ? `${(data.page - 1) * data.size + 1}–${Math.min(data.page * data.size, data.total)}` : '0'} / {data.total}건</span><div><button disabled={page <= 1} onClick={() => update('page', String(page - 1))} aria-label="이전 페이지"><ChevronLeft size={18} /></button><strong>{page} / {Math.max(1, Math.ceil(data.total / data.size))}</strong><button disabled={page * data.size >= data.total} onClick={() => update('page', String(page + 1))} aria-label="다음 페이지"><ChevronRight size={18} /></button></div></div>}</section>
  </>;
}

function Info({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) { return <div className="info"><span>{label}</span><strong className={mono ? 'mono' : ''}>{value || '기록 없음'}</strong></div>; }
function Section({ id, eyebrow, title, children, aside }: { id?: string; eyebrow?: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return <section className="panel detail-section" id={id}><div className="panel-head"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{aside}</div>{children}</section>;
}
function Evidence({ value, label }: { value: string | null; label: string }) {
  if (!value) return <div className="evidence empty-evidence">{label} 없음</div>;
  if (!value.startsWith('data:image/') && !/^https:\/\//.test(value)) return <div className="evidence empty-evidence">{label} 형식 확인 필요</div>;
  return <a className="evidence" href={value} target="_blank" rel="noopener noreferrer" title={`${label} 원본 보기`}><img src={value} alt={label} /><span>{label} 원본 보기 ↗</span></a>;
}
function Timeline({ entries }: { entries: TimelineEntry[] }) {
  return <div className="timeline">{entries.length ? entries.map((entry, index) => <div className="timeline-entry" key={entry.id}><div className={`timeline-rail ${index === entries.length - 1 ? 'last' : ''}`}><i /></div><div className="timeline-body"><div className="timeline-title"><strong>{statusLabel[entry.to || entry.type] || entry.type.replaceAll('_', ' ')}</strong><time>{formatDate(entry.createdAt)}</time></div><p>{entry.note}</p><div className="timeline-meta"><span>{entry.actor.nickname} <em>({entry.actor.id})</em></span>{entry.from && entry.to && <span className="mono">{entry.from} → {entry.to}</span>}<span>{entry.source === 'event' ? '상태 이벤트' : '요청 기록'}</span></div></div></div>) : <State kind="empty" title="이벤트 기록이 없습니다" message="현재 상태만으로 이전 시각이나 조치 주체를 추정하지 않습니다." />}</div>;
}
function diagnosis(detail: TransactionDetail) {
  if (detail.dispute?.status === 'OPEN') return { title: '분쟁 접수로 정산이 보류됐습니다', body: '분쟁 내용과 대화 기록을 먼저 확인하고, 구매자와 여행자 양측 사실관계를 확인하세요.', tone: 'danger' };
  if (detail.status === 'CANCELLED' && detail.receipt?.outcome === 'OUT_OF_STOCK') return { title: '매장 구매 불가로 취소됐습니다', body: '품절 또는 매장 사유와 환불 기록을 확인하세요. 이 거래에 배송이 없는 것은 정상입니다.', tone: 'warning' };
  if (detail.status === 'CANCELLED') return { title: '취소된 거래입니다', body: '취소 이벤트와 모의 결제 환불 여부를 먼저 확인하세요.', tone: 'info' };
  if (!detail.receipt) return { title: '구매 인증이 아직 없습니다', body: '결제 기록과 여행자의 구매 예정일을 대조하세요. 상품을 실제로 샀다고 단정할 수 없습니다.', tone: 'warning' };
  if (!detail.shipment) return { title: '배송/전달 등록이 아직 없습니다', body: `구매 증빙은 있지만 운송장 또는 직접 전달 등록이 없습니다. 여행 귀국 예정일과 채팅을 먼저 확인하세요.`, tone: 'warning' };
  if (detail.status === 'SHIPPED') return { title: '배송 등록됨 · 수령 확인은 아직 없습니다', body: '운송장은 등록됐지만 배송사 실시간 조회는 연결되지 않았습니다. 운송장으로 배송사에 별도 확인하세요.', tone: detail.issue === 'SHIPPING_DELAY' ? 'danger' : 'info' };
  if (['DELIVERED', 'CONFIRMED', 'SETTLED'].includes(detail.status)) return { title: '수령 관련 상태가 기록돼 있습니다', body: '누가 언제 수령/확정을 등록했는지 타임라인에서 확인하고 고객의 실제 수령 여부를 별도로 확인하세요.', tone: 'success' };
  return { title: '현재 단계의 증빙을 확인하세요', body: '타임라인과 결제·구매·여행 일정을 함께 보면 다음 담당자 확인이 필요한 지점을 찾을 수 있습니다.', tone: 'info' };
}

function TransactionDetailPage({ id, navigate }: { id: string; navigate: (path: string) => void }) {
  const { data: d, error, loading, retry } = useRequest(() => adminApi.transaction(id), [id]);
  if (loading) return <State kind="loading" title="거래 상세를 불러오는 중" />;
  if (error || !d) return <State kind={error instanceof ApiError && error.status === 403 ? 'permission' : 'error'} title="거래를 확인할 수 없습니다" message={error?.message} retry={retry} />;
  const signal = diagnosis(d);
  return <>
    <button className="back-link" onClick={() => navigate(sessionStorage.getItem('moaAdminListUrl') || '/transactions')}><ArrowLeft size={16} />거래 목록으로</button>
    <div className="detail-heading"><div><p className="eyebrow">TRANSACTION DETAIL · {d.id}</p><h1>{d.productName}</h1><div className="heading-meta"><StatusBadge status={d.status} /><span>{d.buyer.nickname} → {d.traveler.nickname}</span><span>생성 {formatDate(d.createdAt)}</span></div></div><div className="detail-total"><span>총 모의 결제액</span><strong>{won(d.amounts?.totalPrice)}</strong><small>{d.payment?.status === 'HELD' ? '보관 중' : d.payment?.status === 'REFUNDED' ? '환불됨' : d.payment?.status === 'RELEASED' ? '정산 반영' : '결제 전'}</small></div></div>
    <div className="notice-banner detail-notice"><AlertCircle size={16} /><span>이 화면은 체험 거래의 내부 기록입니다. 실제 PG 승인·배송사 배송 완료·항공편 운항을 보증하지 않습니다.</span></div>
    <nav className="section-nav" aria-label="거래 상세 영역"><a href="#timeline">타임라인</a><a href="#people">당사자·일정</a><a href="#payment">결제·정산</a><a href="#shipping">구매·배송</a><a href="#chat">채팅·분쟁</a><a href="#actions">관리자 조치</a></nav>
    <div className="detail-main"><Section id="timeline" eyebrow="SOURCE OF TRUTH" title="거래 타임라인" aside={<span className="count-tag">{d.timeline.length}개 기록</span>}><Timeline entries={d.timeline} /></Section><div className="detail-side"><div className={`diagnosis tone-${signal.tone}`}><div className="diagnosis-head"><ShieldAlert size={18} /><strong>배송 문의 빠른 판단</strong></div><h3>{signal.title}</h3><p>{signal.body}</p></div><Section title="현재 운영 상태" eyebrow="AT A GLANCE"><div className="info-grid one"><Info label="내부 상태" value={<span className="mono">{d.status}</span>} /><Info label="구매자에게 보이는 상태" value={d.buyerFacingStatus} /><Info label="예상 전달일" value={d.estimatedDeliveryDate} /><Info label="운송장" value={d.shipment?.trackingNumber || (d.shipment ? '권한 없음' : '미등록')} mono /><Info label="분쟁" value={d.dispute ? '접수됨' : '기록 없음'} /></div></Section></div></div>
    <div className="detail-grid"><Section id="people" eyebrow="PARTIES & ROUTE" title="구매자 · 여행자 · 여행 일정"><div className="person-pair"><div><span>구매자</span><strong>{d.buyer.nickname}</strong><small className="mono">{d.buyer.id}</small></div><ArrowRight size={18} /><div><span>여행자</span><strong>{d.traveler.nickname}</strong><small className="mono">{d.traveler.id}</small></div></div>{d.trip ? <><div className="route-line"><span>{d.trip.from}</span><ArrowRight size={17} /><span>{d.trip.to}</span><small>{d.trip.startDate} – {d.trip.endDate}</small></div><div className="trip-visits">{d.trip.visits.map((visit, index) => <div key={`${visit.place}-${index}`}><span className="visit-dot" /><strong>{visit.place}</strong><small>{visit.date} {visit.time}</small></div>)}</div><p className="footnote">일정 인증: {d.trip.verificationStatus} · 귀국 예정은 실제 입국 확인이 아닙니다.</p></> : <div className="empty-inline">연결된 여행 일정 기록이 없습니다.</div>}</Section>
      <Section eyebrow="PRODUCT & REQUEST" title="상품 · 요청"><div className="info-grid"><Info label="요청번호" value={d.requestId} mono /><Info label="구매 장소" value={d.product?.place ? `${d.product.place.city} · ${d.product.place.name}` : null} /><Info label="상품명" value={d.product?.name} /><Info label="매장" value={d.product?.store} /><Info label="수량 / 옵션" value={d.product ? `${d.product.quantity}개 · ${text(d.product.option)}` : null} /><Info label="현지가" value={d.product?.localPrice == null ? '권한 없음' : `${d.product.localPrice.toLocaleString('ko-KR')} ${d.product.currency}`} /><Info label="희망 수령일" value={d.product?.desiredDate} /><Info label="상품 URL" value={d.product?.url ? <a href={d.product.url} target="_blank" rel="noopener noreferrer">외부 상품 페이지 ↗</a> : null} /></div></Section>
      <Section id="payment" eyebrow="MOCK MONEY FLOW" title="결제 · 보관 · 정산"><div className="money-breakdown"><div><span>상품 대금</span><strong>{won(d.amounts?.productPrice)}</strong></div><div><span>여행자 보상</span><strong>{won(d.amounts?.travelerReward)}</strong></div><div><span>국내 전달비</span><strong>{won(d.amounts?.shippingFee)}</strong></div><div className="total"><span>구매자 총액</span><strong>{won(d.amounts?.totalPrice)}</strong></div></div><div className="info-grid"><Info label="결제 상태" value={d.payment?.status || '미결제'} /><Info label="모의 결제번호" value={d.payment?.id} mono /><Info label="결제수단" value={d.payment?.provider} /><Info label="보관금" value={d.payment?.escrowStatus} /><Info label="정산 상태" value={d.payout?.status || '미정산'} /><Info label="모의 정산액" value={won(d.payout?.amount)} /><Info label="정산번호" value={d.payout?.id} mono /><Info label="정산 시각" value={d.payout ? formatDate(d.payout.createdAt) : null} /></div>{d.walletEntries?.length ? <div className="ledger"><strong>여행자 보관함 기록</strong>{d.walletEntries.map((entry) => <div key={entry.id}><span>{entry.type} · {formatDate(entry.createdAt)}</span><strong>{won(entry.amount)}</strong></div>)}</div> : <p className="footnote">연결된 보관함 기록이 없습니다. 실제 은행 출금은 이 프로토타입에 없습니다.</p>}</Section>
      <Section id="shipping" eyebrow="PROOF & LAST MILE" title="구매 인증 · 귀국 · 배송 · 수령">
        <div className="info-grid">
          <Info label="구매 인증" value={d.receipt?.outcome === 'PURCHASED' ? '구매 인증 등록' : d.receipt?.outcome === 'OUT_OF_STOCK' ? '구매 불가 증빙' : '미등록'} />
          <Info label="구매일" value={d.receipt?.purchasedAt} />
          <Info label="구매 매장" value={d.receipt?.store} />
          <Info label="증빙상 구매액" value={d.receipt ? d.receipt.localAmount == null ? '권한 없음' : `${d.receipt.localAmount.toLocaleString('ko-KR')} ${d.receipt.currency}` : null} />
          <Info label="귀국 예정일" value={d.trip?.endDate} />
          <Info label="배송/전달 방식" value={d.shipment?.transport === 'MEETUP' ? '직접 전달' : d.shipment ? '국내 택배' : '미등록'} />
          <Info label="배송사" value={d.shipment?.carrier} />
          <Info label="운송장" value={d.shipment?.trackingNumber || (d.shipment ? '권한 없음' : null)} mono />
          <Info label="배송 등록 시각" value={d.shipment ? formatDate(d.shipment.createdAt) : null} />
          <Info label="수령/확정 기록" value={formatDate(d.timeline.findLast((entry) => ['DELIVERED', 'CONFIRMED'].includes(entry.to || ''))?.createdAt)} />
        </div>
        {d.receipt && <>
          <p className="footnote">구매 장소 메모: {text(d.receipt.locationNote)}</p>
          <div className="evidence-grid"><Evidence value={d.receipt.productImage} label="상품 사진" /><Evidence value={d.receipt.receiptImage} label="영수증" /></div>
        </>}
        <div className="caution">운송장 번호는 여행자가 등록한 값입니다. 배송사 조회 API가 없어 배송 중/완료를 실시간 검증할 수 없습니다.</div>
      </Section>
      <Section id="chat" eyebrow="CONVERSATION & RISK" title="채팅 · 분쟁"><div className="chat-list">{d.chat === null ? <div className="empty-inline">이 역할은 채팅 내용에 접근할 수 없습니다.</div> : d.chat.length ? d.chat.map((message) => <div className={`chat-message ${message.system ? 'system' : ''}`} key={message.id}><div><strong>{message.sender.nickname}</strong><time>{formatDate(message.createdAt)}</time></div><p>{message.text}</p></div>) : <div className="empty-inline">채팅 기록이 없습니다.</div>}</div>{d.dispute && <div className="dispute-box"><ShieldAlert size={18} /><div><strong>분쟁 {d.dispute.status}</strong><p>{d.dispute.reason || '내용 접근 권한 없음'}</p><small>{d.dispute.openedBy.nickname} · {formatDate(d.dispute.createdAt)}</small></div></div>}</Section>
      <Section id="actions" eyebrow="ACCOUNTABILITY" title="관리자 조치"><div className="empty-inline">이 거래에 기록된 관리자 조치가 없습니다. 이 버전은 조회 전용이며, 상태 변경·환불·정산 보류 버튼을 제공하지 않습니다.</div><div className="limits"><strong>운영 판단 시 유의사항</strong>{d.dataLimits.map((item) => <span key={item}>• {item}</span>)}</div></Section></div>
  </>;
}

function App() {
  const { location, navigate } = useLocation();
  const [auth, setAuth] = useState<{ loading: boolean; admin: AdminIdentity | null }>({ loading: true, admin: null });
  useEffect(() => { adminApi.me().then((result) => setAuth({ loading: false, admin: result.admin })).catch(() => setAuth({ loading: false, admin: null })); }, []);
  useEffect(() => {
    const expired = () => setAuth({ loading: false, admin: null });
    window.addEventListener('moa-admin-auth-expired', expired);
    return () => window.removeEventListener('moa-admin-auth-expired', expired);
  }, []);
  if (auth.loading) return <div className="boot"><div className="brand-mark">M</div><span>운영 콘솔 준비 중…</span></div>;
  if (!auth.admin) return <Login onLogin={(admin) => setAuth({ loading: false, admin })} />;
  const id = location.split('?')[0].match(/^\/transactions\/([^/]+)$/)?.[1];
  const logout = async () => {
    try { await adminApi.logout(); setAuth({ loading: false, admin: null }); navigate('/'); }
    catch (error) { window.alert(`로그아웃에 실패했습니다. 다시 시도해주세요. ${(error as Error).message}`); }
  };
  return <Shell admin={auth.admin} location={location} navigate={navigate} onLogout={logout}>{id ? <TransactionDetailPage id={decodeURIComponent(id)} navigate={navigate} /> : location.startsWith('/transactions') ? <TransactionListPage location={location} navigate={navigate} admin={auth.admin} /> : <Dashboard navigate={navigate} />}</Shell>;
}

createRoot(document.getElementById('root')!).render(<App />);
