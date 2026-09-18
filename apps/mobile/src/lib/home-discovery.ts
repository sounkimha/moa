import { Country, Place, Trip } from '@moa/domain';

/** Count actual published demo trips, including multi-city itineraries. */
export function tripsToCity(trips: Trip[], places: Place[], country: Country, city: string, today = new Date().toISOString().slice(0, 10)) {
  return trips.filter((trip) => trip.endDate >= today && (
    (trip.destinationCountry === country && (trip.destinationCity === city || trip.destinationAreas?.includes(city))) ||
    trip.placeIds.some((id) => places.some((place) => place.id === id && place.country === country && place.city === city))
  ));
}

export function uniqueTravelerCount(trips: Trip[]) {
  return new Set(trips.map((trip) => trip.travelerId)).size;
}
