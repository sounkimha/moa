import type { Place } from '@moa/domain';

/** Only public, valid place coordinates enter the native map. No user GPS is needed. */
export function mappablePlaces(places: Place[]) {
  return places.filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
    && Math.abs(place.latitude) <= 90 && Math.abs(place.longitude) <= 180);
}

export function placeMapRegion(place: Pick<Place, 'latitude' | 'longitude'>) {
  return { latitude: place.latitude, longitude: place.longitude, latitudeDelta: 0.06, longitudeDelta: 0.06 };
}
