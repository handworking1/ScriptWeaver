import { safeStorage } from 'electron';

/**
 * Encrypt an API key using Electron's safeStorage.
 * Returns base64-encoded encrypted string, or empty string if encryption unavailable.
 */
export function encryptApiKey(plaintext: string): string {
  if (!safeStorage.isEncryptionAvailable()) {
    // Fallback: store as base64 (not truly secure, but safeStorage isn't available)
    return Buffer.from(plaintext, 'utf-8').toString('base64');
  }
  const encrypted = safeStorage.encryptString(plaintext);
  return encrypted.toString('base64');
}

/**
 * Decrypt an API key encrypted with safeStorage.
 */
export function decryptApiKey(encrypted: string): string {
  if (!encrypted) return '';
  if (!safeStorage.isEncryptionAvailable()) {
    return Buffer.from(encrypted, 'base64').toString('utf-8');
  }
  return safeStorage.decryptString(Buffer.from(encrypted, 'base64'));
}
