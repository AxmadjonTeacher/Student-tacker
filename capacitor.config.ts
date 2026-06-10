import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.axmadjonteacher.studenttracker',
  appName: 'Student Tracker',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
