import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { GOOGLE_CONFIG } from '../config/google';
import { encrypt, decrypt } from './encryption';
import { loadEntries, saveEntries } from './storage';

WebBrowser.maybeCompleteAuthSession();

const STORE = {
  ACCESS_TOKEN:  'ghost_drive_access_token',
  REFRESH_TOKEN: 'ghost_drive_refresh_token',
  EMAIL:         'ghost_drive_email',
  LAST_SYNC:     'ghost_drive_last_sync',
};

const DRIVE_API    = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3';

// Legacy files
const REAL_FILE    = 'ghost_vault_real.enc';
const DECOY_FILE   = 'ghost_vault_decoy.enc';

// ── Auth ───────────────────────────────────────────────────────────────────

export function useGoogleAuth() {
  // 🔴 CRITICAL FIX: Google explicitly blocks Native Android Client IDs from requesting offline Refresh Tokens ('code' response type) over custom app URIs.
  // To bypass this, we MUST use the Web Client ID (expoClientId) and route through the strict HTTPS Expo Auth Proxy.
  const clientId = GOOGLE_CONFIG.expoClientId;

  const redirectUri = AuthSession.makeRedirectUri({ 
    useProxy: true,
    projectNameForProxy: '@shivam01here/ghost-journal'
  });

  const discovery = AuthSession.useAutoDiscovery('https://accounts.google.com');

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId,
      scopes: GOOGLE_CONFIG.scopes,
      redirectUri,
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      extraParams: { access_type: 'offline', prompt: 'consent' },
    },
    discovery
  );

  return { request, response, promptAsync, redirectUri };
}

export async function handleAuthResponse(response, request) {
  if (response?.type !== 'success') return { success: false, error: 'Auth cancelled' };

  try {
    const clientId = Platform.OS === 'ios'
      ? GOOGLE_CONFIG.iosClientId
      : GOOGLE_CONFIG.androidClientId;

    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'ghostjournal' });

    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint:         'https://oauth2.googleapis.com/token',
      revocationEndpoint:    'https://oauth2.googleapis.com/revoke',
    };

    const tokenResult = await AuthSession.exchangeCodeAsync(
      {
        clientId,
        code: response.params.code,
        redirectUri,
        extraParams: request.codeVerifier ? { code_verifier: request.codeVerifier } : undefined,
      },
      discovery
    );

    const { accessToken, refreshToken } = tokenResult;
    if (!accessToken) return { success: false, error: 'No token received' };

    await SecureStore.setItemAsync(STORE.ACCESS_TOKEN, accessToken);
    if (refreshToken) await SecureStore.setItemAsync(STORE.REFRESH_TOKEN, refreshToken);

    const userRes = await fetchWithAuth('https://www.googleapis.com/oauth2/v2/userinfo');
    const user = await userRes.json();

    if (user.email) await SecureStore.setItemAsync(STORE.EMAIL, user.email);

    return { success: true, email: user.email };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function disconnectDrive() {
  await Promise.all([
    SecureStore.deleteItemAsync(STORE.ACCESS_TOKEN),
    SecureStore.deleteItemAsync(STORE.REFRESH_TOKEN),
    SecureStore.deleteItemAsync(STORE.EMAIL),
    SecureStore.deleteItemAsync(STORE.LAST_SYNC),
  ]);
}

export async function isConnected() {
  const token = await SecureStore.getItemAsync(STORE.ACCESS_TOKEN);
  const refreshToken = await SecureStore.getItemAsync(STORE.REFRESH_TOKEN);
  return !!(token || refreshToken);
}

export async function getConnectedEmail() {
  return (await SecureStore.getItemAsync(STORE.EMAIL)) || '';
}

export async function getLastSyncTime() {
  return await SecureStore.getItemAsync(STORE.LAST_SYNC);
}

// ── Smart Fetcher with Refresh ─────────────────────────────────────────────

