/**
 * EncryptionService.ts
 * Provides end-to-end encryption using the Web Crypto API (AES-GCM).
 * Your data is encrypted locally before being uploaded to Google Drive.
 */

const ALGORITHM = 'AES-GCM';
const IV_LENGTH = 12; // Standard for AES-GCM
const KEY_STRETCH_ITERATIONS = 100000;

export class EncryptionService {
  /**
   * Derives a cryptographic key from a plain text passphrase.
   */
  private static async deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      encoder.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt as any,
        iterations: KEY_STRETCH_ITERATIONS,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: ALGORITHM, length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts a string of data using a passphrase.
   * Returns a base64 encoded string containing Salt + IV + Ciphertext.
   */
  static async encrypt(plainText: string, passphrase: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    const key = await this.deriveKey(passphrase, salt);
    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );

    // Combine Salt + IV + Ciphertext into a single array
    const combined = new Uint8Array(salt.length + iv.length + cipherBuffer.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(cipherBuffer), salt.length + iv.length);

    // Convert to Base64 safely (avoid spread operator which hits stack limit)
    let binary = '';
    const bytes = new Uint8Array(combined);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Decrypts a base64 encoded string (Salt + IV + Ciphertext) using a passphrase.
   */
  static async decrypt(encryptedBase64: string, passphrase: string): Promise<string> {
    const combined = new Uint8Array(
      atob(encryptedBase64)
        .split('')
        .map((c) => c.charCodeAt(0))
    );

    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 16 + IV_LENGTH);
    const ciphertext = combined.slice(16 + IV_LENGTH);

    const key = await this.deriveKey(passphrase, salt);
    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: ALGORITHM, iv },
        key,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      throw new Error('Decryption failed. Incorrect passphrase or corrupted data.');
    }
  }

  /**
   * Generates a random secure passphrase (optional utility).
   */
  static generatePassphrase(): string {
    return Array.from(window.crypto.getRandomValues(new Uint16Array(12)))
      .map(n => n.toString(36))
      .join('-');
  }
}
