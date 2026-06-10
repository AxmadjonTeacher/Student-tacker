import { registerPlugin } from '@capacitor/core';

export interface OMRScanResult {
  studentId: string;
  answers: string[];
  confidence: number[];
  aligned: boolean;
}

interface OMRScannerPlugin {
  captureAndProcess(options: { base64: string }): Promise<OMRScanResult>;
}

export const OMRScanner = registerPlugin<OMRScannerPlugin>('OMRScanner');
