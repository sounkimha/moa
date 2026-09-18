import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

// Expo Go owns the floating gear, not the MOA component tree. Capability-check
// the same native bridge used by expo-dev-menu; older Go builds lack the setter.
// https://github.com/expo/expo/blob/main/packages/expo-dev-menu/src/DevMenu.ts
type DevMenu = { openMenu?: () => void; setToolsButtonVisible?: (visible: boolean) => void };
function menu(): DevMenu | null {
  if (!__DEV__ || Platform.OS === 'web') return null;
  try { return requireOptionalNativeModule<DevMenu>('ExpoDevMenu'); } catch { return null; }
}
export function setDevToolsButtonVisible(visible: boolean): boolean {
  try {
    const native = menu();
    if (!native?.openMenu || !native.setToolsButtonVisible) return false;
    native.setToolsButtonVisible(visible);
    return true;
  } catch { return false; }
}
export function openDevMenu(): boolean {
  try {
    const native = menu();
    if (!native?.openMenu) return false;
    native.openMenu();
    return true;
  } catch { return false; }
}
