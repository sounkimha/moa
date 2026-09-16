import { Platform } from 'react-native';
import { Country, COUNTRY_CODES, TRIP_AREAS } from '@moa/domain';
import { validDate } from './form-validation';

export type TripDraft = {
  departure: string;
  depCountry: Country;
  originSource: 'address' | 'gps' | 'manual';
  country: Country;
  areas: string[];
  customStops: string[];
  places: string[];
  start: string;
  end: string;
  capacity?: string;
};
const memory = new Map<string, TripDraft>();
const key = (owner: string) => `moa-trip-draft:${owner}`;
const clear = (owner: string) => {
  memory.delete(owner);
  if (Platform.OS === 'web') try { window.sessionStorage.removeItem(key(owner)); } catch {}
};

export function readTripDraft(owner: string): TripDraft | null {
  try {
    const raw = Platform.OS === 'web' ? window.sessionStorage.getItem(key(owner)) : null;
    if (raw && raw.length > 20_000) { clear(owner); return null; }
    const draft: TripDraft | null = Platform.OS === 'web' ? JSON.parse(raw || 'null') : memory.get(owner) || null;
    if (!draft || !COUNTRY_CODES.includes(draft.country) || !COUNTRY_CODES.includes(draft.depCountry)
      || typeof draft.departure !== 'string' || draft.departure.length > 40 || !['address', 'gps', 'manual'].includes(draft.originSource)
      || !validDate(draft.start) || !validDate(draft.end) || draft.end < draft.start
      || (draft.capacity !== undefined && (typeof draft.capacity !== 'string' || !/^\d{0,2}$/.test(draft.capacity)))
      || !Array.isArray(draft.areas) || draft.areas.length > 8 || !draft.areas.every((value) => typeof value === 'string')
      || !Array.isArray(draft.places) || draft.places.length > 12 || !draft.places.every((value) => typeof value === 'string' && value.length <= 100)
      || !Array.isArray(draft.customStops) || draft.customStops.length > 8 || !draft.customStops.every((value) => typeof value === 'string' && value.length <= 100)) { clear(owner); return null; }
    const areas = [...new Set(draft.areas)].filter((name) => TRIP_AREAS[draft.country].some((area) => area.name === name));
    return {
      ...draft,
      areas,
      places: areas.length ? [...new Set(draft.places)] : [],
      customStops: [...new Set(draft.customStops)].filter((stop) => TRIP_AREAS[draft.country].some((area) => areas.includes(area.name) && area.stops.some((name) => stop === `${area.name} · ${name}`))),
    };
  } catch { clear(owner); return null; }
}

export function writeTripDraft(owner: string, draft: TripDraft | null): boolean {
  if (draft) memory.set(owner, draft); else clear(owner);
  if (Platform.OS !== 'web') return true;
  try {
    if (draft) {
      const serialized = JSON.stringify(draft);
      if (serialized.length > 20_000) throw new Error('Draft too large');
      window.sessionStorage.setItem(key(owner), serialized);
    }
    else window.sessionStorage.removeItem(key(owner));
    return true;
  } catch { clear(owner); return false; }
}
