import React, { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, View } from 'react-native';
import { MapPin, Search } from 'lucide-react-native';
import * as Location from 'expo-location';
import { MeetupPoint } from '@moa/domain';
import { api } from '../lib/api';
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
  const [locating, setLocating] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [error, setError] = useState('');
  const [candidate, setCandidate] = useState<MeetupPoint | undefined>(value);
  const [center, setCenter] = useState({ latitude: value?.latitude ?? (country === 'JP' ? 35.6812 : 37.5665), longitude: value?.longitude ?? (country === 'JP' ? 139.7671 : 126.978), zoom: value ? 18 : 12 });
  const run = useRef(0);
  const locationRun = useRef(0);
  const locate = async () => {
    const current = ++locationRun.current;
    setLocating(true);
    setLocationError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (current !== locationRun.current) return;
      if (permission.status !== 'granted') {
        setLocationError(permission.canAskAgain
          ? '위치 권한을 허용하면 지도를 내 주변으로 바로 이동할 수 있어요.'
          : Platform.OS === 'web'
            ? '브라우저 주소창의 사이트 설정에서 위치를 허용한 뒤 다시 눌러주세요.'
            : '휴대폰 설정에서 MOA의 위치 권한을 허용한 뒤 다시 눌러주세요.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      if (current !== locationRun.current) return;
      const point: MeetupPoint = {
        name: '현재 위치 주변',
        address: '',
        detail: '',
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setCenter({ latitude: point.latitude, longitude: point.longitude, zoom: 17 });
      setCandidate(point);
      onChange(undefined);
    } catch {
      if (current === locationRun.current)
        setLocationError(Platform.OS === 'web' && typeof window !== 'undefined' && !window.isSecureContext
          ? '현재 위치는 HTTPS 주소 또는 localhost에서만 사용할 수 있어요. 안전한 주소로 다시 열어주세요.'
          : '현재 위치를 확인하지 못했어요. 위치 권한을 확인하거나 지도를 직접 움직여주세요.');
    } finally {
      if (current === locationRun.current) setLocating(false);
    }
  };
  useEffect(() => {
    let active = true;
    if (!value) {
      Location.getForegroundPermissionsAsync()
        .then((permission) => {
          if (!active) return;
          if (permission.status === 'granted') void locate();
          else setShowLocationPrompt(true);
        })
        .catch(() => { if (active) setShowLocationPrompt(true); });
    }
    return () => { active = false; run.current++; locationRun.current++; };
  }, []);
  const search = async () => {
    const current = ++run.current;
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
    <Modal visible={showLocationPrompt} transparent animationType="fade" onRequestClose={() => setShowLocationPrompt(false)}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: c.overlay }}>
        <Card style={{ width: '100%', maxWidth: 420, alignSelf: 'center' }}>
          <Stack gap={12}>
            <MapPin size={26} color={c.primary} />
            <Txt size={19} weight="700">내 주변 지도부터 볼까요?</Txt>
            <Txt size={13} color={c.secondary}>위치 권한을 허용하면 직거래 지도가 현재 위치로 이동해요. 허용하지 않아도 장소 검색과 지도 이동은 사용할 수 있어요.</Txt>
            <Button label="현재 위치 허용하기" icon={MapPin} onPress={() => { setShowLocationPrompt(false); void locate(); }} />
            <Button label="나중에 직접 찾기" kind="secondary" onPress={() => setShowLocationPrompt(false)} />
          </Stack>
        </Card>
      </View>
    </Modal>
    <Txt size={17} weight="700">직거래 희망 장소</Txt>
    <Txt size={13} color={c.secondary}>장소를 검색하고, 지도를 움직여 정확히 만날 지점을 맞춰주세요.</Txt>
    <Field label="장소 검색" value={query} onSubmit={search} onChange={(text) => { run.current++; setBusy(false); setQuery(text); setError(''); setResults([]); setSearched(false); }} placeholder="역, 동네, 건물 이름으로 검색" />
    <Button label="장소 검색하기" icon={Search} onPress={search} loading={busy} kind="secondary" />
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
    <View style={{ borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: c.border }}>
      <MeetupMap {...center} onMove={(latitude, longitude) => {
        setCandidate((p) => ({ name: p?.name || '지도에서 지정한 위치', address: p?.address || '', detail: p?.detail || '', providerId: p?.providerId, latitude, longitude }));
        const movedFromSavedPoint = !value || Math.abs(value.latitude - latitude) > 0.0000001 || Math.abs(value.longitude - longitude) > 0.0000001;
        if (movedFromSavedPoint) onChange(undefined);
      }} />
    </View>
    <Button label="현재 위치로 이동" icon={MapPin} onPress={locate} loading={locating} kind="secondary" />
    {!!locationError && <Notice>{locationError}</Notice>}
    <Txt size={12} color={c.secondary}>지도를 좌우·위아래로 움직이거나 눌러 파란 핀을 맞춰주세요. + 버튼으로 더 자세히 볼 수 있어요.</Txt>
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
