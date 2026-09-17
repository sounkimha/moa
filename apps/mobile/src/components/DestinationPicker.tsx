import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Check, ChevronRight, Globe2, Search, X } from 'lucide-react-native';
import { Country, COUNTRY_CODES, DESTINATIONS } from '@moa/domain';
import { Button, Chip, IconButton, Row, Stack, Txt } from './ui';
import { colors as c } from '../theme/tokens';

export type DestinationCountry = Country | 'ALL';
const regionGroups: { label: string; codes: Country[] }[] = [
  { label: '대한민국', codes: ['KR'] },
  { label: '동북아시아', codes: ['JP', 'TW', 'HK', 'CN'] },
  { label: '동남아시아·서남아시아', codes: ['TH', 'VN', 'SG', 'MY', 'ID', 'IN', 'PH', 'KH'] },
  { label: '미주', codes: ['US', 'CA', 'MX', 'BR', 'AR', 'CL', 'PE', 'CO'] },
  { label: '유럽', codes: ['GB', 'FR', 'IT', 'ES', 'DE', 'CH'] },
  { label: '대양주·괌', codes: ['AU', 'NZ'] },
  { label: '러시아·몽골·중앙아시아', codes: [] },
  { label: '중동·아프리카', codes: ['AE', 'TR', 'ZA', 'EG', 'MA', 'KE', 'TZ'] },
];
export function DestinationPicker({ country, cities, onChange, multiple = false, allowAll = false, searchable = false, allowCountryOnly = false }: {
  country: DestinationCountry;
  cities: string[];
  onChange: (country: DestinationCountry, cities: string[]) => void;
  multiple?: boolean;
  allowAll?: boolean;
  searchable?: boolean;
  allowCountryOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [regionMode, setRegionMode] = useState(false);
  const [expandedRegion, setExpandedRegion] = useState('');
  const popular = ['JP', 'KR', 'US', 'FR', 'GB', 'ID', 'TH', 'VN'] as Country[];
  const results = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('ko-KR');
    const source = keyword ? COUNTRY_CODES : popular;
    return source.filter((code) => {
      const item = DESTINATIONS[code];
      return !keyword || item.name.toLocaleLowerCase('ko-KR').includes(keyword) || item.cities.some((city) => city.toLocaleLowerCase('ko-KR').includes(keyword));
    });
  }, [query]);
  if (searchable) {
    const selectedName = country === 'ALL' ? '전체 국가' : DESTINATIONS[country].name;
    const complete = country === 'ALL' || cities.length > 0 || allowCountryOnly;
    return <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="여행 국가 검색 열기"
        onPress={() => { setRegionMode(false); setExpandedRegion(''); setQuery(''); setOpen(true); }}
        style={{ minHeight: 74, padding: 16, borderRadius: 16, backgroundColor: c.paper }}
      >
        <Row>
          <View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: c.mint, alignItems: 'center', justifyContent: 'center' }}><Globe2 size={21} color={c.green} /></View>
          <View style={{ flex: 1 }}>
            <Txt size={12} color={c.secondary}>국가·도시</Txt>
            <Txt size={17} weight="700" lines={1}>{selectedName}{cities.length ? ` · ${cities.join(' · ')}` : allowCountryOnly ? ' · 세부 지역 미정' : ' 선택'}</Txt>
          </View>
          <ChevronRight size={20} color={c.muted} />
        </Row>
      </Pressable>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#11182766' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="여행지 검색 닫기" onPress={() => setOpen(false)} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
          <View style={{ maxHeight: '88%', minHeight: '72%', borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: c.canvas, paddingTop: 10, overflow: 'hidden' }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: c.border, alignSelf: 'center', marginBottom: 8 }} />
            <Row style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
              <View style={{ flex: 1 }}><Txt size={21} weight="800">{regionMode ? '지역과 도시 선택' : '도착지'}</Txt>{!regionMode && <Txt size={13} color={c.secondary}>도시나 공항을 검색해보세요.</Txt>}</View>
              <IconButton icon={X} label="닫기" onPress={() => setOpen(false)} />
            </Row>
            {!regionMode && <View style={{ marginHorizontal: 20, marginBottom: 14, minHeight: 58, borderRadius: 14, borderWidth: 1.5, borderColor: c.ink, backgroundColor: c.paper, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 }}>
              <Search size={20} color={c.muted} />
              <TextInput
                autoFocus
                accessibilityLabel="국가 또는 도시 검색"
                value={query}
                onChangeText={setQuery}
                placeholder="도시, 공항"
                placeholderTextColor={c.muted}
                autoCapitalize="none"
                style={[
                  { flex: 1, minHeight: 52, fontSize: 16, color: c.ink },
                  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as never) : undefined,
                ]}
              />
              {query.length > 0 && <IconButton icon={X} label="검색어 지우기" onPress={() => setQuery('')} />}
            </View>}
            {!regionMode && !query && <Pressable accessibilityRole="button" accessibilityLabel="모든 지역 보기" onPress={() => setRegionMode(true)} style={{ marginHorizontal: 20, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}><Globe2 size={19} color={c.ink} /><Txt size={15} weight="600" color={c.ink} style={{ textDecorationLine: 'underline' }}>모든 지역 보기</Txt><ChevronRight size={17} color={c.ink} /></Pressable>}
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
              {regionMode && !query ? regionGroups.map((group) => <View key={group.label} style={{ marginBottom: 10, borderRadius: 15, borderWidth: 1, borderColor: c.border, backgroundColor: c.paper, overflow: 'hidden' }}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${group.label} 지역 펼치기`} onPress={() => setExpandedRegion(expandedRegion === group.label ? '' : group.label)} style={{ minHeight: 68, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}><Txt size={16} weight="600" style={{ flex: 1 }}>{group.label}</Txt><ChevronRight size={19} color={c.ink} style={{ transform: [{ rotate: expandedRegion === group.label ? '90deg' : '0deg' }] }} /></Pressable>
                {expandedRegion === group.label && <View style={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}>{group.codes.length ? group.codes.map((code) => { const item = DESTINATIONS[code]; return <Pressable key={code} accessibilityRole="button" accessibilityLabel={`${item.name} 선택`} onPress={() => { onChange(code, []); setOpen(false); }} style={{ paddingVertical: 11, borderTopWidth: 1, borderColor: c.border, flexDirection: 'row', alignItems: 'center' }}><View style={{ flex: 1 }}><Txt size={15} weight="600">{item.name}</Txt><Txt size={12} color={c.secondary}>{item.cities.join(' · ')}</Txt></View><ChevronRight size={17} color={c.muted} /></Pressable>; }) : <Txt size={13} color={c.secondary} style={{ paddingVertical: 8 }}>곧 더 많은 지역을 준비할게요.</Txt>}</View>}
              </View>) : null}
              {!regionMode && results.map((code) => {
                const selected = country === code;
                const item = DESTINATIONS[code];
                return <View key={code} style={{ marginBottom: 10, borderRadius: 17, backgroundColor: c.paper, overflow: 'hidden' }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`${item.name} 선택`} onPress={() => { if (!selected) onChange(code, []); }} style={{ minHeight: 62, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ flex: 1 }}><Txt size={16} weight="700">{item.name}</Txt><Txt size={12} color={c.secondary}>{item.cities.join(' · ')}</Txt></View>
                    {selected ? <Check size={21} color={c.green} /> : <ChevronRight size={19} color={c.muted} />}
                  </Pressable>
                  {selected && <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 12 }}>
                    {allowCountryOnly && <Pressable accessibilityRole="radio" accessibilityLabel={`${item.name}만 선택`} accessibilityState={{ checked: cities.length === 0 }} aria-checked={cities.length === 0} onPress={() => onChange(code, [])} style={{ padding: 14, borderRadius: 14, backgroundColor: cities.length === 0 ? c.mint : c.canvas, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ flex: 1 }}><Txt size={14} weight="700">{item.name}만 선택</Txt><Txt size={12} color={c.secondary}>세부 여행지는 나중에 정해도 좋아요.</Txt></View>
                      {cities.length === 0 && <Check size={19} color={c.green} />}
                    </Pressable>}
                    <View><Txt size={12} weight="600" color={c.secondary} style={{ marginBottom: 8 }}>도시를 안다면 골라주세요</Txt><Row style={{ flexWrap: 'wrap', gap: 8 }}>
                      {item.cities.map((city) => <Chip key={city} label={city} selected={cities.includes(city)} onPress={() => onChange(code, multiple ? cities.includes(city) ? cities.filter((value) => value !== city) : [...cities, city] : [city])} />)}
                    </Row></View>
                  </View>}
                </View>;
              })}
              {!results.length && <View style={{ paddingVertical: 48, alignItems: 'center' }}><Txt weight="700">검색 결과가 없어요</Txt><Txt size={13} color={c.secondary}>다른 국가나 도시 이름으로 찾아보세요.</Txt></View>}
            </ScrollView>
            {!regionMode && <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingHorizontal: 20, borderTopWidth: 1, borderColor: c.border, backgroundColor: c.paper }}><Button label={complete ? `${selectedName}${cities.length ? ` · ${cities.length}개 도시` : '만'} 선택 완료` : '도시를 선택해주세요'} disabled={!complete} onPress={() => { setOpen(false); setQuery(''); }} /></View>}
          </View>
        </View>
      </Modal>
    </>;
  }
  return <Stack gap={12}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {allowAll && <Chip label="전체 국가" selected={country === 'ALL'} onPress={() => onChange('ALL', [])} />}
      {COUNTRY_CODES.map((code) => <Chip key={code} label={DESTINATIONS[code].name} selected={country === code} onPress={() => { if (country !== code) onChange(code, []); }} />)}
    </ScrollView>
    {country !== 'ALL' ? <Stack gap={10}>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {allowAll && <Chip label={`${DESTINATIONS[country].name} 전체`} selected={!cities.length} onPress={() => onChange(country, [])} />}
        {DESTINATIONS[country].cities.map((city) => <Chip key={city} label={city} selected={cities.includes(city)} onPress={() => onChange(country, multiple
          ? cities.includes(city) ? cities.filter((v) => v !== city) : [...cities, city]
          : [city])} />)}
      </Row>
    </Stack> : null}
  </Stack>;
}
