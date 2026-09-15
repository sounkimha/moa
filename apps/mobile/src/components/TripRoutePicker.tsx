import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Check, ChevronRight, Globe2, MapPin, Plus, X } from 'lucide-react-native';
import { Country, COUNTRY_CODES, DESTINATIONS, Place, TRIP_AREAS } from '@moa/domain';
import { Button, Row, SearchField, Sheet, Txt } from './ui';
import { colors as c } from '../theme/tokens';

export function TripRoutePicker({ country, areas, onChange }: {
  country: Country;
  areas: string[];
  onChange: (country: Country, areas: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [browsing, setBrowsing] = useState(country);
  const [selectedCountry, setSelectedCountry] = useState(country);
  const [selectedAreas, setSelectedAreas] = useState(areas);
  const normalized = query.trim().toLocaleLowerCase('ko-KR');
  const matches = useMemo(() => {
    if (!normalized) return [{ code: browsing, areas: TRIP_AREAS[browsing] }];
    return COUNTRY_CODES.map((code) => ({
      code,
      areas: TRIP_AREAS[code].filter((area) =>
        [DESTINATIONS[code].name, area.name, area.kind, ...area.stops]
          .some((text) => text.toLocaleLowerCase('ko-KR').includes(normalized))),
    })).filter((entry) => entry.areas.length > 0);
  }, [browsing, normalized]);
  const openPicker = () => {
    setSelectedCountry(country); setSelectedAreas(areas); setBrowsing(country); setQuery(''); setOpen(true);
  };
  const toggle = (code: Country, name: string) => {
    if (code !== selectedCountry) { setSelectedCountry(code); setSelectedAreas([name]); return; }
    if (!selectedAreas.includes(name) && selectedAreas.length >= 8) return;
    setSelectedAreas(selectedAreas.includes(name) ? selectedAreas.filter((area) => area !== name) : [...selectedAreas, name]);
  };
  const label = DESTINATIONS[country].name;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="여행지 선택 열기" aria-expanded={open} onPress={openPicker}
      style={({ pressed }) => ({ minHeight: 76, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.65 : 1 })}>
      <Globe2 size={22} color={c.green} strokeWidth={1.8} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt size={12} color={c.secondary}>{label}</Txt>
        <Txt size={19} weight="700">{areas.length ? areas.join(' · ') : `${label} 전역`}</Txt>
      </View>
      <ChevronRight size={20} color={c.muted} />
    </Pressable>
    <Sheet visible={open} title="여행지는 어디인가요?" subtitle="한 나라의 도시와 섬을 함께 골라요." onClose={() => setOpen(false)}
      footer={<Button label={selectedAreas.length ? `${selectedAreas.length}곳 선택 완료` : `${DESTINATIONS[selectedCountry].name} 전역으로 설정`} onPress={() => { onChange(selectedCountry, selectedAreas); setOpen(false); }} />}>
      <SearchField label="국가 도시 섬 검색" value={query} onChange={setQuery} placeholder="국가, 도시, 섬 검색" />
      {!normalized && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 20, paddingVertical: 8 }}>
        {COUNTRY_CODES.map((code) => <Pressable key={code} accessibilityRole="tab" accessibilityLabel={`${DESTINATIONS[code].name} 보기`} accessibilityState={{ selected: browsing === code }} aria-selected={browsing === code}
          onPress={() => setBrowsing(code)} style={{ minHeight: 44, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: browsing === code ? c.ink : 'transparent' }}>
          <Txt size={15} weight={browsing === code ? '700' : '500'} color={browsing === code ? c.ink : c.muted}>{DESTINATIONS[code].name}</Txt>
        </Pressable>)}
      </ScrollView>}
      {selectedAreas.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {selectedAreas.map((area) => <Pressable key={area} accessibilityRole="button" accessibilityLabel={`${area} 선택 해제`} onPress={() => setSelectedAreas(selectedAreas.filter((name) => name !== area))}
          style={{ paddingHorizontal: 12, minHeight: 36, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.mint }}>
          <Txt size={13} color={c.darkGreen} weight="600">{area}</Txt><X size={14} color={c.darkGreen} />
        </Pressable>)}
      </ScrollView>}
      {matches.map((entry) => <View key={entry.code} style={{ gap: 4 }}>
        {normalized && <Txt size={13} color={c.secondary} weight="600">{DESTINATIONS[entry.code].name}</Txt>}
        <Pressable accessibilityRole="radio" accessibilityLabel={`${DESTINATIONS[entry.code].name} 전역`} accessibilityState={{ checked: selectedCountry === entry.code && !selectedAreas.length }} aria-checked={selectedCountry === entry.code && !selectedAreas.length}
          onPress={() => { setSelectedCountry(entry.code); setSelectedAreas([]); }} style={{ paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderColor: c.border }}>
          <Globe2 size={20} color={c.secondary} /><View style={{ flex: 1, gap: 3 }}><Txt weight="600">{DESTINATIONS[entry.code].name} 전역</Txt><Txt size={12} color={c.secondary}>세부 일정은 나중에 정할게요</Txt></View>
          {selectedCountry === entry.code && !selectedAreas.length && <Check size={21} color={c.green} />}
        </Pressable>
        {entry.areas.map((area) => {
          const selected = selectedCountry === entry.code && selectedAreas.includes(area.name);
          const disabled = !selected && selectedCountry === entry.code && selectedAreas.length >= 8;
          return <Pressable key={area.name} accessibilityRole="checkbox" accessibilityLabel={`${area.name} 선택`} accessibilityState={{ checked: selected, disabled }} aria-checked={selected} aria-disabled={disabled} disabled={disabled} onPress={() => toggle(entry.code, area.name)}
            style={({ pressed }) => ({ paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: disabled ? 0.4 : pressed ? 0.65 : 1 })}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: selected ? c.mint : c.lilac, alignItems: 'center', justifyContent: 'center' }}><MapPin size={19} color={selected ? c.green : c.secondary} /></View>
            <View style={{ flex: 1, gap: 3 }}><Row><Txt size={16} weight="600">{area.name}</Txt><Txt size={11} color={c.muted}>{area.kind}</Txt></Row><Txt size={12} color={c.secondary} lines={1}>{area.stops.join(' · ')}</Txt></View>
            <View style={{ width: 23, height: 23, borderRadius: 8, borderWidth: selected ? 0 : 1.5, borderColor: c.border, backgroundColor: selected ? c.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{selected && <Check size={16} color="white" />}</View>
          </Pressable>;
        })}
      </View>)}
      {!matches.length && <View style={{ gap: 6, paddingVertical: 40, alignItems: 'center' }}><Txt weight="600">검색 결과가 없어요</Txt><Txt size={13} color={c.secondary}>국가나 가까운 도시 이름으로 찾아보세요.</Txt></View>}
      <Txt size={12} color={c.muted}>{selectedAreas.length}/8곳 선택 · 나라를 바꾸면 이전 여행지 선택이 바뀌어요.</Txt>
    </Sheet>
  </>;
}

