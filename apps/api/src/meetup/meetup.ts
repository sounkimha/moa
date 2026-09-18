import { Controller, Get, Query, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth';
import { parse } from '../common/validation';

const querySchema = z.object({ q: z.string().trim().min(2).max(100) });
const reverseQuerySchema = z.object({
  lat: z.coerce.number().finite().min(-90).max(90),
  lng: z.coerce.number().finite().min(-180).max(180),
});
const responseSchema = z.object({ documents: z.array(z.object({
  id: z.string(), place_name: z.string(), address_name: z.string(),
  road_address_name: z.string(), x: z.string(), y: z.string(),
})) });
@Controller('meetup')
@UseGuards(AuthGuard)
export class MeetupController {
  @Get('status')
  status() {
    return { searchAvailable: Boolean(process.env.KAKAO_REST_API_KEY?.trim()), countries: ['KR'] };
  }
  @Get('search')
  async search(@Query() query: unknown) {
    const { q } = parse(querySchema, query);
    const key = process.env.KAKAO_REST_API_KEY;
    if (!key?.trim()) throw new ServiceUnavailableException('장소 검색 연결이 아직 준비되지 않았어요. 지도에서 만날 위치를 지정해주세요.');
    try {
      const url = new URL('https://dapi.kakao.com/v2/local/search/keyword.json');
      url.search = new URLSearchParams({ query: q, size: '10' }).toString();
      const response = await fetch(url, {
        headers: { Authorization: `KakaoAK ${key}` }, signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error('provider unavailable');
      const data = responseSchema.parse(await response.json());
      return { results: data.documents.map((p) => ({
        providerId: p.id, name: p.place_name, address: p.road_address_name || p.address_name,
        latitude: Number(p.y), longitude: Number(p.x), detail: '',
      })).filter((p) => Number.isFinite(p.latitude) && Math.abs(p.latitude) <= 90 &&
        Number.isFinite(p.longitude) && Math.abs(p.longitude) <= 180), attribution: '장소 검색 · Kakao' };
    } catch {
      throw new ServiceUnavailableException('장소 검색에 연결하지 못했어요. 잠시 후 다시 검색해주세요.');
    }
  }

  @Get('reverse')
  async reverse(@Query() query: unknown) {
    const { lat, lng } = parse(reverseQuerySchema, query);
    const kakaoKey = process.env.KAKAO_REST_API_KEY?.trim();
    if (kakaoKey) {
      try {
        const url = new URL('https://dapi.kakao.com/v2/local/geo/coord2address.json');
        url.search = new URLSearchParams({ x: String(lng), y: String(lat), input_coord: 'WGS84' }).toString();
        const response = await fetch(url, { headers: { Authorization: `KakaoAK ${kakaoKey}` }, signal: AbortSignal.timeout(5000) });
        if (response.ok) {
          const data = await response.json() as { documents?: Array<{ road_address?: { building_name?: string; address_name?: string }; address?: { address_name?: string } }> };
          const item = data.documents?.[0];
          const road = item?.road_address;
          const address = item?.address;
          const name = road?.building_name || road?.address_name || address?.address_name || '';
          const formatted = road?.address_name || address?.address_name || '';
          if (name || formatted) return { name: name || formatted, address: formatted, attribution: 'Kakao' };
        }
      } catch { /* Use the public fallback below when Kakao reverse lookup is unavailable. */ }
    }
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.search = new URLSearchParams({ format: 'jsonv2', lat: String(lat), lon: String(lng), zoom: '18', addressdetails: '1', namedetails: '1' }).toString();
      const response = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'MOA meetup location lookup' },
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = await response.json() as { name?: string; display_name?: string; address?: Record<string, string> };
        const parts = data.address || {};
        const name = data.name || parts.amenity || parts.shop || parts.tourism || parts.building || parts.road || parts.neighbourhood || parts.suburb || parts.city_district || parts.city || '';
        const formatted = data.display_name || [parts.city, parts.suburb, parts.road, parts.house_number].filter(Boolean).join(' ');
        if (name || formatted) return { name: name || formatted, address: formatted, attribution: 'OpenStreetMap' };
      }
    } catch { /* A readable map label is an enhancement; the coordinates remain selectable. */ }
    throw new ServiceUnavailableException('이 위치의 건물명이나 주소를 확인하지 못했어요. 만남 위치 상세 설명을 입력해주세요.');
  }
}
