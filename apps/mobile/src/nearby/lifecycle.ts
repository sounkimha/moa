// Keep auth independent of native notification modules, and invalidate work
// synchronously on logout/role changes (including an in-flight permission dialog).
let revision = 0;
const listeners = new Set<() => void>();
export const nearbyRevision = () => revision;
export function interruptNearby() {
  revision++;
  for (const stop of listeners) stop();
}
export function onNearbyInterrupt(stop: () => void) {
  listeners.add(stop);
  return () => { listeners.delete(stop); };
}
