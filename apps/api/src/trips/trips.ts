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
          departureCountry: z.enum(['KR', 'JP']),
          departureCity: z.string().trim().min(1).max(40),
          destinationCountry: z.enum(COUNTRY_CODES),
          destinationCity: z.string().min(1).max(40),
          startDate: date,
          endDate: date,
          placeIds: z.array(z.string()).min(1).max(12),
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
        check(DESTINATIONS[data.destinationCountry].cities.includes(data.destinationCity), '선택한 국가·지역 안의 도시를 골라주세요.');
        check(data.placeIds.some((id) => get(db.places, id).city === data.destinationCity), '대표 도시에 방문할 장소를 하나 이상 골라주세요.');
        const trip = {
          ...base(),
          ...data,
          travelerId: r.actorId,
          verificationStatus: 'UNVERIFIED' as const,
        };
        db.trips.push(trip);
        db.destinations.push(
          ...trip.placeIds.map((placeId) => ({
            ...base(),
            tripId: trip.id,
            placeId,
            visitDate: trip.startDate,
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