async function fetchWithAuth(url, options = {}) {
  let token = await SecureStore.getItemAsync(STORE.ACCESS_TOKEN);
  if (!token) throw new Error('Not connected to Google Drive');

  const makeHeaders = (t) => ({ ...options.headers, Authorization: `Bearer ${t}` });
  let res = await fetch(url, { ...options, headers: makeHeaders(token) });

  if (res.status === 401) {
    const refreshToken = await SecureStore.getItemAsync(STORE.REFRESH_TOKEN);
    if (!refreshToken) throw new Error('Session expired, please reconnect Drive.');

    const clientId = Platform.OS === 'ios' ? GOOGLE_CONFIG.iosClientId : GOOGLE_CONFIG.androidClientId;
    
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${clientId}&refresh_token=${refreshToken}&grant_type=refresh_token`,
    });

    if (!tokenRes.ok) throw new Error('Failed to refresh authentication session');
    
    const data = await tokenRes.json();
    token = data.access_token;
    await SecureStore.setItemAsync(STORE.ACCESS_TOKEN, token);

    // Retry actual request
    res = await fetch(url, { ...options, headers: makeHeaders(token) });
  }

  return res;
}

// ── Drive Helpers ──────────────────────────────────────────────────────────

async function listAllFiles() {
  const files = [];
  let pageToken = '';
  do {
    const url = `${DRIVE_API}/files?spaces=appDataFolder&fields=nextPageToken,files(id,name,modifiedTime,size)&pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetchWithAuth(url);
    if (!res.ok) throw new Error('Failed to list Drive files');
    const data = await res.json();
    if (data.files) files.push(...data.files);
    pageToken = data.nextPageToken || '';
  } while (pageToken);
  return files;
}

async function uploadFile(name, content, existingId = null) {
  const metadata = { name, parents: existingId ? undefined : ['appDataFolder'] };
  const boundary = '-------ghost_boundary_2024';
  const body = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    '',
    content,
    `--${boundary}--`,
  ].join('\r\n');

  const url = existingId
    ? `${DRIVE_UPLOAD}/files/${existingId}?uploadType=multipart`
    : `${DRIVE_UPLOAD}/files?uploadType=multipart`;

  const method = existingId ? 'PATCH' : 'POST';
  const res = await fetchWithAuth(url, {
    method,
    headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
    body,
  });

  if (!res.ok) throw new Error(`Upload failed: ${await res.text()}`);
  return await res.json();
}

async function downloadFileContent(fileId) {
  const res = await fetchWithAuth(`${DRIVE_API}/files/${fileId}?alt=media`);
  if (!res.ok) throw new Error('Download failed');
  return await res.text();
}

async function deleteFile(fileId) {
  await fetchWithAuth(`${DRIVE_API}/files/${fileId}`, { method: 'DELETE' });
}

// ── Raw Media Helpers ──────────────────────────────────────────────────────

function extractMediaFilenames(e) {
  const files = new Set();
  const pushIf = (uri) => { if (uri && uri.startsWith('media_')) files.add(uri) };
  
  if (e.video) pushIf(e.video.uri);
  if (e.music) pushIf(e.music.uri);
  if (e.voice) pushIf(e.voice.uri);
  if (e.images) e.images.forEach(img => pushIf(img.uri));
  if (e.blocks) {
    e.blocks.forEach(b => {
      if (b.type === 'collage' && b.images) b.images.forEach(img => pushIf(img.uri));
    });
  }
  return Array.from(files);
}

function extractPreviewFilename(e) {
  if (e.images && e.images.length > 0 && e.images[0].uri?.startsWith('media_')) return e.images[0].uri;
  if (e.blocks) {
    for (const b of e.blocks) {
      if (b.type === 'collage' && b.images && b.images.length > 0 && b.images[0].uri?.startsWith('media_')) {
        return b.images[0].uri;
      }
    }
  }
  return null;
}

