import React, { useEffect, useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import { ArrowRight, Check, MapPin, Plane } from 'lucide-react-native';
import { Country, DESTINATIONS, Trip, countryName } from '@moa/domain';
import { DestinationPicker } from '../components/DestinationPicker';
import { Badge, Button, Card, Chip, DateField, Field, Notice, Page, Row, Section, Stack, Txt } from '../components/ui';
import { useApp } from '../state/AppContext';
import { colors as c } from '../theme/tokens';

const future = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

export function TripForm() {
  const a = useApp(), d = a.data!, saved = a.tripDraft;
  const initialCountry: Country = saved?.destinationCountry || 'JP';
  const knownCities = DESTINATIONS[initialCountry].cities;
  const initialCities = saved
    ? saved.cities.filter((city) => knownCities.includes(city))
    : ['도쿄'];
  const defaultPlaces = d.places
    .filter((place) => place.country === initialCountry && initialCities.includes(place.city))
    .slice(0, 2)
    .map((place) => place.id);
  const initialPlaces = saved
    ? saved.placeIds.filter((id) => d.places.some((place) =>
      place.id === id && place.country === initialCountry && initialCities.includes(place.city)))
    : defaultPlaces;
  const initialStart = saved?.startDate && saved.startDate >= future(0) ? saved.startDate : future(4);
  const initialEnd = saved?.endDate && saved.endDate >= initialStart ? saved.endDate : future(7);
  const [departure, setDeparture] = useState(saved?.departureCity ?? '서울'),
    [depCountry, setDepCountry] = useState<'KR' | 'JP'>(saved?.departureCountry ?? 'KR'),
    [country, setCountry] = useState<Country>(initialCountry),
    [cities, setCities] = useState<string[]>(initialCities),
    [start, setStart] = useState(initialStart),
    [end, setEnd] = useState(initialEnd),
    [places, setPlaces] = useState<string[]>(initialPlaces),
    [capacity, setCapacity] = useState(saved?.capacity ?? '8'),
    [error, setError] = useState('');
  const available = d.places.filter((place) => place.country === country && cities.includes(place.city));
  const selectedPlaces = places.map((id) => d.places.find((place) => place.id === id)).filter(Boolean);

  useEffect(() => {
    a.setTripDraft({
      departureCountry: depCountry,
      departureCity: departure,
      destinationCountry: country,
      cities,
      startDate: start,
      endDate: end,
      placeIds: places,
      capacity,
    });
  }, [depCountry, departure, country, cities, start, end, places, capacity]);

  const changeDestination = (nextCountry: Country | 'ALL', selectedCities: string[]) => {
    if (nextCountry === 'ALL') return;
    const nextCities = nextCountry !== country && !selectedCities.length
      ? [DESTINATIONS[nextCountry].cities[0]]
      : selectedCities;
    setCountry(nextCountry);
    setCities(nextCities);
    setPlaces((current) => current.filter((id) => {
      const place = d.places.find((item) => item.id === id);
      return place?.country === nextCountry && nextCities.includes(place.city);
    }));
    setError('');
  };

  const togglePlace = (id: string) => {
    setPlaces((current) => current.includes(id)
      ? current.filter((placeId) => placeId !== id)
      : [...current, id]);
    setError('');
  };

  const submit = async () => {
    const count = Number(capacity);
    if (!departure.trim()) {
      setError('출발 도시를 입력해주세요.');
      return;
    }
    if (!Number.isInteger(count) || count < 1 || count > 20) {
      setError('처리 가능한 상품 수량은 1개에서 20개 사이로 입력해주세요.');
      return;
    }
    if (start < future(0) || end < start) {
      setError('오늘 이후의 시작일과 그 이후의 종료일을 선택해주세요.');
      return;
    }
    if (!cities.length) {
      setError('방문할 도시를 하나 이상 골라주세요.');
      return;
    }
    const missingCity = cities.find((city) => !places.some((id) =>
      d.places.find((place) => place.id === id)?.city === city));
    if (missingCity) {
      setError(`${missingCity}에서 방문할 장소를 하나 이상 골라주세요.`);
      return;
    }
    const trip = await a.mutate<Trip>(
      '/trips',
      {
        departureCountry: depCountry,
        departureCity: departure.trim(),
        destinationCountry: country,
        destinationCity: cities[0],
        startDate: start,
        endDate: end,
        placeIds: places,
        maxItems: count,
      },
      '여행을 등록했어요. 왕복 항공권을 확인해주세요.',
    );
    if (trip) {
      a.setTripDraft(null);
      a.setRole('traveler');
      a.nav('flight-proof', { id: trip.id });
    }
  };

  return <Page
    title="어디로 떠나세요?"
    resetScrollKey={error}
    footer={<Button label="일정 저장하고 항공권 인증하기" icon={ArrowRight} loading={a.busy} onPress={submit} />}
  >
    <Stack gap={8}>
      <Badge>{saved ? '임시 저장한 일정' : '여행 일정 등록'}</Badge>
      <Txt size={29} weight="800">원래 가는 그 길에,{'\n'}작은 보상을 더해요.</Txt>
      <Txt size={13} color={c.secondary}>
        {Platform.OS === 'web' ? '이 탭에서 새로고침해도 입력한 일정이 유지돼요.' : '등록하기 전까지 이 화면의 입력을 임시로 유지해요.'}
      </Txt>
    </Stack>
    {error.length > 0 && <Notice tone="error">{error}</Notice>}

    <Card>
      <Stack gap={16}>
        <Section title="어디에서 출발하나요?" subtitle="항공권의 출발 구간과 대조할 때 사용해요." />
        <Row style={{ flexWrap: 'wrap' }}>
          <Chip label="한국 출발" selected={depCountry === 'KR'} onPress={() => { setDepCountry('KR'); setDeparture('서울'); setError(''); }} />
          <Chip label="일본 출발" selected={depCountry === 'JP'} onPress={() => { setDepCountry('JP'); setDeparture('도쿄'); setError(''); }} />
        </Row>
        <Field label="출발 도시" required value={departure} onChange={(value) => { setDeparture(value); setError(''); }} placeholder="예: 서울" />
      </Stack>
    </Card>

    <Card>
      <Stack gap={16}>
        <Section title="어디로 여행 가시나요?" subtitle="한 국가·지역 안에서 여러 도시를 고를 수 있어요." />
        <DestinationPicker country={country} cities={cities} multiple onChange={changeDestination} />
      </Stack>
    </Card>

    <Card>
      <Stack gap={16}>
        <Section title="언제 다녀오나요?" subtitle="여행 기간 안에 구매할 수 있는 부탁만 연결해요." />
        <DateField label="여행 시작일" value={start} onChange={(value) => { setStart(value); if (end < value) setEnd(value); setError(''); }} min={future(0)} />
        <DateField label="여행 종료일" value={end} onChange={(value) => { setEnd(value); setError(''); }} min={start} />
      </Stack>
    </Card>

    <View>
      <Section title="들를 곳을 골라주세요" subtitle="선택한 장소에 있는 부탁만 추천해요." />
      {!cities.length && <Notice tone="warning">먼저 방문할 도시를 하나 이상 선택해주세요.</Notice>}
      {!!cities.length && !available.length && <Notice tone="warning">선택한 도시에 등록된 장소가 아직 없어요. 다른 도시를 골라주세요.</Notice>}
      {cities.map((city) => {
        const cityPlaces = available.filter((place) => place.city === city);
        const selectedCount = cityPlaces.filter((place) => places.includes(place.id)).length;
        if (!cityPlaces.length) return null;
        return <Stack key={city} gap={10} style={{ marginBottom: 20 }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt weight="700">{city}</Txt>
            <Badge>{selectedCount ? `${selectedCount}곳 선택` : '선택 필요'}</Badge>
          </Row>
          {cityPlaces.map((place) => {
            const selected = places.includes(place.id);
            return <Pressable
              key={place.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${place.name}, ${selected ? '선택됨' : '선택 안 됨'}`}
              onPress={() => togglePlace(place.id)}
              style={({ pressed }) => ({
                backgroundColor: selected ? c.mint : c.paper,
                borderWidth: 1,
                borderColor: selected ? c.green : c.border,
                borderRadius: 16,
                padding: 18,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <Row>
                <MapPin size={22} color={selected ? c.green : c.secondary} />
                <View style={{ flex: 1 }}>
                  <Txt weight="700">{place.name}</Txt>
                  <Txt size={12} color={c.secondary}>{place.region} · 예시 요청 {place.requestCount}건</Txt>
                </View>
                <View style={{ width: 23, height: 23, borderRadius: 7, borderWidth: 1, borderColor: selected ? c.green : c.border, backgroundColor: selected ? c.green : c.paper, alignItems: 'center', justifyContent: 'center' }}>
                  {selected && <Check size={16} color="white" />}
                </View>
              </Row>
            </Pressable>;
          })}
        </Stack>;
      })}
    </View>

    <Field
      label="최대 처리 가능한 상품 수량"
      required
      value={capacity}
      onChange={(value) => { setCapacity(value.replace(/[^0-9]/g, '').slice(0, 2)); setError(''); }}
      keyboard="numeric"
      hint="여유 시간과 짐의 크기를 생각해 1~20개 사이로 정해주세요."
      error={capacity && Number(capacity) > 20 ? '최대 20개까지 등록할 수 있어요.' : undefined}
    />

    <Card style={{ backgroundColor: c.mint }}>
      <Stack gap={12}>
        <Row>
          <Plane size={20} color={c.green} />
          <Txt size={17} weight="700">등록할 여행 요약</Txt>
        </Row>
        <Row style={{ flexWrap: 'wrap' }}>
          <Badge>{departure.trim() || '출발 도시'}</Badge>
          <Txt color={c.secondary}>→</Txt>
          <Badge>{cities.length ? cities.join(' · ') : countryName(country)}</Badge>
        </Row>
        <Txt size={13} color={c.secondary}>{start} ~ {end}</Txt>
        <Txt size={13} color={c.secondary}>
          {selectedPlaces.length ? selectedPlaces.map((place) => place!.name).join(' → ') : '방문 장소를 선택해주세요.'}
        </Txt>
      </Stack>
    </Card>

    <Notice>
      다음 화면에서 왕복 항공권을 인식하고 일정과 대조해요. 항공권 인식은 발권 진위 확인과 다르며,
      실제 항공사·본인확인 연동 전에는 새 일정으로 부탁을 수락할 수 없어요.
    </Notice>
  </Page>;
}
