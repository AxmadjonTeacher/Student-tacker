import { PushNotifications } from '@capacitor/push-notifications';
import type { Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabase';

export async function initPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') {
    console.warn('[Push] Permission not granted:', permResult.receive);
    return;
  }

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token: Token) => {
    const { error } = await supabase.from('device_tokens').upsert(
      {
        user_id: userId,
        token: token.value,
        platform: 'ios',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'token' }
    );
    if (error) console.error('[Push] Token upsert failed:', error.message);
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('[Push] Registration error:', err);
  });

  PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: {
            title: notification.title ?? 'Xabar',
            body: notification.body ?? '',
            type: 'info',
            data: notification.data,
          },
        })
      );
    }
  );

  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: ActionPerformed) => {
      const data = action.notification.data as {
        route?: string;
        studentId?: string;
      };
      if (data?.route || data?.studentId) {
        window.dispatchEvent(new CustomEvent('push:navigate', { detail: data }));
      }
    }
  );
}

export async function removePushListeners(): Promise<void> {
  await PushNotifications.removeAllListeners();
}
