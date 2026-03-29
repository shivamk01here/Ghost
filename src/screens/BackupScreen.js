import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import {
  useGoogleAuth, handleAuthResponse, disconnectDrive,
  isConnected, getConnectedEmail, syncToDrive,
  getDriveMeta, getLastSyncTime,
} from '../utils/driveSync';
import { encrypt, exportKeyAsBackup } from '../utils/encryption';
import { loadEntries } from '../utils/storage';
import { exportZip, importZip } from '../utils/zipBackup';

// ── Animated progress bar ─────────────────────────────────────────────────
function ProgressBar({ percent, color, bg }) {
  const widthAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(widthAnim, {
      toValue: percent,
      tension: 50, friction: 10,
      useNativeDriver: false,
    }).start();
  }, [percent]);

  return (
    <View style={[pb.track, { backgroundColor: bg }]}>
      <Animated.View style={[
        pb.fill,
        {
          backgroundColor: color,
          width: widthAnim.interpolate({
            inputRange:  [0, 100],
            outputRange: ['0%', '100%'],
          }),
        },
      ]} />
    </View>
  );
}

const pb = StyleSheet.create({
  track: { height: 6, borderRadius: 3, overflow: 'hidden', width: '100%' },
  fill:  { height: '100%', borderRadius: 3 },
});

// ── Stat card ─────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, theme }) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const op    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, tension: 65, friction: 10, useNativeDriver: true }),
      Animated.timing(op,    { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      bk.statCard,
      { backgroundColor: color + '10', borderColor: color + '30' },
      { transform: [{ scale }], opacity: op },
    ]}>
      <View style={[bk.statIcon, { backgroundColor: color + '20' }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[bk.statVal, { color: theme.text }]}>{value}</Text>
      <Text style={[bk.statLbl, { color: theme.textMuted }]}>{label}</Text>
    </Animated.View>
  );
}