export function TripStopPicker({ country, areas, catalog, placeIds, customStops, onChange }: {
  country: Country; areas: string[]; catalog: Place[]; placeIds: string[]; customStops: string[];
  onChange: (placeIds: string[], customStops: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [draftPlaces, setDraftPlaces] = useState(placeIds);
  const [draftStops, setDraftStops] = useState(customStops);
  const options = TRIP_AREAS[country].filter((area) => areas.includes(area.name));
  const selectedNames = [...catalog.filter((place) => placeIds.includes(place.id)).map((place) => place.name), ...customStops.map((stop) => stop.split(' · ').slice(1).join(' · '))];
  const needle = query.trim().toLocaleLowerCase('ko-KR');
  let resultCount = 0;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel="방문 예정지 선택" aria-expanded={open} onPress={() => { setDraftPlaces(placeIds); setDraftStops(customStops); setQuery(''); setOpen(true); }}
      style={({ pressed }) => ({ minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: pressed ? 0.65 : 1 })}>
      <MapPin size={21} color={c.secondary} /><View style={{ flex: 1, gap: 3 }}><Txt size={15} weight="600">{selectedNames.length ? selectedNames.join(' · ') : '방문할 곳 추가'}</Txt><Txt size={12} color={c.secondary}>{selectedNames.length ? `${selectedNames.length}곳 · 이 근처 부탁을 모아드려요` : '정해진 곳만 골라도 좋아요'}</Txt></View><Plus size={20} color={c.green} />
    </Pressable>
    <Sheet visible={open} title="어디에 들르세요?" subtitle="실제로 방문할 곳만 선택해주세요." onClose={() => setOpen(false)}
      footer={<Button label={draftPlaces.length + draftStops.length ? `${draftPlaces.length + draftStops.length}곳을 일정에 저장` : '방문지는 나중에 정할게요'} onPress={() => { onChange(draftPlaces, draftStops); setOpen(false); }} />}>
      <SearchField label="방문 예정지 검색" value={query} onChange={setQuery} placeholder="매장이나 동네를 검색해보세요" />
      {options.map((area) => {
        const known = catalog.filter((place) => place.country === country && place.city === area.name && `${area.name} ${place.name}`.toLocaleLowerCase('ko-KR').includes(needle));
        const stops = area.stops.filter((stop) => `${area.name} ${stop}`.toLocaleLowerCase('ko-KR').includes(needle) && !known.some((place) => place.name === stop));
        resultCount += known.length + stops.length;
        if (!known.length && !stops.length) return null;
        const row = (key: string, name: string, subtitle: string, selected: boolean, isCatalog: boolean) => {
          const disabled = !selected && (isCatalog ? draftPlaces.length >= 12 : draftStops.length >= 8);
          return <Pressable key={key} accessibilityRole="checkbox" accessibilityLabel={`${name} 방문`} accessibilityState={{ checked: selected, disabled }} aria-checked={selected} aria-disabled={disabled} disabled={disabled}
            onPress={() => isCatalog ? setDraftPlaces(selected ? draftPlaces.filter((id) => id !== key) : [...draftPlaces, key]) : setDraftStops(selected ? draftStops.filter((stop) => stop !== key) : [...draftStops, key])}
            style={{ paddingVertical: 16, flexDirection: 'row', alignItems: 'center', gap: 14, opacity: disabled ? 0.4 : 1 }}>
            <MapPin size={19} color={selected ? c.green : c.muted} /><View style={{ flex: 1, gap: 4 }}><Txt size={15} weight="600">{name}</Txt><Txt size={12} color={c.secondary}>{subtitle}</Txt></View>
            <View style={{ width: 23, height: 23, borderRadius: 8, borderWidth: selected ? 0 : 1.5, borderColor: c.border, backgroundColor: selected ? c.green : 'transparent', alignItems: 'center', justifyContent: 'center' }}>{selected && <Check size={16} color="white" />}</View>
          </Pressable>;
        };
        return <View key={area.name}><Txt size={13} color={c.secondary} weight="700" style={{ marginBottom: 4 }}>{area.name}</Txt>
          {known.map((place) => row(place.id, place.name, `매장 · 부탁 ${place.requestCount}건`, draftPlaces.includes(place.id), true))}
          {stops.map((stop) => { const key = `${area.name} · ${stop}`; return row(key, stop, `${area.name} · ${stop}`, draftStops.includes(key), false); })}
        </View>;
      })}
      {!resultCount && <View style={{ gap: 6, paddingVertical: 32 }}><Txt weight="600">{areas.length ? '검색 결과가 없어요' : '도시나 섬을 먼저 골라주세요'}</Txt><Txt size={13} color={c.secondary}>{areas.length ? '가까운 동네 이름으로 다시 찾아보세요.' : '세부 여행지를 고르면 방문할 곳을 찾을 수 있어요.'}</Txt></View>}
    </Sheet>
  </>;
}
