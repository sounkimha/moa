import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import type { Point, NearbyPayload } from './model';
import { parsePayload } from './model';

export type Permissions = { location: boolean; notifications: boolean; background: boolean };
export const supported = Platform.OS === 'ios' || Platform.OS === 'android';
export const backgroundSupported = supported && !isRunningInExpoGo();
export const TASK_NAME = 'moa-nearby-place-entry-v1';
const CHANNEL = 'moa-nearby-requests';
export async function permissions(): Promise<Permissions> {
  const [location, notifications, background] = await Promise.all([
    Location.getForegroundPermissionsAsync(), Notifications.getPermissionsAsync(), Location.getBackgroundPermissionsAsync(),
  ]);
  return { location: location.granted, notifications: notifications.granted, background: background.granted };
}
export async function requestPermissions(stillAllowed: () => boolean): Promise<Permissions> {
  if (!stillAllowed()) return { location: false, notifications: false, background: false };
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: '근처 부탁 알림', importance: Notifications.AndroidImportance.DEFAULT,
    description: '여행 중 동선 근처의 부탁을 장소별로 모아서 알려드려요.',
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  });
  if (!stillAllowed()) return permissions();
  const location = await Location.requestForegroundPermissionsAsync();
  if (location.granted && stillAllowed()) await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return permissions();
}
export async function requestBackground(): Promise<boolean> {
  if (!backgroundSupported) return false;
  return (await Location.requestBackgroundPermissionsAsync()).granted;
}
const pointFrom = (location: Location.LocationObject): Point => ({
  latitude: location.coords.latitude, longitude: location.coords.longitude,
  accuracy: location.coords.accuracy, timestamp: location.timestamp,
});
export async function currentPoint(): Promise<Point | null> {
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60000, requiredAccuracy: 100 });
  // In the background, do not spin GPS indefinitely. A recent fix is sufficient;
  // skip this entry when the OS has no accurate fix and try again on a later event.
  return last ? pointFrom(last) : null;
}
export const watchPosition = (onPoint: (point: Point) => void, onError: () => void) =>
  Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 100, timeInterval: 60000 },
    (p) => onPoint(pointFrom(p)), onError);
export const startRegions = async (regions: Location.LocationRegion[]) => {
  if (!backgroundSupported || !await TaskManager.isAvailableAsync()) throw new Error('개발 빌드에서 백그라운드 알림을 사용할 수 있어요.');
  await Location.startGeofencingAsync(TASK_NAME, regions);
};
export async function stopRegions() {
  if (backgroundSupported && await Location.hasStartedGeofencingAsync(TASK_NAME)) await Location.stopGeofencingAsync(TASK_NAME);
}
export async function deliver(content: { title: string; body: string; data: NearbyPayload }): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: { ...content, data: { ...content.data }, sound: 'default' },
    trigger: Platform.OS === 'android' ? { channelId: CHANNEL } : null,
  });
}
export async function dismissNearby() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((n) => parsePayload(n.content.data)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  const presented = await Notifications.getPresentedNotificationsAsync();
  await Promise.all(presented.filter((n) => parsePayload(n.request.content.data)).map((n) => Notifications.dismissNotificationAsync(n.request.identifier)));
}
export function listenToTaps(onTap: (data: unknown, identifier: string) => void) {
  let listening = true, receivedLiveResponse = false;
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    if (listening && response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      receivedLiveResponse = true;
      onTap(response.notification.request.content.data, response.notification.request.identifier);
    }
  });
  void Notifications.getLastNotificationResponseAsync().then((response) => {
    if (listening && !receivedLiveResponse && response?.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) onTap(response.notification.request.content.data, response.notification.request.identifier);
  }).catch(() => undefined);
  return () => { listening = false; subscription.remove(); };
}
export const clearLastTap = () => Notifications.clearLastNotificationResponseAsync();
export function installPresentationGuard(allow: (data: unknown) => Promise<boolean>) {
  Notifications.setNotificationHandler({ handleNotification: async (notification) => {
    // Only nearby notifications are governed by this feature's preferences.
    const show = !parsePayload(notification.request.content.data) || await allow(notification.request.content.data).catch(() => false);
    return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
  } });
}
