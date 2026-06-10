import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import type { BiometricOptions } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

const KEYCHAIN_SERVER = 'com.axmadjonteacher.studenttracker.auth';

export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch {
    return false;
  }
}

export async function saveBiometricCredentials(
  username: string,
  password: string
): Promise<void> {
  await NativeBiometric.setCredentials({ username, password, server: KEYCHAIN_SERVER });
  localStorage.setItem('biometric_enrolled', 'true');
}

export async function clearBiometricCredentials(): Promise<void> {
  try {
    await NativeBiometric.deleteCredentials({ server: KEYCHAIN_SERVER });
  } catch { /* credentials may not exist */ }
  localStorage.removeItem('biometric_enrolled');
}

export type BiometricError =
  | 'not_enrolled'
  | 'lockout'
  | 'cancelled'
  | 'not_available'
  | 'unknown';

export interface BiometricAuthResult {
  success: boolean;
  username?: string;
  password?: string;
  error?: BiometricError;
}

export async function authenticateWithBiometric(
  reason = 'Tizimga kirish uchun'
): Promise<BiometricAuthResult> {
  const available = await isBiometricAvailable();
  if (!available) return { success: false, error: 'not_available' };

  const options: BiometricOptions = {
    reason,
    title: 'Al-Xorazmiy',
    subtitle: 'Biometrik tekshirish',
    negativeButtonText: 'Bekor qilish',
    maxAttempts: 3,
  };

  try {
    await NativeBiometric.verifyIdentity(options);
    const credentials = await NativeBiometric.getCredentials({ server: KEYCHAIN_SERVER });
    return { success: true, username: credentials.username, password: credentials.password };
  } catch (e: unknown) {
    const code = (e as { code?: number }).code;
    if (code === 10)   return { success: false, error: 'cancelled' };
    if (code === 11)   return { success: false, error: 'not_enrolled' };
    if (code === 1004) return { success: false, error: 'lockout' };
    return { success: false, error: 'unknown' };
  }
}

export function isBiometricEnrolled(): boolean {
  return localStorage.getItem('biometric_enrolled') === 'true';
}
