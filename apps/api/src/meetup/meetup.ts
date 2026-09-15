import { Controller, Get, Query, ServiceUnavailableException, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { AuthGuard } from '../auth/auth';
import { parse } from '../common/validation';

const querySchema = z.object({ q: z.string().trim().min(2).max(100) });
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
}
