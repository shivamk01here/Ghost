import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const KEYS = {
  DECOY_HASH: 'ghost_decoy_hash',
  REAL_HASH:  'ghost_real_hash',
  HAS_SETUP:  'ghost_has_setup',
};

const SALT = 'ghost_journal_v1';

async function hashCode(code) {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${SALT}:${code}`
  );
  return digest;
}

export async function isSetupComplete() {
  try {
    const val = await SecureStore.getItemAsync(KEYS.HAS_SETUP);
    return val === 'true';
  } catch {
    return false;
  }
}

export async function setupPasscodes(decoyCode, realCode) {
  const [dHash, rHash] = await Promise.all([
    hashCode(decoyCode),
    hashCode(realCode),
  ]);
  await SecureStore.setItemAsync(KEYS.DECOY_HASH, dHash);
  await SecureStore.setItemAsync(KEYS.REAL_HASH,  rHash);
  await SecureStore.setItemAsync(KEYS.HAS_SETUP,  'true');
}

// Returns: 'real' | 'decoy' | null
export async function verifyPasscode(code) {
  try {
    const inputHash = await hashCode(code);
    const [dHash, rHash] = await Promise.all([
      SecureStore.getItemAsync(KEYS.DECOY_HASH),
      SecureStore.getItemAsync(KEYS.REAL_HASH),
    ]);
    if (rHash && inputHash === rHash) return 'real';
    if (dHash && inputHash === dHash) return 'decoy';
    return null;
  } catch {
    return null;
  }
}

export async function resetAll() {
  await Promise.all([
    SecureStore.deleteItemAsync(KEYS.DECOY_HASH),
    SecureStore.deleteItemAsync(KEYS.REAL_HASH),
    SecureStore.deleteItemAsync(KEYS.HAS_SETUP),
  ]);
}