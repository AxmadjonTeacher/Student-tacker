import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const haptics = {
  /** Standard button tap, row selection, toggle */
  light: (): void => { if (isNative) Haptics.impact({ style: ImpactStyle.Light }); },
  /** Card long-press, drag start, swipe reveal */
  medium: (): void => { if (isNative) Haptics.impact({ style: ImpactStyle.Medium }); },
  /** Destructive confirm, OMR scan lock-on, critical action */
  heavy: (): void => { if (isNative) Haptics.impact({ style: ImpactStyle.Heavy }); },
  /** Segment switch, picker snap, discrete value change */
  select: (): void => { if (isNative) Haptics.selectionChanged(); },
  /** Save success, scan complete, upload done */
  success: (): void => { if (isNative) Haptics.notification({ type: NotificationType.Success }); },
  /** Warning, already-scored conflict, soft error */
  warning: (): void => { if (isNative) Haptics.notification({ type: NotificationType.Warning }); },
  /** Network error, invalid ID, scan failure */
  error: (): void => { if (isNative) Haptics.notification({ type: NotificationType.Error }); },
};
