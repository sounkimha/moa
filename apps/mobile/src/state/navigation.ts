export type Screen =
  | 'home' | 'search' | 'create' | 'trades' | 'my' | 'place' | 'request'
  | 'request-form' | 'trip-form' | 'flight-proof' | 'trip-route' | 'offers' | 'profile' | 'profile-edit'
  | 'offer-form' | 'bundle' | 'payment' | 'transaction' | 'chat' | 'receipt'
  | 'receive' | 'payouts' | 'wallet' | 'wallet-topup' | 'wallet-withdraw'
  | 'identity' | 'payment-methods' | 'notifications' | 'favorites' | 'trips'
  | 'reviews' | 'settings' | 'addresses' | 'help' | 'guide';

export interface Route {
  name: Screen;
  id?: string;
  placeId?: string;
  tripId?: string;
  requestIds?: string[];
  method?: 'link' | 'photo';
}
const screens: Screen[] = [
  'home', 'search', 'create', 'trades', 'my', 'place', 'request', 'request-form',
  'trip-form', 'flight-proof', 'trip-route', 'offers', 'profile', 'profile-edit', 'offer-form', 'bundle', 'payment',
  'transaction', 'chat', 'receipt', 'receive', 'payouts', 'wallet', 'wallet-topup',
  'wallet-withdraw', 'identity', 'payment-methods', 'notifications', 'favorites',
  'trips', 'reviews', 'settings', 'addresses', 'help', 'guide',
];
const validId = (value: string | null): value is string =>
  Boolean(value && value.length <= 200 && !/[\u0000-\u001f]/.test(value));

// Only navigation identifiers belong in the URL: never addresses, photos or tokens.
export function routeHash(route: Route): string {
  const query = new URLSearchParams();
  if (route.placeId) query.set('placeId', route.placeId);
  if (route.tripId) query.set('tripId', route.tripId);
  if (route.method) query.set('method', route.method);
  route.requestIds?.forEach((id) => query.append('requestId', id));
  return `#${route.name}${route.id ? '/' + encodeURIComponent(route.id) : ''}${query.size ? '?' + query : ''}`;
}

export function parseRoute(hash: string): Route {
  try {
    const [path, search = ''] = hash.replace(/^#\/?/, '').split('?');
    const [rawName, rawId] = path.split('/');
    if (!screens.includes(rawName as Screen)) return { name: 'home' };
    const route: Route = { name: rawName as Screen };
    const query = new URLSearchParams(search);
    const id = rawId ? decodeURIComponent(rawId) : null;
    if (validId(id)) route.id = id;
    for (const field of ['placeId', 'tripId'] as const) {
      const value = query.get(field);
      if (validId(value)) route[field] = value;
    }
    const method = query.get('method');
    if (method === 'photo' || method === 'link') route.method = method;
    const ids = [...new Set(query.getAll('requestId').filter(validId))].slice(0, 50);
    if (ids.length) route.requestIds = ids;
    return route;
  } catch {
    return { name: 'home' };
  }
}
