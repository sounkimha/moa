import { Body, Controller, Get, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { groupForTrip, COUNTRY_CODES, DESTINATIONS } from '@moa/domain';
import { ActorRequest, AuthGuard } from '../auth/auth';
import { Store } from '../infrastructure/store';
import { base, check, date, get, once, owner, parse, today } from '../common/validation';
@UseGuards(AuthGuard)
@Controller('trips')
export class TripsController {
  constructor(private readonly store: Store) {}
  @Post() create(
    @Req() r: ActorRequest,
    @Headers('idempotency-key') key: string,
    @Body() body: unknown,
  ) {
    const data = parse(
      z
        .object({
          departureCountry: z.enum(COUNTRY_CODES),
          departureCity: z.string().trim().min(1).max(40),
          destinationCountry: z.enum(COUNTRY_CODES),
          destinationCity: z.string().min(1).max(40),
          destinationAreas: z.array(z.string().trim().min(1).max(40)).min(1).max(8).optional(),
          startDate: date,
          endDate: date,
          placeIds: z.array(z.string()).max(12),
          customStops: z.array(z.string().trim().min(2).max(100)).max(8).default([]),
          maxItems: z.number().int().min(1).max(20),
        })
        .strict(),
      body,
    );
    return this.store.transaction((db) =>
      once(db, r.actorId, key, 'trip:create', data, () => {
        check(
          data.startDate >= today() && data.endDate >= data.startDate,
          '여행 시작일과 종료일을 다시 확인해주세요.',
        );
        check(
          new Set(data.placeIds).size === data.placeIds.length,
          '같은 장소를 두 번 선택할 수 없어요.',
        );
        data.placeIds.forEach((id) => {
          const p = get(db.places, id);
          check(
            p.country === data.destinationCountry,
            '선택한 여행 국가에 있는 방문 장소를 골라주세요.',
          );
        });
        const selectedAreas = data.destinationAreas || [data.destinationCity];
        check(selectedAreas[0] === data.destinationCity, '첫 번째 여행지와 대표 여행지를 맞춰주세요.');
        if (data.destinationAreas) data.placeIds.forEach((id) => {
          check(selectedAreas.includes(get(db.places, id).city), '선택한 여행지 안의 방문 장소를 골라주세요.');
        });
        const knownCity = DESTINATIONS[data.destinationCountry].cities.includes(data.destinationCity);
        if (knownCity && !data.destinationAreas)
          check(data.placeIds.some((id) => get(db.places, id).city === data.destinationCity), '선택한 도시에서 들를 장소를 하나 이상 골라주세요.');
        else if (!knownCity && !data.destinationAreas)
          check(data.placeIds.length === 0, '목록에 없는 지역은 직접 입력한 장소로 등록해주세요.');
        const trip = {
          ...base(),
          ...data,
          travelerId: r.actorId,
          verificationStatus: 'UNVERIFIED' as const,
        };
        db.trips.push(trip);
        db.destinations.push(
          ...trip.placeIds.map((placeId, sequence) => ({
            ...base(),
            tripId: trip.id,
            placeId,
            visitDate: trip.startDate,
            visitTime: String(11 + sequence * 2).padStart(2, '0') + ':00',
            sequence,
          })),
        );
        return trip;
      }),
    );
  }
  @Get(':id/bundles') bundles(@Req() r: ActorRequest, @Param('id') id: string) {
    return this.store.read((db) => {
      const trip = get(db.trips, id);
      owner(r.actorId, trip.travelerId);
      return groupForTrip(db, trip);
    });
  }
}
