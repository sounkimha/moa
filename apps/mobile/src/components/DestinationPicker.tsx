import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Check, ChevronRight, Globe2, Search, X } from 'lucide-react-native';
import { Country, COUNTRY_CODES, DESTINATIONS } from '@moa/domain';
import { Button, Chip, IconButton, Row, Stack, Txt } from './ui';
import { colors as c } from '../theme/tokens';

export type DestinationCountry = Country | 'ALL';
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
  const [menu, setMenu] = useState<'popular' | 'all'>('popular');
  const popular = ['JP', 'KR', 'TW', 'TH', 'VN'] as Country[];
  const results = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase('ko-KR');
    const source = keyword ? COUNTRY_CODES : menu === 'popular' ? popular : COUNTRY_CODES;
    return source.filter((code) => {
      const item = DESTINATIONS[code];
      return !keyword || item.name.toLocaleLowerCase('ko-KR').includes(keyword) || item.cities.some((city) => city.toLocaleLowerCase('ko-KR').includes(keyword));
    });
  }, [menu, query]);
  if (searchable) {
    const selectedName = country === 'ALL' ? '아시아 전체' : DESTINATIONS[country].name;
    const complete = country === 'ALL' || cities.length > 0 || allowCountryOnly;
    return <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="여행 국가 검색 열기"
        onPress={() => setOpen(true)}
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
            <Row style={{ paddingHorizontal: 20, paddingBottom: 14 }}>
              <View style={{ flex: 1 }}><Txt size={21} weight="800">어디로 떠나세요?</Txt><Txt size={13} color={c.secondary}>국가나 도시를 검색해보세요.</Txt></View>
              <IconButton icon={X} label="닫기" onPress={() => setOpen(false)} />
            </Row>
            <View style={{ marginHorizontal: 20, marginBottom: 14, minHeight: 52, borderRadius: 15, backgroundColor: c.paper, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, gap: 10 }}>
              <Search size={20} color={c.muted} />
              <TextInput
                autoFocus
                accessibilityLabel="국가 또는 도시 검색"
                value={query}
                onChangeText={setQuery}
                placeholder="예: 일본, 도쿄, 다낭"
                placeholderTextColor={c.muted}
                autoCapitalize="none"
                style={[
                  { flex: 1, minHeight: 52, fontSize: 16, color: c.ink },
                  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as never) : undefined,
                ]}
              />
              {query.length > 0 && <IconButton icon={X} label="검색어 지우기" onPress={() => setQuery('')} />}
            </View>
            {!query && <Row style={{ paddingHorizontal: 20, paddingBottom: 10, gap: 8 }}>
              {(['popular', 'all'] as const).map((value) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: menu === value }} aria-selected={menu === value} onPress={() => setMenu(value)} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 11, backgroundColor: menu === value ? c.ink : c.paper }}><Txt size={13} weight="700" color={menu === value ? 'white' : c.secondary}>{value === 'popular' ? '인기 국가' : '전체 국가'}</Txt></Pressable>)}
            </Row>}
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}>
              {results.map((code) => {
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
            <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingHorizontal: 20, borderTopWidth: 1, borderColor: c.border, backgroundColor: c.paper }}>
              <Button label={complete ? `${selectedName}${cities.length ? ` · ${cities.length}개 도시` : '만'} 선택 완료` : '도시를 선택해주세요'} disabled={!complete} onPress={() => { setOpen(false); setQuery(''); }} />
            </View>
          </View>
        </View>
      </Modal>
    </>;
  }
  return <Stack gap={12}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {allowAll && <Chip label="아시아 전체" selected={country === 'ALL'} onPress={() => onChange('ALL', [])} />}
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
