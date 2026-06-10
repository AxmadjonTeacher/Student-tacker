import { CameraPreview } from '@capacitor-community/camera-preview';
import { Capacitor } from '@capacitor/core';

export async function startCameraPreview(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Make the WebView transparent so the native camera layer shows through
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
  const root = document.getElementById('root');
  if (root) root.style.background = 'transparent';

  await CameraPreview.start({
    position: 'rear',
    width: window.screen.width,
    height: window.screen.height,
    toBack: true,
    storeToFile: false,
    disableAudio: true,
    enableHighResolution: true,
  });
}

export async function stopCameraPreview(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  await CameraPreview.stop();

  // Restore opaque backgrounds
  document.documentElement.style.background = '';
  document.body.style.background = '';
  const root = document.getElementById('root');
  if (root) root.style.background = '';
}

export interface CaptureResult {
  base64: string;
}

export async function captureFrame(): Promise<CaptureResult> {
  const result = await CameraPreview.capture({ quality: 92 });
  return { base64: result.value };
}

export function base64ToCanvas(base64: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}
