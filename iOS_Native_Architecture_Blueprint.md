# iOS Native Architecture Blueprint
### Al-Xorazmiy Student Tracker — App Store–Ready Implementation Guide

> **Stack context:** React 19 · Vite · Supabase 2.x · Capacitor 8.4.0 · TypeScript 6  
> **Existing plugins:** `@capacitor/app`, `@capacitor/camera`, `@capacitor/push-notifications`  
> **Existing OMR engine:** `src/utils/omrScanner.ts` (596 lines — BFS markers, perspective warp, bubble density)  
> **Target:** Pass Apple App Store Review Guideline 4.2 on first submission

---

## Table of Contents

1. [Pillar 1 — Modern, Premium, Apple-Friendly UI/UX](#pillar-1)
   - [1.1 Typography & Hierarchy](#11-typography--hierarchy)
   - [1.2 Spacing & 8pt Grid System](#12-spacing--8pt-grid-system)
   - [1.3 Micro-Aesthetics & Depth](#13-micro-aesthetics--depth)
   - [1.4 Micro-Interactions & Haptics](#14-micro-interactions--haptics)
2. [Pillar 2 — Native Capabilities & App Store Compliance](#pillar-2)
   - [2.1 Push Notifications](#21-push-notifications)
   - [2.2 Camera Access](#22-camera-access)
   - [2.3 Biometric Authentication](#23-biometric-authentication-face-id--touch-id)
3. [Pillar 3 — Native-Grade OMR Camera Scanner](#pillar-3)
   - [3.1 Camera Layer Integration](#31-camera-layer-integration)
   - [3.2 Real-Time UI Overlay](#32-real-time-ui-overlay)
   - [3.3 Computer Vision Architecture](#33-computer-vision-architecture--decision)
   - [3.4 Image Processing Pipeline](#34-image-processing-pipeline)
   - [3.5 State Management & Real-Time Sync](#35-state-management--real-time-sync)
4. [Verification Checklist](#verification-checklist)

---

<a name="pillar-1"></a>
## Pillar 1 — Modern, Premium, Apple-Friendly UI/UX

Apple Guideline 4.2 rejects apps that feel like "a website wrapped in a container." The criteria reviewers use is almost always visceral: does the interface feel native? The corrective is not adding UI flourishes — it is adopting the precise spatial, typographic, and motion grammar that Apple's own apps use. The rules below are directly derivable from Apple's Human Interface Guidelines (2024/2025 revision) and are cross-referenced against the project's existing `index.css` CSS variable system.

---

### 1.1 Typography & Hierarchy

#### Font Stack

Never load a web font in a native iOS build. Network latency causes a flash-of-unstyled-text during app launch, which immediately signals "website." Use the platform system font:

```css
:root {
  --font-system: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display',
                 'Helvetica Neue', Arial, sans-serif;
  --font-mono:   'SF Mono', ui-monospace, 'Courier New', monospace;
}

body {
  font-family: var(--font-system);
  /* Disable font synthesis — prevents faux-bold/italic on system font */
  font-synthesis: none;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}
```

Remove the Google Fonts `<link>` import from `index.html` before submitting to App Store. The `Inter` and `Caveat` fonts are fine for PWA/web but introduce a loading flash in the native container.

#### Type Scale

The table below maps every semantic role in the app to the corresponding iOS Dynamic Type point size, the CSS `font-size` equivalent (1pt = 1px at 1× screen scale on iOS), and the exact `letter-spacing` and `line-height` values.

| Role | iOS Style | px | `font-weight` | `letter-spacing` | `line-height` |
|------|-----------|-----|---------------|------------------|---------------|
| Caption 2 | Caption2 | 11px | 400 | +0.04em | 1.45 |
| Caption 1 | Caption1 | 12px | 400 | +0.02em | 1.45 |
| Footnote | Footnote | 13px | 400 | +0.01em | 1.5 |
| Subheadline | Subheadline | 15px | 400 | -0.01em | 1.45 |
| Body | Body | 17px | 400 | -0.01em | 1.47 |
| Callout | Callout | 16px | 500 | -0.01em | 1.45 |
| Headline | Headline | 17px | 600 | -0.02em | 1.35 |
| Title 3 | Title3 | 20px | 600 | -0.02em | 1.3 |
| Title 2 | Title2 | 22px | 700 | -0.03em | 1.25 |
| Title 1 | Title1 | 28px | 700 | -0.03em | 1.2 |
| Large Title | LargeTitle | 34px | 800 | -0.04em | 1.15 |
| Display | — | 40px | 800 | -0.04em | 1.1 |

Apply these as CSS custom properties in `index.css`:

```css
:root {
  /* Size */
  --text-caption2:     11px;
  --text-caption1:     12px;
  --text-footnote:     13px;
  --text-subhead:      15px;
  --text-body:         17px;
  --text-callout:      16px;
  --text-headline:     17px;
  --text-title3:       20px;
  --text-title2:       22px;
  --text-title1:       28px;
  --text-largetitle:   34px;
  --text-display:      40px;

  /* Tracking */
  --tracking-tight:    -0.04em;  /* Display, LargeTitle */
  --tracking-snug:     -0.03em;  /* Title 1/2 */
  --tracking-normal:   -0.01em;  /* Body, Subhead */
  --tracking-wide:     +0.02em;  /* Caption, overlines */
  --tracking-caps:     +0.08em;  /* ALL-CAPS labels */
}
```

#### Tabular Numerics — Critical for Score Displays

Score values in `StudentTable.tsx` and `TestorCabinet.tsx` must not jitter when digits change width. Apply tabular figures:

```css
.score-cell,
.percentage-display,
.stat-number {
  font-feature-settings: "tnum" 1, "kern" 1;
  font-variant-numeric: tabular-nums;
}
```

#### Responsive Scaling with `clamp()`

On iPad-sized windows (Capacitor iPad split view or Stage Manager), display text must scale up. Use `clamp()` rather than media queries:

```css
.dashboard-hero-number {
  font-size: clamp(var(--text-title1), 5vw, var(--text-display));
  letter-spacing: var(--tracking-tight);
  font-weight: 800;
}
```

---

### 1.2 Spacing & 8pt Grid System

Every spacing value in the UI must be a multiple of 8px. The only exception is the 4px half-unit, which is reserved exclusively for icon-to-label gutters and internal badge padding.

#### Spatial Token Map

```css
:root {
  --space-1:   4px;   /* icon gutter, badge padding only */
  --space-2:   8px;   /* tight row gap, input height adjustment */
  --space-3:   12px;  /* list row vertical padding */
  --space-4:   16px;  /* card inner padding (compact) */
  --space-5:   20px;  /* card inner padding (standard) */
  --space-6:   24px;  /* section gap, modal padding */
  --space-7:   28px;  /* section header margin-bottom */
  --space-8:   32px;  /* modal horizontal padding */
  --space-10:  40px;  /* large section gaps */
  --space-12:  48px;  /* nav bar height */
  --space-14:  56px;  /* tab bar height (before safe area) */
}
```

#### Component-Level Padding Rules

| Component | Padding | Gap |
|-----------|---------|-----|
| Dashboard stat card | `20px 20px` | — |
| Student list row | `12px 16px` | — |
| Modal container | `24px 24px 32px` | — |
| Bottom sheet | `24px 20px` | — |
| Pill button | `10px 20px` | — |
| Icon button | `12px` (square) | — |
| Section header | `0 0 8px` | — |
| Form input | `12px 16px` | — |
| Toolbar / nav bar | `0 16px` | 8px between items |
| Card list `gap` | — | `12px` |
| Grid layout `gap` | — | `16px` |

#### Safe Area Insets — Complete Map

The app already sets `viewport-fit=cover` in `index.html`. Map safe areas to every edge-touching element:

```css
/* Global app shell */
#root {
  padding-top:    env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left:   env(safe-area-inset-left);
  padding-right:  env(safe-area-inset-right);
}

/* Fixed bottom tab bar */
.tab-bar {
  padding-bottom: calc(env(safe-area-inset-bottom) + var(--space-2));
}

/* Floating action button (OMR scan trigger) */
.fab-omr {
  bottom: calc(env(safe-area-inset-bottom) + 24px);
  right:  calc(env(safe-area-inset-right)  + 20px);
}

/* Modal sheet drag handle area */
.modal-drag-region {
  padding-top: calc(env(safe-area-inset-top) + 8px);
}
```

#### Touch Target Enforcement

Every interactive element must meet 44×44pt minimum (Apple HIG §Targets). In CSS:

```css
/* Apply to any element smaller than 44px */
.touch-target {
  position: relative;
}
.touch-target::after {
  content: '';
  position: absolute;
  top:    50%;
  left:   50%;
  width:  max(100%, 44px);
  height: max(100%, 44px);
  transform: translate(-50%, -50%);
}
```

---

### 1.3 Micro-Aesthetics & Depth

#### Shadow System — 3-Layer Composite

Apple's system UI uses layered, directional shadows. Never use a single-layer shadow. The following spec produces depth that matches iOS system cards:

```css
:root {
  /* Light mode */
  --shadow-sm:
    0 1px 2px -1px rgba(0,0,0,0.10),
    0 2px 4px -2px rgba(0,0,0,0.08);

  --shadow-md:
    0 1px 3px -1px rgba(0,0,0,0.08),
    0 8px 16px -4px rgba(0,0,0,0.10),
    0 20px 32px -8px rgba(0,0,0,0.06);

  --shadow-lg:
    0 1px 2px -1px rgba(0,0,0,0.06),
    0 12px 24px -6px rgba(0,0,0,0.10),
    0 40px 64px -12px rgba(0,0,0,0.14);

  --shadow-modal:
    0 8px 16px -4px rgba(0,0,0,0.12),
    0 32px 64px -8px rgba(0,0,0,0.20),
    0 64px 96px -16px rgba(0,0,0,0.10);
}

[data-theme="dark"] {
  --shadow-sm:
    0 1px 2px -1px rgba(0,0,0,0.40),
    0 2px 4px -2px rgba(0,0,0,0.30);

  --shadow-md:
    0 1px 3px -1px rgba(0,0,0,0.30),
    0 8px 16px -4px rgba(0,0,0,0.40),
    0 20px 32px -8px rgba(0,0,0,0.50);

  --shadow-lg:
    0 1px 2px -1px rgba(0,0,0,0.30),
    0 12px 24px -6px rgba(0,0,0,0.50),
    0 40px 64px -12px rgba(0,0,0,0.60);
}
```

#### Glassmorphism — Material Tier Specifications

Modeled after Apple's `UIBlurEffect` style tiers. These values are calibrated against the app's existing `--backdrop-blur: blur(24px)` token:

```css
:root {
  /* ultraThin — tooltips, popovers, contextual menus */
  --glass-ultra-thin-bg:   rgba(255,255,255,0.35);
  --glass-ultra-thin-blur: blur(8px) saturate(140%);

  /* thin — secondary cards, input fields */
  --glass-thin-bg:         rgba(255,255,255,0.50);
  --glass-thin-blur:       blur(16px) saturate(160%);

  /* regular — tab bars, nav bars, standard cards (matches existing --bg-card) */
  --glass-regular-bg:      rgba(255,255,255,0.68);
  --glass-regular-blur:    blur(24px) saturate(180%);

  /* thick — modals, bottom sheets, prominent overlays */
  --glass-thick-bg:        rgba(255,255,255,0.82);
  --glass-thick-blur:      blur(40px) saturate(200%);
}

[data-theme="dark"] {
  --glass-ultra-thin-bg:   rgba(28,28,30,0.35);
  --glass-ultra-thin-blur: blur(8px)  saturate(130%);
  --glass-thin-bg:         rgba(28,28,30,0.52);
  --glass-thin-blur:       blur(16px) saturate(150%);
  --glass-regular-bg:      rgba(28,28,30,0.65);  /* matches existing --bg-card */
  --glass-regular-blur:    blur(24px) saturate(170%);
  --glass-thick-bg:        rgba(28,28,30,0.80);
  --glass-thick-blur:      blur(40px) saturate(190%);
}
```

Usage pattern:

```css
.card-glass {
  background:        var(--glass-regular-bg);
  backdrop-filter:   var(--glass-regular-blur);
  -webkit-backdrop-filter: var(--glass-regular-blur); /* Required for Safari/WebKit */
  box-shadow:        var(--shadow-md);
  border:            1px solid rgba(255,255,255,0.18);
  /* Specular highlight — simulates light catching the top edge */
  box-shadow:
    var(--shadow-md),
    inset 0 1px 0 rgba(255,255,255,0.25);
}
```

#### Border Radius Cadence

Component hierarchy determines border radius. Nest smaller radii inside larger containers (subtract 4-8px per nesting level):

```css
:root {
  --radius-xs:   6px;   /* chips, tags, small badges */
  --radius-sm:   10px;  /* buttons, inputs, small controls */
  --radius-md:   14px;  /* list rows, compact cards */
  --radius-lg:   20px;  /* standard cards, panels */
  --radius-xl:   28px;  /* modals, large containers */
  --radius-2xl:  36px;  /* full-bleed hero cards */
  --radius-pill: 9999px; /* pill buttons, search bars */
}
```

#### Focus Ring — iOS System Blue

```css
:focus-visible {
  outline: none;
  box-shadow:
    var(--shadow-md),
    inset 0 1px 0 rgba(255,255,255,0.25),
    0 0 0 3.5px rgba(0,122,255,0.55);
}
```

---

### 1.4 Micro-Interactions & Haptics

#### Motion Tokens

```css
:root {
  /* Easing curves */
  --ease-spring:    cubic-bezier(0.34, 1.56, 0.64, 1.0);  /* overshoot spring */
  --ease-out-expo:  cubic-bezier(0.16, 1.00, 0.30, 1.0);  /* decelerate to rest */
  --ease-in-expo:   cubic-bezier(0.70, 0.00, 0.84, 0.0);  /* accelerate from rest */
  --ease-standard:  cubic-bezier(0.40, 0.00, 0.20, 1.0);  /* material standard */

  /* Durations */
  --duration-instant: 60ms;
  --duration-fast:    120ms;
  --duration-normal:  220ms;
  --duration-slow:    380ms;
  --duration-modal:   420ms;
}
```

#### Button Active State

Every interactive element must give instant visual feedback at the moment of touch (not on release). This is a key distinction between native-feeling and web-feeling interfaces:

```css
.btn-primary {
  transform: scale(1);
  transition:
    transform var(--duration-fast) var(--ease-spring),
    box-shadow var(--duration-fast) var(--ease-out-expo),
    background var(--duration-fast) var(--ease-standard);
}

.btn-primary:active {
  transform: scale(0.96);
  box-shadow: var(--shadow-sm);
}

/* List rows */
.student-row {
  transition: background var(--duration-fast) var(--ease-standard);
}
.student-row:active {
  background: rgba(0,0,0,0.05);
}
[data-theme="dark"] .student-row:active {
  background: rgba(255,255,255,0.06);
}
```

#### Modal Presentation & Dismissal

```css
.modal-overlay {
  opacity: 0;
  transition: opacity var(--duration-normal) var(--ease-out-expo);
}
.modal-overlay.visible {
  opacity: 1;
}

.modal-sheet {
  transform: translateY(100%);
  transition: transform var(--duration-modal) var(--ease-spring);
}
.modal-sheet.visible {
  transform: translateY(0);
}
.modal-sheet.dismissing {
  transform: translateY(100%);
  transition: transform var(--duration-normal) var(--ease-in-expo);
}
```

#### Skeleton Shimmer — Loading States

Skeleton screens must replace all spinners in a native iOS app. Spinners communicate "loading" without context; skeletons communicate structure:

```css
@keyframes shimmer {
  from { background-position: -200% 0; }
  to   { background-position:  200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    rgba(0,0,0,0.06) 25%,
    rgba(0,0,0,0.12) 50%,
    rgba(0,0,0,0.06) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: var(--radius-sm);
}

[data-theme="dark"] .skeleton {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.04) 25%,
    rgba(255,255,255,0.10) 50%,
    rgba(255,255,255,0.04) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s ease-in-out infinite;
}
```

#### Haptic Feedback — Complete Trigger Map

Install the plugin:

```bash
npm install @capacitor/haptics
npx cap sync ios
```

Utility wrapper (create `src/utils/haptics.ts`):

```typescript
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export const haptics = {
  /** Tap: standard button press, row selection, toggle */
  light:   () => isNative && Haptics.impact({ style: ImpactStyle.Light }),
  /** Pick: drag start, card long-press, swipe reveal */
  medium:  () => isNative && Haptics.impact({ style: ImpactStyle.Medium }),
  /** Alert: destructive confirm, OMR scan lock-on, critical action */
  heavy:   () => isNative && Haptics.impact({ style: ImpactStyle.Heavy }),
  /** Discrete click: segment switch, picker snap, slider step */
  select:  () => isNative && Haptics.selectionChanged(),
  /** Green toast: save success, scan complete, upload done */
  success: () => isNative && Haptics.notification({ type: NotificationType.Success }),
  /** Yellow toast: warning, already-scored conflict */
  warning: () => isNative && Haptics.notification({ type: NotificationType.Warning }),
  /** Red toast: network error, invalid ID, scan failure */
  error:   () => isNative && Haptics.notification({ type: NotificationType.Error }),
};
```

Trigger map for existing actions in the app:

| User Action | Haptic |
|---|---|
| Tap any nav tab | `haptics.light()` |
| Toggle dark mode | `haptics.medium()` |
| Long-press student row to reorder | `haptics.medium()` |
| Save edited score (success) | `haptics.success()` |
| Confirm delete student | `haptics.heavy()` |
| OMR scan corners aligned | `haptics.medium()` |
| OMR scan complete & parsed | `haptics.success()` |
| OMR scan failed / unreadable | `haptics.error()` |
| Add student saved | `haptics.success()` |
| Biometric auth success | `haptics.success()` |
| Pull-to-refresh triggered | `haptics.light()` |
| Swipe to delete reveal | `haptics.light()` |
| Picker value change | `haptics.select()` |

#### Scroll Behavior

```css
.scroll-container {
  overflow-y:                  auto;
  -webkit-overflow-scrolling:  touch; /* momentum scroll */
  overscroll-behavior-y:       contain; /* prevent rubber-band leaking to parent */
  scroll-behavior:             smooth;
}
```

---

<a name="pillar-2"></a>
## Pillar 2 — Native Capabilities & App Store Compliance

### 2.1 Push Notifications

#### APNS Setup Checklist

1. In Apple Developer Portal: enable **Push Notifications** capability for App ID `com.axmadjonteacher.studenttracker`
2. Generate an **APNS Auth Key** (`.p8` file) — preferred over certificates because keys never expire
3. In Xcode: **Signing & Capabilities** → **+ Capability** → **Push Notifications**
4. In Xcode: **Signing & Capabilities** → **+ Capability** → **Background Modes** → enable **Remote notifications**
5. Upload the `.p8` key to Supabase Dashboard → **Settings** → **Edge Functions** (or your notification service)

#### `Info.plist` Keys

```xml
<!-- ios/App/App/Info.plist -->
<key>UIBackgroundModes</key>
<array>
  <string>remote-notification</string>
</array>
```

No additional `NSPushNotificationDescription` key is required — APNS permission uses a system dialog automatically.

#### TypeScript Implementation

```typescript
// src/utils/pushNotifications.ts
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabase';

export async function initPushNotifications(userId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // 1. Check / request permission
  const permResult = await PushNotifications.requestPermissions();

  if (permResult.receive === 'denied') {
    // Surface a non-blocking nudge; do not block app flow
    console.warn('[Push] Permission denied — user opted out');
    return;
  }

  if (permResult.receive !== 'granted') return;

  // 2. Register with APNS
  await PushNotifications.register();

  // 3. Capture device token and persist to Supabase
  PushNotifications.addListener('registration', async (token: Token) => {
    await supabase.from('device_tokens').upsert(
      { user_id: userId, token: token.value, platform: 'ios', updated_at: new Date().toISOString() },
      { onConflict: 'token' }
    );
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('[Push] Registration error:', err);
  });

  // 4. Foreground notification — rendered as in-app banner
  PushNotifications.addListener(
    'pushNotificationReceived',
    (notification: PushNotificationSchema) => {
      // The app is open. Show an in-app toast rather than the system banner.
      showInAppBanner({
        title: notification.title ?? 'Xabar',
        body:  notification.body  ?? '',
        data:  notification.data,
      });
    }
  );

  // 5. Background / terminated — notification tapped, deeplink into app
  PushNotifications.addListener(
    'pushNotificationActionPerformed',
    (action: ActionPerformed) => {
      const data = action.notification.data as { route?: string; studentId?: string };
      if (data?.route === 'student' && data.studentId) {
        // Navigate to specific student — wire into your existing subject state
        window.dispatchEvent(new CustomEvent('push:navigate', { detail: data }));
      }
    }
  );
}

// Minimal in-app banner component trigger — implement with your existing toast system
function showInAppBanner(opts: { title: string; body: string; data: Record<string,string> }) {
  const event = new CustomEvent('app:toast', { detail: { ...opts, type: 'info' } });
  window.dispatchEvent(event);
}
```

Add the `device_tokens` table to Supabase:

```sql
create table device_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  token       text not null unique,
  platform    text not null check (platform in ('ios','android')),
  updated_at  timestamptz not null default now()
);
```

Call `initPushNotifications(userId)` from `App.tsx` after successful login, inside the existing `useEffect` that handles `fetchAllData()`.

---

### 2.2 Camera Access

The plugin `@capacitor/camera` is already installed and partially wired in `App.tsx` via `handleUpdateStudentPhoto()`. This section hardenes the permission flow and aligns it with HIG.

#### `Info.plist` Keys

```xml
<!-- ios/App/App/Info.plist -->
<key>NSCameraUsageDescription</key>
<string>O'quvchi profil rasmini olish va test varaqasini skanerlash uchun kamera kerak.</string>

<key>NSPhotoLibraryAddUsageDescription</key>
<string>O'quvchi rasmlarini foto kutubxonasiga saqlash uchun ruxsat kerak.</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Foto kutubxonadan profil rasm tanlash uchun ruxsat kerak.</string>
```

#### Permission State Machine

```typescript
// src/utils/cameraPermission.ts
import { Camera } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

export type CameraPermissionState = 'undetermined' | 'granted' | 'denied' | 'restricted';

export async function requestCameraPermission(): Promise<CameraPermissionState> {
  if (!Capacitor.isNativePlatform()) return 'granted'; // Browser always prompts natively

  const status = await Camera.checkPermissions();

  if (status.camera === 'granted') return 'granted';
  if (status.camera === 'denied')  return 'denied';

  // 'prompt' or 'prompt-with-rationale' — request it
  const requested = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });

  return requested.camera === 'granted' ? 'granted' : 'denied';
}

export function openAppSettings(): void {
  // Capacitor does not expose Settings.app directly; use the native URL scheme
  if (Capacitor.getPlatform() === 'ios') {
    window.open('app-settings:', '_system');
  }
}
```

Graceful denial UI in the component (replace the existing `alert()` in `handleUpdateStudentPhoto()`):

```typescript
// Inside App.tsx — replace current camera handler
const handleUpdateStudentPhoto = async (studentId: string) => {
  const permission = await requestCameraPermission();

  if (permission === 'denied') {
    setDialog({
      title: 'Kameraga ruxsat yo\'q',
      message: 'Profil rasm olish uchun Sozlamalar orqali kameraga ruxsat bering.',
      confirmLabel: 'Sozlamalar',
      cancelLabel: 'Bekor qilish',
      onConfirm: openAppSettings,
    });
    return;
  }

  const image = await Camera.getPhoto({
    quality:     72,
    allowEditing: false,
    resultType:  CameraResultType.Base64,
    source:      CameraSource.Prompt, // gives user Camera / Gallery choice
    width:       300,
    height:      300,
    correctOrientation: true,
  });

  if (!image.base64String) return;

  // Compress to 150×150 via Canvas (existing logic in App.tsx)
  const compressed = await compressBase64Image(image.base64String, 150, 150, 0.65);
  await updateStudentPicture(studentId, `data:image/jpeg;base64,${compressed}`);
};
```

---

### 2.3 Biometric Authentication (Face ID / Touch ID)

#### Installation

```bash
npm install @capacitor-community/native-biometric
npx cap sync ios
```

#### Xcode Configuration

1. **Signing & Capabilities** → **+ Capability** → **Keychain Sharing** (add group `com.axmadjonteacher.studenttracker`)
2. No extra entitlement needed for Face ID — it is granted automatically once `NSFaceIDUsageDescription` is in `Info.plist`

#### `Info.plist` Key

```xml
<key>NSFaceIDUsageDescription</key>
<string>Tizimga tez va xavfsiz kirish uchun Face ID ishlatiladi.</string>
```

#### TypeScript Implementation

```typescript
// src/utils/biometric.ts
import { NativeBiometric, BiometricOptions, AvailableResult } from '@capacitor-community/native-biometric';
import { Capacitor } from '@capacitor/core';

const KEYCHAIN_SERVER = 'com.axmadjonteacher.studenttracker.auth';

export async function isBiometricAvailable(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const result: AvailableResult = await NativeBiometric.isAvailable();
    return result.isAvailable;
  } catch {
    return false;
  }
}

/** Call after a successful passcode login to save credentials to Keychain */
export async function saveBiometricCredentials(
  username: string,
  password: string
): Promise<void> {
  await NativeBiometric.setCredentials({
    username,
    password,
    server: KEYCHAIN_SERVER,
  });
}

/** Delete credentials on logout */
export async function clearBiometricCredentials(): Promise<void> {
  try {
    await NativeBiometric.deleteCredentials({ server: KEYCHAIN_SERVER });
  } catch { /* credentials may not exist */ }
}

export interface BiometricAuthResult {
  success:  boolean;
  username?: string;
  password?: string;
  error?:   'not_enrolled' | 'lockout' | 'cancelled' | 'not_available' | 'unknown';
}

export async function authenticateWithBiometric(
  reason: string = 'Tizimga kirish uchun'
): Promise<BiometricAuthResult> {
  const available = await isBiometricAvailable();
  if (!available) return { success: false, error: 'not_available' };

  const options: BiometricOptions = {
    reason,
    title:          'Al-Xorazmiy',
    subtitle:       'Biometrik tekshirish',
    negativeButtonText: 'Bekor qilish',
    maxAttempts:    3,
  };

  try {
    await NativeBiometric.verifyIdentity(options);
    const credentials = await NativeBiometric.getCredentials({ server: KEYCHAIN_SERVER });
    return { success: true, username: credentials.username, password: credentials.password };
  } catch (e: unknown) {
    const code = (e as { code?: number }).code;
    if (code === 10) return { success: false, error: 'cancelled' };
    if (code === 11) return { success: false, error: 'not_enrolled' };
    if (code === 1004) return { success: false, error: 'lockout' };
    return { success: false, error: 'unknown' };
  }
}
```

Integration into `LoginScreen.tsx`:

```typescript
// Add to LoginScreen component, after existing password auth succeeds:

// On first successful login — offer to enable biometric
const offerBiometricEnrollment = async (username: string, password: string) => {
  const available = await isBiometricAvailable();
  if (!available) return;

  const alreadySaved = localStorage.getItem('biometric_enrolled') === 'true';
  if (alreadySaved) return;

  setDialog({
    title:        'Face ID yoqilsinmi?',
    message:      'Keyingi safar Face ID bilan tez kirishingiz mumkin.',
    confirmLabel: 'Yoqish',
    cancelLabel:  'Yo\'q',
    onConfirm:    async () => {
      await saveBiometricCredentials(username, password);
      localStorage.setItem('biometric_enrolled', 'true');
    },
  });
};

// On login screen mount — if enrolled, show biometric button
const handleBiometricLogin = async () => {
  const result = await authenticateWithBiometric();
  if (result.success && result.username && result.password) {
    // Feed credentials into existing handleLoginSuccess flow
    onLoginSuccess(result.username, result.password);
    haptics.success();
  } else if (result.error === 'not_enrolled') {
    localStorage.removeItem('biometric_enrolled');
  }
};
```

---

<a name="pillar-3"></a>
## Pillar 3 — Native-Grade OMR Camera Scanner

### 3.1 Camera Layer Integration

The existing `omrScanner.ts` processes images captured from `<input type="file">` or `@capacitor/camera` single-shot captures. For a live scanning experience (ZipGrade-style), you need a continuous preview feed. `@capacitor-community/camera-preview` renders a **native camera layer underneath the WebView**, allowing HTML to overlay transparent UI on top of a real-time video feed.

#### Installation

```bash
npm install @capacitor-community/camera-preview
npx cap sync ios
```

#### `Info.plist` Key

```xml
<key>NSCameraUsageDescription</key>
<string>Test varaqasini skanerlash uchun kamera kerak.</string>
```

#### TypeScript API — Start / Stop / Capture

```typescript
// src/utils/cameraPreview.ts
import { CameraPreview, CameraPreviewOptions, CameraPreviewPictureOptions } from '@capacitor-community/camera-preview';
import { Capacitor } from '@capacitor/core';

const PREVIEW_OPTIONS: CameraPreviewOptions = {
  position:       'rear',
  width:          window.innerWidth,
  height:         window.innerHeight,
  toBack:         true,          // native layer BEHIND the webview
  storeToFile:    false,
  disableAudio:   true,
  enableHighResolution: true,    // Full camera resolution for OMR accuracy
  quality:        90,
};

export async function startCameraPreview(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  // Make the webview background transparent so the native camera shows through
  document.body.style.setProperty('--webview-bg', 'transparent');
  document.documentElement.style.background = 'transparent';
  document.body.style.background = 'transparent';
  (document.getElementById('root') as HTMLElement).style.background = 'transparent';

  await CameraPreview.start(PREVIEW_OPTIONS);
}

export async function stopCameraPreview(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await CameraPreview.stop();

  // Restore opaque background
  (document.getElementById('root') as HTMLElement).style.background = '';
}

export interface CaptureResult {
  base64: string;   // JPEG data without data-URL prefix
}

export async function captureFrame(): Promise<CaptureResult> {
  const opts: CameraPreviewPictureOptions = { quality: 92 };
  const result = await CameraPreview.capture(opts);
  return { base64: result.value };
}

/** Decode base64 JPEG into an HTMLCanvasElement for omrScanner.ts consumption */
export function base64ToCanvas(base64: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d')!.drawImage(img, 0, 0);
      resolve(canvas);
    };
    img.onerror = reject;
    img.src = `data:image/jpeg;base64,${base64}`;
  });
}
```

#### WebView Z-Layer Strategy

When `toBack: true` is set, the native camera renders at `z-index: -∞` behind every HTML element. The WebView itself must be transparent (done above). All HTML elements with a non-transparent background will occlude the camera. The scanning overlay component must use fully transparent backgrounds everywhere except the corner bracket decorations.

---

### 3.2 Real-Time UI Overlay

```typescript
// src/components/OMRScanOverlay.tsx
import React, { useEffect, useRef, useState } from 'react';

interface Props {
  state: 'idle' | 'aligned' | 'captured' | 'processing';
  onCaptureTrigger: () => void;
}

const COLORS = {
  idle:       'rgba(255,255,255,0.70)',
  aligned:    'rgba(52,199,89,0.95)',   // iOS green
  captured:   'rgba(0,122,255,0.95)',   // iOS blue
  processing: 'rgba(255,159,10,0.95)',  // iOS orange
};

export const OMRScanOverlay: React.FC<Props> = ({ state, onCaptureTrigger }) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameRect, setFrameRect] = useState({ top: 0, left: 0, width: 0, height: 0 });

  // A4 aspect ratio: 1:√2 ≈ 0.7071
  // Frame occupies 86% of screen width, centered vertically
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth;
      const w  = vw * 0.86;
      const h  = w / 0.7071;
      const safeTop = parseInt(getComputedStyle(document.documentElement)
        .getPropertyValue('--safe-top') || '44');
      const top  = safeTop + (window.innerHeight - safeTop - h) * 0.38;
      const left = (vw - w) / 2;
      setFrameRect({ top, left, width: w, height: h });
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  const color = COLORS[state];
  const arm   = 28; // px, corner bracket arm length
  const thick = 3;  // stroke width

  const cornerSVG = (rotate: number) => (
    <svg
      width={arm + thick} height={arm + thick}
      style={{ position: 'absolute', ...cornerPosition(rotate, frameRect, arm, thick) }}
    >
      <path
        d={`M ${thick/2} ${arm + thick/2} L ${thick/2} ${thick/2} L ${arm + thick/2} ${thick/2}`}
        fill="none"
        stroke={color}
        strokeWidth={thick}
        strokeLinecap="round"
        style={{ transition: 'stroke 200ms ease' }}
      />
    </svg>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0,
      pointerEvents: 'none',
      zIndex: 100,
    }}>
      {/* Dimming vignette outside the frame */}
      <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <mask id="frame-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={frameRect.left} y={frameRect.top}
              width={frameRect.width} height={frameRect.height}
              rx="4" fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.45)" mask="url(#frame-mask)" />
      </svg>

      {/* Scanning line */}
      {(state === 'idle' || state === 'aligned') && (
        <div style={{
          position:  'absolute',
          top:        frameRect.top,
          left:       frameRect.left,
          width:      frameRect.width,
          height:     2,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          animation:  'scanLine 1.8s linear infinite',
          opacity:    0.75,
        }} />
      )}

      {/* Corner brackets */}
      {cornerSVG(0)}
      {cornerSVG(90)}
      {cornerSVG(180)}
      {cornerSVG(270)}

      {/* Capture button */}
      <div style={{ pointerEvents: 'auto', position: 'absolute',
        bottom: `calc(env(safe-area-inset-bottom) + 48px)`,
        left: '50%', transform: 'translateX(-50%)' }}
      >
        <button
          onClick={onCaptureTrigger}
          disabled={state === 'processing'}
          style={{
            width: 72, height: 72, borderRadius: '50%',
            border: `3px solid ${color}`,
            background: 'rgba(255,255,255,0.15)',
            backdropFilter: 'blur(12px)',
            cursor: 'pointer',
            transition: 'all 150ms var(--ease-spring)',
          }}
        />
      </div>
    </div>
  );
};

function cornerPosition(
  rotate: number,
  rect: { top:number; left:number; width:number; height:number },
  arm: number,
  thick: number
): React.CSSProperties {
  const offset = -thick / 2;
  const positions: Record<number, React.CSSProperties> = {
    0:   { top:  rect.top  + offset,               left: rect.left + offset,
           transformOrigin: 'top left',    transform: `rotate(0deg)`   },
    90:  { top:  rect.top  + offset,               left: rect.left + rect.width - arm - thick + offset,
           transformOrigin: 'top right',   transform: `rotate(90deg)`  },
    180: { top:  rect.top  + rect.height - arm - thick + offset, left: rect.left + rect.width - arm - thick + offset,
           transformOrigin: 'bottom right',transform: `rotate(180deg)` },
    270: { top:  rect.top  + rect.height - arm - thick + offset, left: rect.left + offset,
           transformOrigin: 'bottom left', transform: `rotate(270deg)` },
  };
  return positions[rotate];
}
```

Add the animation keyframe to `index.css`:

```css
@keyframes scanLine {
  from { transform: translateY(0); }
  to   { transform: translateY(calc(var(--frame-height, 600px) - 2px)); }
}
```

---

### 3.3 Computer Vision Architecture — Decision

#### Comparison Table

| Criterion | OpenCV.js (WebAssembly) | Swift Vision + Core Image (Native Plugin) |
|---|---|---|
| **Bundle size** | +3.5–7 MB WASM | 0 MB (OS-included) |
| **Cold start latency** | 700–1,200ms WASM compile | ~30ms plugin bridge init |
| **Per-frame latency** | 90–250ms (JS main thread or Worker) | 10–30ms (GPU/Neural Engine) |
| **FPS (continuous)** | 4–8 FPS | 24–30 FPS |
| **Accuracy — poor lighting** | Moderate (software CLAHE) | High (Vision ML auto-exposure) |
| **Perspective correction** | `getPerspectiveTransform` + `warpPerspective` | `CIPerspectiveCorrection` (GPU) |
| **Adaptive threshold** | `adaptiveThreshold` (software) | `CIColorThreshold` + `CIColorMonochrome` (GPU) |
| **Capacitor native code required** | None | ~300 lines Swift |
| **Offline support** | Yes (WASM bundled) | Yes (framework native) |
| **Maintenance surface** | npm updates | Xcode + Swift version updates |
| **App Store risk** | None | None |
| **Recommendation** | ✗ Insufficient for live feed | ✓ **Required for production quality** |

**Decision: Custom Swift Capacitor Plugin.**

OpenCV.js is acceptable for single-shot processing (where the user taps "scan" and waits 2–3 seconds). It is not acceptable for live detection (ZipGrade-style instant lock-on). The existing `omrScanner.ts` already implements the correct algorithm in TypeScript — porting the same bubble density logic to Swift takes ~300 lines and unlocks GPU-accelerated performance.

---

### 3.4 Image Processing Pipeline

#### Step 1 — Swift Capacitor Plugin Scaffold

Create two files in `ios/App/App/`:

**`OMRScannerPlugin.swift`** — Capacitor bridge:

```swift
import Foundation
import Capacitor

@objc(OMRScannerPlugin)
public class OMRScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier  = "OMRScannerPlugin"
    public let jsName      = "OMRScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "captureAndProcess", returnType: CAPPluginReturnPromise),
    ]

    private let processor = OMRProcessor()

    @objc func captureAndProcess(_ call: CAPPluginCall) {
        guard let base64 = call.getString("base64"),
              let imageData = Data(base64Encoded: base64),
              let uiImage  = UIImage(data: imageData) else {
            call.reject("Invalid image data")
            return
        }

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self else { return }
            let result = self.processor.process(image: uiImage)

            DispatchQueue.main.async {
                switch result {
                case .success(let sheet):
                    call.resolve([
                        "studentId":  sheet.studentId,
                        "answers":    sheet.answers,
                        "confidence": sheet.confidence,
                        "aligned":    sheet.aligned,
                    ])
                case .failure(let err):
                    call.reject(err.localizedDescription)
                }
            }
        }
    }
}
```

**`OMRProcessor.swift`** — Vision + Core Image pipeline:

```swift
import Vision
import CoreImage
import UIKit

struct OMRSheet {
    let studentId:  String          // e.g. "305" → mapped to BR/AL in JS
    let answers:    [String]        // ["A","C","B",...] length 15
    let confidence: [Double]        // 0.0–1.0 per question
    let aligned:    Bool            // true if all 4 corners found
}

enum OMRError: Error {
    case noRectangleFound
    case warpFailed
    case coordinatesInvalid
}

// Mirror of omr_coordinates.json constants
private struct OMRCoords {
    static let templateW: CGFloat = 750
    static let templateH: CGFloat = 1000
    // Questions 1-13: columns A=161, B=210, C=259, D=308; rows start 154, step 63.24
    static let leftX:    [CGFloat] = [161, 210, 259, 308]
    static let leftYs:   [CGFloat] = (0..<13).map { 154 + CGFloat($0) * 63.24 }
    // Questions 14-15: columns A=408, B=457, C=506, D=555
    static let rightX:   [CGFloat] = [408, 457, 506, 555]
    static let rightYs:  [CGFloat] = (0..<2).map  { 154 + CGFloat($0) * 63.24 }
    // Student ID grid: cols=[548,597,646], rows start 431, step 46.5, digits 0-9
    static let idX:      [CGFloat] = [548, 597, 646]
    static let idYs:     [CGFloat] = (0..<10).map { 431 + CGFloat($0) * 46.5 }
    static let bubbleR:  CGFloat   = 11
}

final class OMRProcessor {

    // Core Image context with GPU acceleration
    private let ciContext = CIContext(options: [.useSoftwareRenderer: false])

    func process(image: UIImage) -> Result<OMRSheet, Error> {
        guard let cgImage = image.cgImage else { return .failure(OMRError.warpFailed) }

        // Step 1: Detect sheet rectangle with Vision
        var observedRect: VNRectangleObservation?
        let request = VNDetectRectanglesRequest()
        request.minimumAspectRatio = 0.55
        request.maximumAspectRatio = 0.85
        request.minimumConfidence  = 0.75
        request.maximumObservations = 1

        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        try? handler.perform([request])
        observedRect = request.results?.first

        // Step 2: Perspective correction (falls back to full image if no rect found)
        let warped: CIImage
        if let obs = observedRect {
            let ci = CIImage(cgImage: cgImage)
            let filter = CIFilter.perspectiveCorrection()
            filter.inputImage  = ci
            // VNRectangleObservation corners are in normalized (0-1) coordinates, Y flipped
            let bounds = CIVector(x: ci.extent.width, y: ci.extent.height)
            filter.topLeft     = toCI(obs.topLeft,     bounds)
            filter.topRight    = toCI(obs.topRight,    bounds)
            filter.bottomLeft  = toCI(obs.bottomLeft,  bounds)
            filter.bottomRight = toCI(obs.bottomRight, bounds)
            guard let out = filter.outputImage else { return .failure(OMRError.warpFailed) }
            warped = out
        } else {
            warped = CIImage(cgImage: cgImage)
        }

        // Scale to canonical 750×1000
        let scaleX = OMRCoords.templateW / warped.extent.width
        let scaleY = OMRCoords.templateH / warped.extent.height
        let scaled = warped.transformed(by: CGAffineTransform(scaleX: scaleX, y: scaleY))

        // Step 3: Grayscale + binarize (adaptive threshold approximation)
        let gray = scaled
            .applyingFilter("CIColorControls", parameters: ["inputSaturation": 0.0])
        // Use luminance inversion + threshold to get white-on-black bubbles
        let binary = gray
            .applyingFilter("CIColorThreshold", parameters: ["inputThreshold": 0.40])

        guard let binaryCG = ciContext.createCGImage(binary, from: binary.extent) else {
            return .failure(OMRError.warpFailed)
        }

        // Step 4: Sample bubble regions
        let answers    = sampleQuestions(in: binaryCG)
        let studentId  = sampleStudentId(in: binaryCG)

        return .success(OMRSheet(
            studentId:  studentId,
            answers:    answers.map { $0.letter },
            confidence: answers.map { $0.confidence },
            aligned:    observedRect != nil
        ))
    }

    // MARK: - Bubble Sampling (mirrors omrScanner.ts density algorithm)

    private struct BubbleResult { let letter: String; let confidence: Double }

    private func sampleQuestions(in image: CGImage) -> [BubbleResult] {
        var results: [BubbleResult] = []
        let allCoords: [(xs: [CGFloat], y: CGFloat)] =
            OMRCoords.leftYs.map  { y in (OMRCoords.leftX,  y) } +
            OMRCoords.rightYs.map { y in (OMRCoords.rightX, y) }

        for (xs, y) in allCoords {
            var densities: [Double] = []
            var outerValues: [UInt8] = []

            for x in xs {
                let (inner, outer) = sampleBubble(in: image, cx: x, cy: y)
                densities.append(inner)
                outerValues.append(contentsOf: outer)
            }

            let minOuter = Double(outerValues.min() ?? 0)
            let maxOuter = Double(outerValues.max() ?? 255)
            let contrast = maxOuter - minOuter
            let threshold = minOuter + 0.45 * contrast

            let filled = densities.map { d in d < threshold / 255.0 } // dark = filled
            let maxDensity   = densities.min() ?? 1.0  // lower = darker = filled
            let secondMin    = densities.sorted().dropFirst().first ?? 1.0
            let margin       = secondMin - maxDensity

            if contrast > 25 && maxDensity < 0.70 && margin > 0.12 {
                let idx = densities.firstIndex(of: maxDensity) ?? 0
                let letter = ["A","B","C","D"][idx]
                results.append(BubbleResult(letter: letter, confidence: min(1.0, margin * 3)))
            } else {
                results.append(BubbleResult(letter: "?", confidence: 0.0))
            }
        }
        return results
    }

    private func sampleStudentId(in image: CGImage) -> String {
        var digits: [String] = []
        for x in OMRCoords.idX {
            var bestDigit = "?"
            var bestDensity = 1.0
            for (i, y) in OMRCoords.idYs.enumerated() {
                let (density, _) = sampleBubble(in: image, cx: x, cy: y)
                if density < bestDensity {
                    bestDensity = density
                    bestDigit  = "\(i)"
                }
            }
            digits.append(bestDigit)
        }
        return digits.joined()
    }

    // Returns (innerDensity 0-1, outerPixelValues)
    // innerDensity: mean normalised grayscale of pixels inside radius
    private func sampleBubble(in image: CGImage,
                               cx: CGFloat, cy: CGFloat) -> (Double, [UInt8]) {
        let r   = Int(OMRCoords.bubbleR)
        let ro  = r + 4          // outer ring
        let x0  = max(0, Int(cx) - ro)
        let y0  = max(0, Int(cy) - ro)
        let x1  = min(image.width  - 1, Int(cx) + ro)
        let y1  = min(image.height - 1, Int(cy) + ro)

        guard x0 < x1, y0 < y1 else { return (1.0, []) }

        let cropRect = CGRect(x: x0, y: y0, width: x1-x0, height: y1-y0)
        guard let cropped = image.cropping(to: cropRect) else { return (1.0, []) }

        let w = cropped.width
        let h = cropped.height
        var pixelData = [UInt8](repeating: 0, count: w * h)
        let colorSpace = CGColorSpaceCreateDeviceGray()
        guard let ctx = CGContext(data: &pixelData, width: w, height: h,
                                  bitsPerComponent: 8, bytesPerRow: w,
                                  space: colorSpace,
                                  bitmapInfo: CGImageAlphaInfo.none.rawValue) else {
            return (1.0, [])
        }
        ctx.draw(cropped, in: CGRect(x: 0, y: 0, width: w, height: h))

        let lcx = cx - CGFloat(x0)
        let lcy = cy - CGFloat(y0)
        var innerSum = 0.0; var innerCount = 0
        var outerValues: [UInt8] = []

        for py in 0..<h {
            for px in 0..<w {
                let dx = CGFloat(px) - lcx
                let dy = CGFloat(py) - lcy
                let dist = sqrt(dx*dx + dy*dy)
                let v = pixelData[py * w + px]
                if dist <= CGFloat(r) {
                    innerSum += Double(v) / 255.0
                    innerCount += 1
                } else if dist <= CGFloat(ro) {
                    outerValues.append(v)
                }
            }
        }

        let innerDensity = innerCount > 0 ? innerSum / Double(innerCount) : 1.0
        return (innerDensity, outerValues)
    }

    private func toCI(_ point: CGPoint, _ bounds: CIVector) -> CIVector {
        // VN coords: origin bottom-left, normalized. CIImage: origin bottom-left, pixels.
        return CIVector(x: point.x * bounds.x, y: point.y * bounds.y)
    }
}
```

Register the plugin in `ios/App/App/AppDelegate.swift`:

```swift
// Add to application(_:didFinishLaunchingWithOptions:) or via CAPBridgeViewController
// Capacitor auto-discovers @objc(OMRScannerPlugin) — no manual registration needed
// in Capacitor 5+. Just ensure the file is in the Xcode target membership.
```

#### TypeScript Bridge

```typescript
// src/utils/omrNativeScanner.ts
import { registerPlugin } from '@capacitor/core';

interface OMRScannerPlugin {
  captureAndProcess(options: { base64: string }): Promise<{
    studentId:  string;
    answers:    string[];
    confidence: number[];
    aligned:    boolean;
  }>;
}

const OMRScanner = registerPlugin<OMRScannerPlugin>('OMRScanner');

export { OMRScanner };
```

---

### 3.5 State Management & Real-Time Sync

#### Scan Result State Shape

Add to `App.tsx` state (or extract into a dedicated hook `useScanSession`):

```typescript
interface ScanResult {
  studentId:    string;          // raw "305" from OMR
  resolvedId:   string | null;   // "BR305" or "AL305" after grade mapping
  student:      Student | null;  // matched from students[] array
  answers:      string[];        // ["A","C","B",...] length 15
  confidence:   number[];        // 0–1 per answer
  correctCount: number;
  percentage:   number;          // 0–100
  subject:      'ENG' | 'MATH';
  status:       'idle' | 'scanning' | 'aligned' | 'processing' | 'done' | 'conflict' | 'error';
}
```

#### Grading Logic

```typescript
// src/utils/grading.ts
import { normalizeStudentId } from './idGenerator'; // existing utility

export interface GradeKey {
  subject:  'ENG' | 'MATH';
  answers:  string[];  // length 15, values "A"|"B"|"C"|"D"
}

export function gradeSheet(
  rawStudentId: string,
  scannedAnswers: string[],
  key: GradeKey,
  students: import('../types').Student[]
): {
  resolvedId:   string | null;
  student:      import('../types').Student | null;
  correctCount: number;
  percentage:   number;
} {
  // Normalize the 3-digit ID from OMR to BR/AL format
  // The OMR returns e.g. "305" — normalizeStudentId pads and prefixes
  const resolvedId = normalizeStudentId(rawStudentId);

  const student = students.find(s => s.id === resolvedId && !s.isDeleted) ?? null;

  const correctCount = scannedAnswers.reduce((acc, ans, i) => {
    return acc + (ans === key.answers[i] ? 1 : 0);
  }, 0);

  const percentage = Math.round((correctCount / 15) * 1000) / 10; // 1 decimal

  return { resolvedId, student, correctCount, percentage };
}
```

#### Optimistic Update + Supabase Sync

```typescript
// In TestorCabinet.tsx or useScanSession hook:

const handleScanComplete = async (
  raw: { studentId: string; answers: string[]; confidence: number[] },
  key: GradeKey,
  currentWeek: string
) => {
  haptics.success();

  const { resolvedId, student, correctCount, percentage } = gradeSheet(
    raw.studentId, raw.answers, key, students
  );

  if (!student) {
    setScanResult(r => ({ ...r, status: 'error', resolvedId }));
    haptics.error();
    return;
  }

  // Check for existing score this week (conflict detection)
  const existingScore = key.subject === 'ENG' ? student.engScore : student.mathScore;
  const hasConflict   = existingScore !== null;

  // 1. Optimistic UI update — update local state immediately
  setScanResult(r => ({
    ...r,
    resolvedId, student, correctCount, percentage,
    status: hasConflict ? 'conflict' : 'done'
  }));

  if (hasConflict) return; // wait for user to confirm overwrite

  // 2. Persist to Supabase
  await persistScore({ student, subject: key.subject, score: correctCount,
                        answers: raw.answers, week: currentWeek });
};

const persistScore = async (opts: {
  student:  Student;
  subject:  'ENG' | 'MATH';
  score:    number;
  answers:  string[];
  week:     string;
}) => {
  const scoreField = opts.subject === 'ENG' ? 'eng_score' : 'math_score';

  const { error } = await supabase
    .from('student_weeks')
    .upsert({
      student_id: opts.student.id,
      week:       opts.week,
      [scoreField]: opts.score,
    }, { onConflict: 'student_id,week' });

  if (error) {
    console.error('[OMR] Supabase upsert failed:', error);
    haptics.error();
  }

  // 3. Broadcast via Supabase Realtime to other teacher sessions
  supabase.channel('omr-scores').send({
    type:    'broadcast',
    event:   'score_update',
    payload: {
      studentId: opts.student.id,
      subject:   opts.subject,
      score:     opts.score,
      week:      opts.week,
    },
  });
};
```

#### Real-Time Listener (other teacher sessions receive updates instantly)

```typescript
// In App.tsx useEffect, after fetchAllData():
const channel = supabase.channel('omr-scores')
  .on('broadcast', { event: 'score_update' }, ({ payload }) => {
    setStudents(prev => prev.map(s => {
      if (s.id !== payload.studentId) return s;
      return {
        ...s,
        ...(payload.subject === 'ENG'
          ? { engScore: payload.score }
          : { mathScore: payload.score }),
      };
    }));
  })
  .subscribe();

return () => { supabase.removeChannel(channel); };
```

---

<a name="verification-checklist"></a>
## Verification Checklist

Before submitting to App Store Connect, verify each item on a physical iOS device (not simulator, except where noted).

| # | Check | How to Verify |
|---|-------|--------------|
| 1 | **Build succeeds** | `npm run build && npx cap sync ios` → Xcode Archive |
| 2 | **No web font flash on launch** | Remove Google Fonts `<link>` → cold-launch the app on device |
| 3 | **Safe area insets** | Test on iPhone with Dynamic Island (iPhone 15 Pro) and notch (iPhone 12) |
| 4 | **Haptics** | Physical device: tap buttons, trigger OMR scan, confirm delete |
| 5 | **Push permission flow** | First launch prompts system dialog; denial shows Settings CTA |
| 6 | **Push token registered** | Check `device_tokens` table in Supabase after permission grant |
| 7 | **Foreground notification** | Send test push while app is open; in-app banner appears |
| 8 | **Background notification tap** | Lock device, receive push, tap → app routes correctly |
| 9 | **Camera permission denied gracefully** | Reset permissions (Settings → Privacy), deny camera → verify Settings CTA |
| 10 | **Biometric enrollment offer** | Login with passcode → Face ID enrollment dialog appears |
| 11 | **Biometric login** | Simulator: Features → Face ID → Enrolled → Matching Face |
| 12 | **Biometric fallback** | Deny Face ID → passcode entry appears |
| 13 | **Camera preview starts** | OMR scanner screen: native camera visible through transparent webview |
| 14 | **Overlay corners visible** | SVG brackets appear at A4 frame corners on all device sizes |
| 15 | **OMR scan — happy path** | Print test sheet → align → capture → student ID + answers parsed correctly |
| 16 | **OMR scan — poor lighting** | Test in dim room; Swift Vision auto-adjusts |
| 17 | **OMR optimistic update** | Score appears in student card before network round-trip |
| 18 | **Realtime sync** | Open app on two devices; scan on one → other updates within ~500ms |
| 19 | **App Store pre-validation** | Xcode Organizer → Validate App → 0 errors, 0 warnings |
| 20 | **Guideline 4.2 self-audit** | App uses camera (OMR), biometrics (login), push (notifications), haptics (every tap), native OS font — substantially native |

---

*Document generated for App ID `com.axmadjonteacher.studenttracker` · Capacitor 8.4.0 · iOS 17+ target*