// ── AnimCard ──────────────────────────────────────────────────────────────
function AnimCard({ children, delay = 0, bg, border }) {
  const op = useRef(new Animated.Value(0)).current;
  const y  = useRef(new Animated.Value(12)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.spring(y,  { toValue: 0, tension: 65, friction: 11, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[
      bk.card, { backgroundColor: bg, borderColor: border },
      { opacity: op, transform: [{ translateY: y }] },
    ]}>
      {children}
    </Animated.View>
  );
}

function SLabel({ text, color }) {
  return <Text style={[bk.sLabel, { color }]}>{text}</Text>;
}

// ── Status toast ──────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  const y  = useRef(new Animated.Value(-60)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (msg) {
      Animated.parallel([
        Animated.spring(y,  { toValue: 0, tension: 70, friction: 11, useNativeDriver: true }),
        Animated.timing(op, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(y,  { toValue: -60, duration: 240, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0,   duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [msg]);

  const bg     = type === 'error'   ? '#FEF2F2'
               : type === 'success' ? '#F0FDF4'
               : '#EFF6FF';
  const color  = type === 'error'   ? '#DC2626'
               : type === 'success' ? '#15803D'
               : '#1D4ED8';
  const icon   = type === 'error'   ? 'alert-circle'
               : type === 'success' ? 'check-circle'
               : 'refresh-cw';

  return (
    <Animated.View style={[
      bk.toast, { backgroundColor: bg, borderColor: color + '40' },
      { opacity: op, transform: [{ translateY: y }] },
    ]}>
      <Feather name={icon} size={15} color={color} />
      <Text style={[bk.toastTxt, { color }]}>{msg}</Text>
    </Animated.View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────
export default function BackupScreen({ navigation }) {
  const { theme, entries, reloadEntries } = useApp();
  const accent = theme.primary;

  const [connected,   setConnected]   = useState(false);
  const [email,       setEmail]       = useState('');
  const [syncing,     setSyncing]     = useState(false);
  const [progress,    setProgress]    = useState({ step: '', percent: 0 });
  const [driveMeta,   setDriveMeta]   = useState(null);
  const [lastSync,    setLastSync]    = useState('');
  const [toast,       setToast]       = useState({ msg: '', type: 'info' });
  const [exporting,   setExporting]   = useState(false);
  const [totalLocalCount, setTotalLocalCount] = useState(0);
  const [zipProgress,  setZipProgress] = useState({ active: false, step: '', percent: 0, sizeMB: 0 });
  const [syncError,    setSyncError]   = useState(null);

  const { request, response, promptAsync } = useGoogleAuth();

  const driveTotal  = driveMeta?.totalCount || 0;
  const syncPercent = driveTotal > 0
    ? Math.min(100, Math.round((totalLocalCount / driveTotal) * 100))
    : totalLocalCount > 0 ? 0 : 100;

  function showToast(msg, type = 'info', duration = 3500) {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'info' }), duration);
  }

  useEffect(() => {
    async function load() {
      const real = await loadEntries('real');
      const decoy = await loadEntries('decoy');
      setTotalLocalCount(Object.values(real).flat().length + Object.values(decoy).flat().length);

      const conn  = await isConnected();
      setConnected(conn);
      if (conn) {
        const [em, meta, ls] = await Promise.all([
          getConnectedEmail(),
          getDriveMeta(),
          getLastSyncTime(),
        ]);
        setEmail(em || '');
        setDriveMeta(meta);
        if (ls) {
          setLastSync(new Date(ls).toLocaleString('en-US', {
            month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
          }));
        }
      }
    }
    load();
  }, [entries]);

  // Handle OAuth response
  useEffect(() => {
    async function handle() {
      if (!response) return;
      const result = await handleAuthResponse(response, request);
      if (result.success) {
        setConnected(true);
        setEmail(result.email || '');
        showToast('Connected to Google Drive!', 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Auto-sync after connect
        handleSync();
      } else {
        showToast(result.error || 'Connection failed', 'error');
      }
    }
    handle();
  }, [response]);

  async function handleConnect() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!request) {
      showToast('Setup Google Client ID in src/config/google.js first', 'error', 5000);
      return;
    }
    await promptAsync();
  }

  async function handleDisconnect() {
    Alert.alert(
      'Disconnect Google Drive?',
      'Your local data stays safe. You can reconnect anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnectDrive();
            setConnected(false);
            setEmail('');
            setDriveMeta(null);
            setLastSync('');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ]
    );
  }

  async function handleSync() {
    if (!connected || syncing) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSyncing(true);
    setSyncError(null);
    setProgress({ step: 'Starting sync…', percent: 0 });

    const result = await syncToDrive(null, null, (p) => setProgress(p));

    setSyncing(false);
    setProgress({ step: '', percent: 0 });

    if (result.success) {
      if (result.downloaded) await reloadEntries();
      showToast(`Two-way Sync Complete`, 'success');
      
      const real = await loadEntries('real');
      const decoy = await loadEntries('decoy');
      setTotalLocalCount(Object.values(real).flat().length + Object.values(decoy).flat().length);

      const meta = await getDriveMeta();
      setDriveMeta(meta);
      const ls = await getLastSyncTime();
      if (ls) {
        setLastSync(new Date(ls).toLocaleString('en-US', {
          month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        }));
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setSyncError(result.error || 'Unknown sync error');
      showToast('Sync failed', 'error');
    }
  }



  // ── ZIP Export ────────────────────────────────────────────────────────────
  async function handleExportZip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setZipProgress({ active: true, step: 'Preparing…', percent: 0, sizeMB: 0 });
    try {
      const result = await exportZip((p) => setZipProgress({ active: true, ...p }));
      setZipProgress({ active: false, step: '', percent: 0, sizeMB: 0 });
      if (result.success) showToast(`Exported ${result.sizeMB} MB backup!`, 'success');
    } catch (e) {
      setZipProgress({ active: false, step: '', percent: 0, sizeMB: 0 });
      showToast('ZIP export failed: ' + e.message, 'error');
    }
  }

  // ── ZIP Import ────────────────────────────────────────────────────────────
  async function handleImportZip() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setZipProgress({ active: true, step: 'Pick a file…', percent: 0, sizeMB: 0 });
    try {
      const result = await importZip((p) => setZipProgress({ active: true, ...p }));
      setZipProgress({ active: false, step: '', percent: 0, sizeMB: 0 });
      if (result?.success) {
        await reloadEntries();
        showToast(`Restored ${result.sizeMB} MB archive!`, 'success');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (e) {
      setZipProgress({ active: false, step: '', percent: 0, sizeMB: 0 });
      showToast('Import failed: ' + e.message, 'error');
    }
  }

  // ── Legacy Export ─────────────────────────────────────────────────────────
  async function exportAllData() {
    setExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const encrypted = await encrypt({
        entries,
        exportedAt: new Date().toISOString(),
        version:    1,
      });
      const path = `${FileSystem.documentDirectory}ghost_backup_${Date.now()}.enc`;
      await FileSystem.writeAsStringAsync(path, encrypted, {
        encoding: 'utf8',
      });
      await Sharing.shareAsync(path, {
        mimeType:   'application/octet-stream',
        dialogTitle: 'Save Ghost Backup',
      });
      showToast('Export ready!', 'success');
    } catch (e) {
      showToast('Export failed: ' + e.message, 'error');
    }
    setExporting(false);
  }

  async function exportByMonth() {
    setExporting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Group entries by YYYY-MM
      const byMonth = {};
      for (const [dateKey, dayEntries] of Object.entries(entries)) {
        const ym = dateKey.slice(0, 7);
        if (!byMonth[ym]) byMonth[ym] = {};
        byMonth[ym][dateKey] = dayEntries;
      }

      // Encrypt each month
      const encMonths = {};
      for (const [ym, monthEntries] of Object.entries(byMonth)) {
        encMonths[ym] = await encrypt({ entries: monthEntries, month: ym });
      }

      const path = `${FileSystem.documentDirectory}ghost_monthly_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, JSON.stringify({
        type: 'ghost_monthly_export',
        months: Object.keys(encMonths),
        data:   encMonths,
        exportedAt: new Date().toISOString(),
      }), { encoding: 'utf8' });

      await Sharing.shareAsync(path, {
        mimeType:    'application/json',
        dialogTitle: 'Save Monthly Backup',
      });
      showToast('Monthly export ready!', 'success');
    } catch (e) {
      showToast('Export failed: ' + e.message, 'error');
    }
    setExporting(false);
  }

  async function showEncryptionKey() {
    const key = await exportKeyAsBackup();
    Alert.alert(
      '🔑 Your Encryption Key',
      `Write this down somewhere safe. You need it to decrypt exported backups.\n\n${key}`,
      [{ text: 'Got it' }]
    );
  }

  const isLoading = syncing;

  return (
    <View style={[bk.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Toast */}
        <Toast msg={toast.msg} type={toast.type} />

        {/* Header */}
        <View style={[bk.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top:10, bottom:10, left:10, right:10 }}
          >
            <Feather name="arrow-left" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[bk.headerTitle, { color: theme.text }]}>Backup & Sync</Text>
          {connected && !isLoading && (
            <TouchableOpacity
              style={[bk.syncBtn, { backgroundColor: accent }]}
              onPress={handleSync}
            >
              <Feather name="refresh-cw" size={14} color="white" />
            </TouchableOpacity>
          )}
          {!connected && <View style={{ width: 32 }} />}
        </View>

        <ScrollView
          contentContainerStyle={bk.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Stats ── */}
          <View style={bk.statsRow}>
            <StatCard
              label="Local"
              value={totalLocalCount}
              icon="file-text"
              color={accent}
              theme={theme}
            />
            <StatCard
              label="On Drive"
              value={driveTotal}
              icon="cloud"
              color="#10B981"
              theme={theme}
            />
            <StatCard
              label="In Sync"
              value={connected && driveTotal > 0 ? `${syncPercent}%` : '—'}
              icon="check-circle"
              color="#3B82F6"
              theme={theme}
            />
          </View>

          {/* Sync progress bar */}
          {connected && (
            <AnimCard delay={80} bg={theme.surface} border={theme.border}>
              <View style={bk.syncStatusWrap}>
                <View style={bk.syncStatusTop}>
                  <Text style={[bk.syncStatusLabel, { color: theme.text }]}>
                    {isLoading ? progress.step : 'Sync status'}
                  </Text>
                  <Text style={[bk.syncStatusPct, { color: accent }]}>
                    {isLoading ? `${progress.percent}%` : (lastSync ? `Last: ${lastSync}` : 'Never synced')}
                  </Text>
                </View>
                <ProgressBar
                  percent={isLoading ? progress.percent : syncPercent}
                  color={accent}
                  bg={theme.bg2}
                />
                {!isLoading && driveTotal > 0 && (
                  <Text style={[bk.syncStatusSub, { color: theme.textMuted }]}>
                    {totalLocalCount} local · {driveTotal} on Drive
                  </Text>
                )}
              </View>
            </AnimCard>
          )}

          {/* ── Google Drive ── */}
          <SLabel text="GOOGLE DRIVE" color={theme.textMuted} />
          <AnimCard delay={120} bg={theme.surface} border={theme.border}>

            {/* Drive hero */}
            <LinearGradient
              colors={connected
                ? theme.isDark ? ['#0A2018', '#0F2A1A'] : ['#F0FDF4', '#ECFDF5']
                : theme.isDark ? [theme.surface, theme.bg2] : ['#FAF8FF', '#F5F0FD']}
              style={bk.driveHero}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <View style={[bk.driveIconRing, {
                backgroundColor: connected ? '#DCFCE7' : accent + '18',
              }]}>
                <Feather
                  name={connected ? 'cloud' : 'cloud-off'}
                  size={28}
                  color={connected ? '#15803D' : accent}
                />
              </View>

              {connected ? (
                <View style={{ alignItems: 'center', gap: 6 }}>
                  <Text style={[bk.driveTitle, { color: '#15803D' }]}>Connected</Text>
                  {email ? (
                    <Text style={[bk.driveEmail, { color: theme.textMuted }]}>{email}</Text>
                  ) : null}
                  <View style={bk.driveActions}>
                    <TouchableOpacity
                      style={[bk.syncNowBtn, { backgroundColor: accent, width: '100%', justifyContent: 'center' }]}
                      onPress={handleSync}
                      disabled={isLoading}
                    >
                      <Feather name="refresh-cw" size={14} color="white" />
                      <Text style={bk.syncNowTxt}>
                        {syncing ? 'Syncing securely…' : 'Two-way Sync Now'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  
                  {syncError && (
                    <View style={{ marginTop: 8, padding: 10, backgroundColor: '#FEF2F2', borderRadius: 8, borderWidth: 1, borderColor: '#FECACA', width: '100%', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Feather name="alert-triangle" size={16} color="#DC2626" />
                      <Text style={{ flex: 1, fontSize: 13, color: '#DC2626', fontWeight: '500' }}>
                        {syncError}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Text style={[bk.driveTitle, { color: theme.text }]}>
                    Connect Google Drive
                  </Text>
                  <Text style={[bk.driveDesc, { color: theme.textMuted }]}>
                    All data is AES-256 encrypted{'\n'}before leaving your device.
                  </Text>
                  <TouchableOpacity
                    style={[bk.connectBtn, { backgroundColor: accent }]}
                    onPress={handleConnect}
                    disabled={!request}
                  >
                    <Feather name="link" size={15} color="white" />
                    <Text style={bk.connectTxt}>
                      {request ? 'Connect Google Drive' : 'Loading…'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </LinearGradient>

            {/* Disconnect */}
            {connected && (
              <TouchableOpacity
                style={[bk.disconnectRow, { borderTopColor: theme.border }]}
                onPress={handleDisconnect}
                activeOpacity={0.7}
              >
                <Feather name="cloud-off" size={14} color="#EF4444" />
                <Text style={bk.disconnectTxt}>Disconnect Drive</Text>
              </TouchableOpacity>
            )}
          </AnimCard>

          {/* ── Export ── */}
          <SLabel text="EXPORT & BACKUP" color={theme.textMuted} />

          {/* ZIP Master Backup card */}
          <AnimCard delay={155} bg={theme.surface} border={theme.border}>
            <View style={{ padding: 16, gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={[bk.exportIcon, { backgroundColor: '#F59E0B18' }]}>
                  <Feather name="package" size={16} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[bk.exportLabel, { color: theme.text }]}>Master ZIP Backup</Text>
                  <Text style={[bk.exportDesc, { color: theme.textMuted }]}>
                    All journals + media — works without internet
                  </Text>
                </View>
              </View>

              {/* ZIP progress bar (only shows while active) */}
              {zipProgress.active && (
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={[bk.exportDesc, { color: theme.text }]}>{zipProgress.step}</Text>
                    <Text style={[bk.exportDesc, { color: '#F59E0B', fontWeight: '700' }]}>
                      {zipProgress.percent}%{zipProgress.sizeMB > 0 ? `  ·  ${zipProgress.sizeMB} MB` : ''}
                    </Text>
                  </View>
                  <ProgressBar percent={zipProgress.percent} color="#F59E0B" bg={theme.bg2} />
                </View>
              )}

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={[bk.syncNowBtn, { backgroundColor: '#F59E0B', flex: 1, justifyContent: 'center' }]}
                  onPress={handleExportZip}
                  disabled={zipProgress.active}
                >
                  <Feather name="download" size={13} color="white" />
                  <Text style={bk.syncNowTxt}>{zipProgress.active ? 'Working…' : 'Export ZIP'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[bk.syncNowBtn, { backgroundColor: theme.bg2, flex: 1, justifyContent: 'center', borderWidth: 1, borderColor: theme.border }]}
                  onPress={handleImportZip}
                  disabled={zipProgress.active}
                >
                  <Feather name="upload" size={13} color={theme.text} />
                  <Text style={[bk.syncNowTxt, { color: theme.text }]}>{zipProgress.active ? 'Working…' : 'Import ZIP'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </AnimCard>

          <AnimCard delay={160} bg={theme.surface} border={theme.border}>


            {/* All data */}
            <TouchableOpacity
              style={[bk.exportRow, { borderBottomColor: theme.border }]}
              onPress={exportAllData}
              disabled={exporting}
              activeOpacity={0.7}
            >
              <View style={[bk.exportIcon, { backgroundColor: accent + '18' }]}>
                <Feather name="archive" size={16} color={accent} />
              </View>
              <View style={bk.exportBody}>
                <Text style={[bk.exportLabel, { color: theme.text }]}>Export All Data</Text>
                <Text style={[bk.exportDesc, { color: theme.textMuted }]}>
                  Single encrypted .enc file — all entries
                </Text>
              </View>
              <Feather name="chevron-right" size={15} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Monthly */}
            <TouchableOpacity
              style={[bk.exportRow, { borderBottomColor: theme.border }]}
              onPress={exportByMonth}
              disabled={exporting}
              activeOpacity={0.7}
            >
              <View style={[bk.exportIcon, { backgroundColor: '#3B82F618' }]}>
                <Feather name="calendar" size={16} color="#3B82F6" />
              </View>
              <View style={bk.exportBody}>
                <Text style={[bk.exportLabel, { color: theme.text }]}>Export by Month</Text>
                <Text style={[bk.exportDesc, { color: theme.textMuted }]}>
                  Each month separately, encrypted JSON
                </Text>
              </View>
              <Feather name="chevron-right" size={15} color={theme.textMuted} />
            </TouchableOpacity>

            {/* Show key */}
            <TouchableOpacity
              style={bk.exportRow}
              onPress={showEncryptionKey}
              activeOpacity={0.7}
            >
              <View style={[bk.exportIcon, { backgroundColor: '#F59E0B18' }]}>
                <Feather name="key" size={16} color="#F59E0B" />
              </View>
              <View style={bk.exportBody}>
                <Text style={[bk.exportLabel, { color: theme.text }]}>View Encryption Key</Text>
                <Text style={[bk.exportDesc, { color: theme.textMuted }]}>
                  Needed to decrypt your exported files
                </Text>
              </View>
              <Feather name="chevron-right" size={15} color={theme.textMuted} />
            </TouchableOpacity>
          </AnimCard>

          {/* ── Encryption info ── */}
          <AnimCard delay={200} bg={accent + '08'} border={accent + '25'}>
            <View style={bk.encRow}>
              <View style={[bk.encIcon, { backgroundColor: accent + '18' }]}>
                <Feather name="shield" size={18} color={accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[bk.encTitle, { color: theme.text }]}>
                  AES-256 End-to-End Encrypted
                </Text>
                <Text style={[bk.encDesc, { color: theme.textMuted }]}>
                  Your entries are encrypted on-device with AES-256 before syncing.
                  Your encryption key never leaves your phone.
                </Text>
              </View>
            </View>
          </AnimCard>

          <View style={{ height: 48 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const bk = StyleSheet.create({
  root:  { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '600', letterSpacing: -0.3 },
  syncBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },

  toast: {
    position: 'absolute', top: 70, left: 16, right: 16, zIndex: 999,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 13, borderRadius: 14, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 8,
  },
  toastTxt: { flex: 1, fontSize: 13, fontWeight: '600' },

  scroll: { paddingHorizontal: 16, paddingTop: 16 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    padding: 14, alignItems: 'center', gap: 6,
  },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statVal:  { fontSize: 22, fontWeight: '800', letterSpacing: -0.8 },
  statLbl:  { fontSize: 10, fontWeight: '500', letterSpacing: 0.3 },

  card: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden', marginBottom: 6,
  },

  sLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    marginBottom: 8, marginLeft: 2, marginTop: 16,
  },

  syncStatusWrap: { padding: 16, gap: 10 },
  syncStatusTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  syncStatusLabel: { fontSize: 14, fontWeight: '600' },
  syncStatusPct:   { fontSize: 12, fontWeight: '600' },
  syncStatusSub:   { fontSize: 11, marginTop: 2 },

  driveHero: { padding: 28, alignItems: 'center', gap: 14 },
  driveIconRing: {
    width: 66, height: 66, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  driveTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  driveEmail: { fontSize: 12, fontWeight: '500' },
  driveDesc:  { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  driveActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  syncNowBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 20, paddingVertical: 11, borderRadius: 13,
  },
  syncNowTxt: { color: 'white', fontSize: 14, fontWeight: '700' },
  restoreBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: 13, borderWidth: StyleSheet.hairlineWidth,
  },
  restoreTxt:  { fontSize: 14, fontWeight: '500' },
  connectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 13, marginTop: 4,
  },
  connectTxt: { color: 'white', fontSize: 14, fontWeight: '700' },
  disconnectRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 18, paddingVertical: 13,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  disconnectTxt: { fontSize: 13, fontWeight: '600', color: '#EF4444' },

  exportRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  exportIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exportBody: { flex: 1 },
  exportLabel: { fontSize: 14, fontWeight: '500', letterSpacing: -0.2 },
  exportDesc:  { fontSize: 12, marginTop: 2 },

  encRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, padding: 16 },
  encIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  encTitle: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  encDesc:  { fontSize: 12, lineHeight: 18 },
});