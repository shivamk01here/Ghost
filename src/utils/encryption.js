import CryptoJS from 'crypto-js';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const ENC_KEY_STORE = 'ghost_enc_key_v1';

// ── Get or create a persistent 256-bit AES key ─────────────────────────────
export async function getEncryptionKey() {
  try {
    let key = await SecureStore.getItemAsync(ENC_KEY_STORE);
    if (key) return key;

    // Generate random 32-byte key
    const randomBytes = await Crypto.getRandomBytesAsync(32);
    key = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    await SecureStore.setItemAsync(ENC_KEY_STORE, key);
    return key;
  } catch (e) {
    console.error('getEncryptionKey error:', e);
    throw e;
  }
}

// ── Import existing backup key ─────────────────────────────────────────────
export async function importEncryptionKey(backupStr) {
  try {
    const raw = backupStr.replace(/^GHOST-KEY-/i, '').replace(/-/g, '').toLowerCase();
    if (raw.length !== 64 || !/^[0-9a-f]+$/.test(raw)) {
      throw new Error('Invalid Recovery Key format');
    }
    await SecureStore.setItemAsync(ENC_KEY_STORE, raw);
    return true;
  } catch (e) {
    console.error('importEncryptionKey:', e);
    throw e;
  }
}

// ── Encrypt any JS object → encrypted string ───────────────────────────────
export async function encrypt(data) {
  const key       = await getEncryptionKey();
  const jsonStr   = JSON.stringify(data);
  const encrypted = CryptoJS.AES.encrypt(jsonStr, key).toString();
  return encrypted;
}

// ── Decrypt encrypted string → JS object ──────────────────────────────────
export async function decrypt(encryptedStr) {
  const key       = await getEncryptionKey();
  const decrypted = CryptoJS.AES.decrypt(encryptedStr, key);
  const jsonStr   = decrypted.toString(CryptoJS.enc.Utf8);
  if (!jsonStr) throw new Error('Decryption failed — wrong key or corrupt data');
  return JSON.parse(jsonStr);
}

// ── Hash a string (for integrity checks) ──────────────────────────────────
export async function hashString(str) {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256, str
  );
}

// ── Export encryption key as backup string ─────────────────────────────────
export async function exportKeyAsBackup() {
  const key = await getEncryptionKey();
  // Encode as base64-like readable string
  return `GHOST-KEY-${key.toUpperCase().match(/.{1,8}/g).join('-')}`;
}