async function uploadRawMedia(filename) {
  const path = FileSystem.documentDirectory + filename;
  const fileInfo = await FileSystem.getInfoAsync(path);
  if (!fileInfo.exists) return; 

  const initRes = await fetchWithAuth(`${DRIVE_UPLOAD}/files?uploadType=resumable`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: filename, parents: ['appDataFolder'] })
  });
  
  const locationUrl = initRes.headers.get('Location');
  if (!locationUrl) throw new Error('Failed to init resumable upload');

  const token = await SecureStore.getItemAsync(STORE.ACCESS_TOKEN);
  const upRes = await FileSystem.uploadAsync(locationUrl, path, {
    httpMethod: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (upRes.status !== 200 && upRes.status !== 201) {
    throw new Error('Raw upload failed: ' + upRes.body);
  }
}

async function downloadRawMedia(fileId, filename) {
  const path = FileSystem.documentDirectory + filename;
  const token = await SecureStore.getItemAsync(STORE.ACCESS_TOKEN);
  
  const res = await FileSystem.downloadAsync(
    `${DRIVE_API}/files/${fileId}?alt=media`,
    path,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (res.status !== 200) throw new Error('Raw media download failed');
}

// ── Delta Sync Phase 1: Text Only (fast, immediate) ───────────────────────
// Downloads ALL text entries first in concurrent batches of 10.
// Media is ignored in this phase. Progress fires frequently.

export async function syncToDrive(ignored1, ignored2, onProgress) {
  if (!(await isConnected())) return { success: false, error: 'Not connected' };

  try {
    onProgress?.({ step: 'Loading local data…', percent: 5 });
    const realDict  = await loadEntries('real');
    const decoyDict = await loadEntries('decoy');

    const allLocal = [
      ...Object.values(realDict).flat().map(e => ({ ...e, _mode: 'real' })),
      ...Object.values(decoyDict).flat().map(e => ({ ...e, _mode: 'decoy' })),
    ];
    const localMap = {};
    for (const e of allLocal) localMap[`${e._mode}_entry_${e.id}.enc`] = e;

    onProgress?.({ step: 'Scanning Drive…', percent: 12 });
    const remoteFiles = await listAllFiles();

    // Legacy migration
    const legacyReal  = remoteFiles.find(f => f.name === REAL_FILE);
    const legacyDecoy = remoteFiles.find(f => f.name === DECOY_FILE);
    if (legacyReal || legacyDecoy) {
      onProgress?.({ step: 'Migrating legacy vault…', percent: 18 });
      if (legacyReal) {
        const enc = await downloadFileContent(legacyReal.id);
        const data = await decrypt(enc);
        const merged = { ...realDict, ...(data.entries || {}) };
        await saveEntries(merged, 'real'); await deleteFile(legacyReal.id);
        Object.assign(realDict, merged);
      }
      if (legacyDecoy) {
        const enc = await downloadFileContent(legacyDecoy.id);
        const data = await decrypt(enc);
        const merged = { ...decoyDict, ...(data.entries || {}) };
        await saveEntries(merged, 'decoy'); await deleteFile(legacyDecoy.id);
        Object.assign(decoyDict, merged);
      }
      allLocal.length = 0;
      allLocal.push(
        ...Object.values(realDict).flat().map(e => ({ ...e, _mode: 'real' })),
        ...Object.values(decoyDict).flat().map(e => ({ ...e, _mode: 'decoy' }))
      );
      for (const e of allLocal) localMap[`${e._mode}_entry_${e.id}.enc`] = e;
    }

    onProgress?.({ step: 'Calculating delta…', percent: 25 });
    const lastSyncStr = await SecureStore.getItemAsync(STORE.LAST_SYNC);
    const lastSyncTime = lastSyncStr ? new Date(lastSyncStr).getTime() : 0;

    const remoteMap   = {};
    const remoteMedia = {};
    for (const f of remoteFiles) {
      if (f.name.endsWith('.enc') && f.name.includes('_entry_')) remoteMap[f.name] = f;
      else if (f.name.startsWith('media_')) remoteMedia[f.name] = f;
    }

    const toUpload   = [];
    const toDownload = [];
    const conflicts  = [];

    for (const [name, localEntry] of Object.entries(localMap)) {
      const remote = remoteMap[name];
      if (!remote) { toUpload.push({ name, entry: localEntry }); continue; }
      
      const localTime  = new Date(localEntry.updatedAt || localEntry.createdAt).getTime();
      const remoteTime = new Date(remote.modifiedTime).getTime();
      
      if (Math.abs(localTime - remoteTime) < 2000) continue; // In sync
      
      if (localTime > remoteTime) {
         // Local is newer. Did another device also edit it since our last sync?
         if (lastSyncTime > 0 && remoteTime > lastSyncTime) {
            toDownload.push(remote); // Accept remote as canonical
            const conflictEntry = { ...localEntry, id: `${localEntry.id}_conflict_${Date.now()}` };
            toUpload.push({ name: name.replace(localEntry.id, conflictEntry.id), entry: conflictEntry });
            conflicts.push(conflictEntry);
         } else {
            toUpload.push({ name, entry: localEntry, existingId: remote.id });
         }
      } else {
         // Remote is newer. Did we local-edit it since our last sync?
         if (lastSyncTime > 0 && localTime > lastSyncTime) {
            toDownload.push(remote);
            const conflictEntry = { ...localEntry, id: `${localEntry.id}_conflict_${Date.now()}` };
            toUpload.push({ name: name.replace(localEntry.id, conflictEntry.id), entry: conflictEntry });
            conflicts.push(conflictEntry);
         } else {
            toDownload.push(remote);
         }
      }
    }
    
    for (const [name, remote] of Object.entries(remoteMap)) {
      if (!localMap[name]) toDownload.push(remote);
    }

    const total = toUpload.length + toDownload.length;
    let done = 0;

    // ── CONCURRENT DOWNLOADS in batches of 10 ──
    const BATCH = 10;
    let hasDownloaded = false;
    for (let i = 0; i < toDownload.length; i += BATCH) {
      const batch = toDownload.slice(i, i + BATCH);
      onProgress?.({ step: `Downloading entries ${i + 1}–${Math.min(i + BATCH, toDownload.length)} of ${toDownload.length}…`, percent: 30 + Math.round((done / total) * 55) });

      await Promise.all(batch.map(async (r) => {
        const enc = await downloadFileContent(r.id);
        const entry = await decrypt(enc);
        const isReal = r.name.startsWith('real_');
        const targetDict = isReal ? realDict : decoyDict;
        if (!targetDict[entry.dateKey]) targetDict[entry.dateKey] = [];
        targetDict[entry.dateKey] = targetDict[entry.dateKey].filter(e => e.id !== entry.id);
        targetDict[entry.dateKey].push(entry);
        hasDownloaded = true;
      }));
      done += batch.length;
    }
    
    if (hasDownloaded || conflicts.length > 0) {
      for (const c of conflicts) {
        const dict = c._mode === 'real' ? realDict : decoyDict;
        if (!dict[c.dateKey]) dict[c.dateKey] = [];
        dict[c.dateKey].push(c);
      }
      await saveEntries(realDict, 'real');
      await saveEntries(decoyDict, 'decoy');
    }

    // ── PREVIEW MEDIA DOWNLOADS (Only the first image for grid) ──
    allLocal.length = 0;
    allLocal.push(
      ...Object.values(realDict).flat().map(e => ({ ...e, _mode: 'real' })),
      ...Object.values(decoyDict).flat().map(e => ({ ...e, _mode: 'decoy' }))
    );

    const requiredPreviews = new Set();
    for (const e of allLocal) {
      const p = extractPreviewFilename(e);
      if (p) requiredPreviews.add(p);
    }

    const previewsToDownload = [];
    for (const p of requiredPreviews) {
      if (remoteMedia[p]) {
        const path = FileSystem.documentDirectory + p;
        const info = await FileSystem.getInfoAsync(path);
        if (!info.exists) previewsToDownload.push(remoteMedia[p]);
      }
    }

    let pDone = 0;
    for (const rm of previewsToDownload) {
      onProgress?.({ step: `Fetching previews ${pDone + 1}/${previewsToDownload.length}…`, percent: 85 });
      await downloadRawMedia(rm.id, rm.name);
      pDone++;
    }

    // ── SEQUENTIAL UPLOADS ──
    for (const u of toUpload) {
      onProgress?.({ step: `Uploading ${done + 1}/${total}…`, percent: 85 + Math.round((done / total) * 5) });
      const cleaned = { ...u.entry }; delete cleaned._mode;
      const enc = await encrypt(cleaned);
      await uploadFile(u.name, enc, u.existingId);
      done++;
    }

    onProgress?.({ step: 'Backing up new media…', percent: 92 });

    // ── MEDIA UPLOADS (new local media not on Drive yet) ──
    const requiredMedia = new Set();
    for (const e of allLocal) extractMediaFilenames(e).forEach(m => requiredMedia.add(m));
    let mediaUploaded = 0;
    for (const m of requiredMedia) {
      if (!remoteMedia[m]) {
        await uploadRawMedia(m);
        mediaUploaded++;
      }
    }

    onProgress?.({ step: 'Sweeping orphaned media…', percent: 96 });
    
    // 1. Local Sweep
    const localDirFiles = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory);
    for (const f of localDirFiles) {
      if (f.startsWith('media_') && !requiredMedia.has(f)) {
        await FileSystem.deleteAsync(FileSystem.documentDirectory + f, { idempotent: true }).catch(() => {});
      }
    }
    
    // 2. Remote Sweep
    for (const [rName, rFile] of Object.entries(remoteMedia)) {
      if (!requiredMedia.has(rName)) {
        await deleteFile(rFile.id).catch(() => {});
      }
    }

    onProgress?.({ step: 'Done!', percent: 100 });
    const now = new Date().toISOString();
    await SecureStore.setItemAsync(STORE.LAST_SYNC, now);

    return {
      success: true, syncedAt: now,
      realCount:  Object.values(realDict).flat().length,
      decoyCount: Object.values(decoyDict).flat().length,
      downloaded: hasDownloaded,
    };
  } catch (e) {
    console.error('syncToDrive error:', e);
    return { success: false, error: e.message };
  }
}

export async function restoreFromDrive(onProgress) {
  // Now unified with two way sync
  return await syncToDrive(null, null, onProgress);
}

// ── On-Demand Media Fetch (called when opening a specific entry) ───────────
// Only downloads media files for that one entry if missing locally.

export async function fetchEntryMedia(entry) {
  if (!(await isConnected())) return;
  try {
    const files = await listAllFiles();
    const remoteMedia = {};
    for (const f of files) {
      if (f.name.startsWith('media_')) remoteMedia[f.name] = f;
    }

    const needed = extractMediaFilenames(entry);
    for (const name of needed) {
      const path = FileSystem.documentDirectory + name;
      const info = await FileSystem.getInfoAsync(path);
      if (!info.exists && remoteMedia[name]) {
        await downloadRawMedia(remoteMedia[name].id, name);
      }
    }
  } catch (e) {
    console.warn('fetchEntryMedia failed:', e);
  }
}

// ── Fire & Forget Background Sync ──────────────────────────────────────────

export async function triggerBackgroundSync() {
  if (!(await isConnected())) return;
  try {
    await syncToDrive(null, null, null);
  } catch (e) {
    console.log('Background sync failed silently:', e);
  }
}

export async function getDriveMeta() {
  try {
    const files = await listAllFiles();
    const entryFiles = files.filter(f => f.name.includes('_entry_'));
    return { totalCount: entryFiles.length };
  } catch {
    return null;
  }
}

export async function exportSingleEntry(entry) {
  const enc = await encrypt(entry);
  const fileName = `ghost_export_${new Date(entry.createdAt).getTime()}.json.enc`;
  return await uploadFile(fileName, enc, null);
}