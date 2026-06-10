import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export type CameraPermissionState = 'granted' | 'denied' | 'undetermined';

export async function requestCameraPermission(): Promise<CameraPermissionState> {
  if (!Capacitor.isNativePlatform()) return 'granted';

  const status = await Camera.checkPermissions();
  if (status.camera === 'granted') return 'granted';
  if (status.camera === 'denied' || status.camera === 'limited') return 'denied';

  const requested = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
  return requested.camera === 'granted' ? 'granted' : 'denied';
}

export function openAppSettings(): void {
  if (Capacitor.getPlatform() === 'ios') {
    window.open('app-settings:', '_system');
  } else if (Capacitor.getPlatform() === 'android') {
    window.open('app-settings:com.axmadjonteacher.studenttracker', '_system');
  }
}
