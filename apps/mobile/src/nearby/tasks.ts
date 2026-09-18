import * as TaskManager from 'expo-task-manager';
import { GeofencingEventType } from 'expo-location';
import { backgroundSupported, TASK_NAME } from './platform';
import { onPlaceEntry } from './runtime';

// Must be defined outside React: the OS may start JS without mounting any screen.
if (backgroundSupported && !TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask<{ eventType: GeofencingEventType }>(TASK_NAME, async ({ data, error }) => {
    if (!error && data?.eventType === GeofencingEventType.Enter) {
      // Offline/permission/storage failures must not fall back to stale alerts.
      await onPlaceEntry().catch(() => undefined);
    }
  });
}
