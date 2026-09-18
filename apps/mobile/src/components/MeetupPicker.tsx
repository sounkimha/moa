import React, { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { MapPin, Search } from 'lucide-react-native';
import { MeetupPoint } from '@moa/domain';
import { api } from '../lib/api';
import { GOOGLE_WEB_MAPS_KEY } from '../lib/maps-config';
import { colors as c } from '../theme/tokens';
import { Button, Card, Field, Notice, Row, Stack, Txt } from './ui';
import MeetupMap from './MeetupMap';

export function MeetupPicker({ value, onChange, history, legacyName, country = 'KR' }: {
  value?: MeetupPoint; onChange: (point?: MeetupPoint) => void;
  history: MeetupPoint[]; legacyName?: string;
  country?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MeetupPoint[]>([]);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [searchAvailable, setSearchAvailable] = useState<boolean | undefined>();
  const mapCanPick = Boolean(Platform.OS === 'web' ? GOOGLE_WEB_MAPS_KEY : process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY?.trim());
  const [candidate, setCandidate] = useState<MeetupPoint | undefined>(value);
  const [center, setCenter] = useState({ latitude: value?.latitude ?? (country === 'JP' ? 35.6812 : 37.5665), longitude: value?.longitude ?? (country === 'JP' ? 139.7671 : 126.978), zoom: value ? 18 : 12 });
  const run = useRef(0);
  useEffect(() => () => { run.current++; }, []);
  useEffect(() => {
    let active = true;
    api<{ searchAvailable: boolean }>('/meetup/status').then((status) => { if (active) setSearchAvailable(status.searchAvailable); }).catch(() => { /* Search still permits retry if capability lookup fails. */ });
    return () => { active = false; };
  }, []);
  const search = async () => {
    const current = ++run.current;
    if (searchAvailable === false) { setError('이 환경에서는 장소 이름 검색이 아직 연결되지 않았어요. 지도에서 만날 위치를 지정해주세요.'); return; }
    if (country !== 'KR') { setError('현재 이름 검색은 국내 장소만 지원해요. 일본 수령은 지도에서 위치를 직접 지정해주세요.'); return; }
    if (query.trim().length < 2) { setError('장소 이름을 두 글자 이상 입력해주세요.'); return; }
    setBusy(true); setError(''); setSearched(false); setResults([]);
    try {
      const response = await api<{ results: MeetupPoint[] }>(`/meetup/search?q=${encodeURIComponent(query.trim())}`);
      if (current !== run.current) return;
      setResults(response.results); setSearched(true);
    } catch (e) { if (current === run.current) setError((e as Error).message); }
    finally { if (current === run.current) setBusy(false); }
  };
  const select = (point: MeetupPoint) => {
    setCandidate(point); setCenter({ latitude: point.latitude, longitude: point.longitude, zoom: 18 });
    setResults([]); setSearched(false); onChange(undefined);
  };
  return <Stack gap={12}>
    <Txt size={13} color={c.secondary}>{mapCanPick ? '지도를 움직이면 위에 현재 위치가 바로 표시돼요.' : '검색한 장소나 이전에 만났던 장소를 선택해주세요.'}</Txt>
    <Field label="장소 검색" value={query} onSubmit={search} onChange={(text) => { run.current++; setBusy(false); setQuery(text); setError(''); setResults([]); setSearched(false); }} placeholder="역, 동네, 건물 이름으로 검색" />
    <Button label="장소 검색하기" icon={Search} onPress={search} loading={busy} disabled={searchAvailable === false || country !== 'KR'} kind="secondary" />
    {searchAvailable === false && <Notice>{mapCanPick ? '이 환경에서는 장소 이름 검색이 아직 연결되지 않았어요. 아래 지도에서 위치를 지정할 수 있어요.' : '장소 검색과 지도 연결을 준비 중이에요. 이전 만남 장소를 선택하거나 국내 택배를 이용해주세요.'}</Notice>}
    {country !== 'KR' && <Notice>현재 장소 이름 검색은 한국만 지원해요. 지도에서 만날 위치를 지정해주세요.</Notice>}
    {error !== '' && <Notice tone="error">{error}</Notice>}
    {searched && results.length === 0 && <Notice>검색 결과가 없어요. 지역명을 함께 넣거나 지도에서 직접 위치를 지정해주세요.</Notice>}
    {results.length > 0 && <Stack gap={8}>
      <Txt size={12} color={c.secondary}>검색 결과 · Kakao</Txt>
      {results.map((point) => <Pressable accessibilityRole="button" accessibilityLabel={`${point.name} 지도에서 확인`} key={point.providerId} onPress={() => select(point)}>
        <Card><Row><MapPin size={20} color={c.green} /><View style={{ flex: 1 }}><Txt weight="700">{point.name}</Txt><Txt size={12} color={c.secondary}>{point.address}</Txt></View></Row></Card>
      </Pressable>)}
    </Stack>}
    {!query && history.length > 0 && <Stack gap={8}>
      <Txt size={14} weight="600">이전에 했던 직거래 장소</Txt>
      {history.map((point, index) => <Button key={index} label={point.name} kind="secondary" icon={MapPin} onPress={() => select(point)} />)}
    </Stack>}
    {!candidate && legacyName && <Notice>이전 부탁의 장소: {legacyName}. 지도에서 정확한 위치를 다시 확인해주세요.</Notice>}
    {candidate && <View style={{ padding: 14, borderRadius: 14, backgroundColor: c.primarySoft, borderWidth: 1, borderColor: c.primaryTint, gap: 4 }}>
      <Txt size={12} color={c.primaryDeep}>현재 선택 위치</Txt>
      <Row style={{ gap: 8, alignItems: 'flex-start' }}><MapPin size={18} color={c.primaryStrong} /><View style={{ flex: 1, minWidth: 0 }}><Txt weight="700" lines={1}>{candidate.name}</Txt>{!!candidate.address && <Txt size={12} color={c.secondary} lines={2}>{candidate.address}</Txt>}</View></Row>
    </View>}
    <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: c.border }}>
      <MeetupMap {...center} onMove={(latitude, longitude, name, address) => {
        setCandidate((p) => ({ name: name || '위치를 확인하는 중…', address: address || '', detail: p?.detail || '', latitude, longitude }));
        onChange(undefined);
      }} />
    </View>
    {mapCanPick && <Txt size={12} color={c.secondary}>지도를 좌우·위아래로 움직이거나 눌러 파란 핀을 맞춰주세요. + 버튼으로 더 자세히 볼 수 있어요.</Txt>}
    {candidate && <Stack gap={8}>
      <Txt weight="700">{candidate.name}</Txt>
      {!!candidate.address && <Txt size={12} color={c.secondary}>검색한 장소 주소 · {candidate.address}</Txt>}
      <Txt size={12} color={c.secondary}>만날 지점 · {candidate.latitude.toFixed(6)}, {candidate.longitude.toFixed(6)}</Txt>
      <Field label="만나는 위치 상세 설명" value={candidate.detail} onChange={(detail) => { setCandidate({ ...candidate, detail: detail.slice(0, 100) }); onChange(undefined); }} placeholder="예: 1번 출구 지상, 편의점 앞" />
      <Button label={value ? '직거래 위치가 저장됐어요' : '이 위치에서 만날게요'} kind={value ? 'secondary' : 'primary'} disabled={!!value} onPress={() => onChange(candidate)} />
    </Stack>}
    <Txt size={12} color={c.secondary}>검색어는 장소 검색 서비스로 전송돼요. 정확한 위치와 상세 설명은 매칭된 상대에게만 공유해요.</Txt>
    <Notice>정확한 시간은 여행자와 매칭된 뒤 거래 채팅에서 정해요.</Notice>
  </Stack>;
}
