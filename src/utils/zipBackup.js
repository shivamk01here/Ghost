import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { loadEntries, saveEntries } from './storage';
import { encrypt, decrypt } from './encryption';

// ── Export All Data as ZIP (Encrypted) ────────────────────────────────────
// Streams all entry JSON + every local media file into a .zip.
// Every single file inside the ZIP is AES-256 encrypted independently.

export async function exportZip(onProgress) {
  const zip = new JSZip();
  const mediaFolder = zip.folder('media');

  onProgress?.({ step: 'Reading & encrypting journals…', percent: 5, sizeMB: 0 });

  const real  = await loadEntries('real');
  const decoy = await loadEntries('decoy');

  // Add JSON data (Encrypted)
  const encReal = await encrypt(real);
  const encDecoy = await encrypt(decoy);
  
  zip.file('real_entries.json.enc',  encReal);
  zip.file('decoy_entries.json.enc', encDecoy);

  // Collect all unique media filenames
  const allEntries = [
    ...Object.values(real).flat(),
    ...Object.values(decoy).flat(),
  ];

  const mediaFiles = new Set();
  function collectUri(obj) {
    if (obj?.uri && obj.uri.startsWith('media_')) mediaFiles.add(obj.uri);
  }
  allEntries.forEach(e => {
    collectUri(e.video);
    collectUri(e.music);
    collectUri(e.voice);
    e.images?.forEach(collectUri);
    e.blocks?.forEach(b => b.type === 'collage' && b.images?.forEach(collectUri));
  });

  onProgress?.({ step: `Packing ${mediaFiles.size} media files securely…`, percent: 20, sizeMB: 0 });

  let packed = 0;
  for (const name of mediaFiles) {
    const path = FileSystem.documentDirectory + name;
    const info = await FileSystem.getInfoAsync(path);
    if (info.exists) {
      const b64 = await FileSystem.readAsStringAsync(path, { encoding: FileSystem.EncodingType.Base64 });
      const encMedia = await encrypt({ type: 'media', base64: b64 });
      mediaFolder.file(name + '.enc', encMedia);
    }
    packed++;
    const pct = 20 + Math.round((packed / mediaFiles.size) * 50);
    onProgress?.({ step: `Encrypting media ${packed}/${mediaFiles.size}…`, percent: pct, sizeMB: 0 });
  }

  onProgress?.({ step: 'Compressing secure archive…', percent: 72, sizeMB: 0 });

  const b64Zip = await zip.generateAsync(
    { type: 'base64', compression: 'DEFLATE', compressionOptions: { level: 6 } },
    ({ percent, currentFile }) => {
      onProgress?.({ step: `Compressing ${currentFile || ''}…`, percent: 72 + Math.round(percent * 0.2), sizeMB: 0 });
    }
  );

  const sizeMB = (b64Zip.length * 0.75 / 1024 / 1024).toFixed(1);
  onProgress?.({ step: 'Saving archive…', percent: 94, sizeMB });

  const ts = new Date().toISOString().slice(0, 10);
  const dest = FileSystem.cacheDirectory + `Ghost_Safe_Backup_${ts}.zip`;
  await FileSystem.writeAsStringAsync(dest, b64Zip, { encoding: FileSystem.EncodingType.Base64 });

  onProgress?.({ step: 'Done! Sharing…', percent: 100, sizeMB });

  await Sharing.shareAsync(dest, { mimeType: 'application/zip', dialogTitle: 'Save Encrypted Ghost Backup' });
  return { success: true, sizeMB };
}

// ── Import ZIP (Decrypted) ────────────────────────────────────────────────
// Picks a secure .zip file, extracts and decrypts JSON + media.

export async function importZip(onProgress) {
  onProgress?.({ step: 'Picking secure backup…', percent: 0, sizeMB: 0 });

  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/zip', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled) return { success: false, error: 'cancelled' };

  const asset = result.assets[0];
  const sizeMB = ((asset.size || 0) / 1024 / 1024).toFixed(1);

  onProgress?.({ step: `Reading archive (${sizeMB} MB)…`, percent: 8, sizeMB });

  const b64 = await FileSystem.readAsStringAsync(asset.uri, { encoding: FileSystem.EncodingType.Base64 });

  onProgress?.({ step: 'Opening archive…', percent: 20, sizeMB });

  const zip = await JSZip.loadAsync(b64, { base64: true });

  onProgress?.({ step: 'Decrypting journal entries…', percent: 30, sizeMB });

  // Restore JSON entries (Decrypt them first)
  const realFile  = zip.file('real_entries.json.enc');
  const decoyFile = zip.file('decoy_entries.json.enc');

  if (realFile) {
    const encJson   = await realFile.async('string');
    const imported  = await decrypt(encJson);
    const existing  = await loadEntries('real');
    const merged = { ...existing };
    for (const [date, arr] of Object.entries(imported)) {
      if (!merged[date]) merged[date] = [];
      const existingIds = new Set(merged[date].map(e => e.id));
      for (const entry of arr) {
        if (!existingIds.has(entry.id)) merged[date].push(entry);
      }
    }
    await saveEntries(merged, 'real');
  }

  if (decoyFile) {
    const encJson   = await decoyFile.async('string');
    const imported  = await decrypt(encJson);
    const existing  = await loadEntries('decoy');
    const merged    = { ...existing };
    for (const [date, arr] of Object.entries(imported)) {
      if (!merged[date]) merged[date] = [];
      const existingIds = new Set(merged[date].map(e => e.id));
      for (const entry of arr) {
        if (!existingIds.has(entry.id)) merged[date].push(entry);
      }
    }
    await saveEntries(merged, 'decoy');
  }

  // Restore media files
  const mediaFiles = Object.keys(zip.files).filter(n => n.startsWith('media/') && !zip.files[n].dir);
  const totalMedia = mediaFiles.length;

  for (let i = 0; i < totalMedia; i++) {
    const fullName = mediaFiles[i];
    // Strip "media/" and ".enc" from the exported name
    let fileName = fullName.replace('media/', '');
    if (fileName.endsWith('.enc')) fileName = fileName.slice(0, -4);
    
    const dest = FileSystem.documentDirectory + fileName;
    const info = await FileSystem.getInfoAsync(dest);
    
    if (!info.exists) {
      const encData = await zip.files[fullName].async('string');
      // Some extremely old backups might have raw media directly inside without .enc? Handle fallback naturally because decrypt throws if invalid shape.
      try {
        const decryptedObj = await decrypt(encData);
        if (decryptedObj?.base64) {
          await FileSystem.writeAsStringAsync(dest, decryptedObj.base64, { encoding: FileSystem.EncodingType.Base64 });
        }
      } catch (e) {
        console.warn(`Skipping un-decryptable media chunk ${fileName}`);
        // If it was already raw binary somehow, saving it is tricky. Skip for safety since our export always encrypts.
      }
    }
    const pct = 40 + Math.round(((i + 1) / totalMedia) * 55);
    onProgress?.({ step: `Decrypting media ${i + 1}/${totalMedia}…`, percent: pct, sizeMB });
  }

  onProgress?.({ step: 'Done!', percent: 100, sizeMB });
  return { success: true, sizeMB };
}
