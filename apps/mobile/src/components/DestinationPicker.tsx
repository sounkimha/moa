import React from 'react';
import { ScrollView } from 'react-native';
import { Country, COUNTRY_CODES, DESTINATIONS } from '@moa/domain';
import { Chip, Row, Stack, Txt } from './ui';
import { colors as c } from '../theme/tokens';

export type DestinationCountry = Country | 'ALL';
export function DestinationPicker({ country, cities, onChange, multiple = false, allowAll = false }: {
  country: DestinationCountry;
  cities: string[];
  onChange: (country: DestinationCountry, cities: string[]) => void;
  multiple?: boolean;
  allowAll?: boolean;
}) {
  return <Stack gap={12}>
    <Txt size={13} weight="600" color={c.secondary}>국가·지역</Txt>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {allowAll && <Chip label="아시아 전체" selected={country === 'ALL'} onPress={() => onChange('ALL', [])} />}
      {COUNTRY_CODES.map((code) => <Chip key={code} label={DESTINATIONS[code].name} selected={country === code} onPress={() => { if (country !== code) onChange(code, []); }} />)}
    </ScrollView>
    {country !== 'ALL' ? <Stack gap={10}>
      <Txt size={13} weight="600">{DESTINATIONS[country].name} 안에서 어디로 갈까요?{multiple ? ' · 여러 도시 선택' : ''}</Txt>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        {allowAll && <Chip label={`${DESTINATIONS[country].name} 전체`} selected={!cities.length} onPress={() => onChange(country, [])} />}
        {DESTINATIONS[country].cities.map((city) => <Chip key={city} label={city} selected={cities.includes(city)} onPress={() => onChange(country, multiple
          ? cities.includes(city) ? cities.filter((v) => v !== city) : [...cities, city]
          : [city])} />)}
      </Row>
    </Stack> : <Txt size={12} color={c.secondary}>국가·지역을 고르면 그 안의 도시를 선택할 수 있어요.</Txt>}
  </Stack>;
}
