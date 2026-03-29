import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, StatusBar, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { getEncryptionKey, exportKeyAsBackup } from '../utils/encryption';
import { loadEntries } from '../utils/storage';

export default function EncryptionScreen({ navigation }) {
  const { theme, entries } = useApp();
  const accent = theme.primary;
  const [key, setKey] = useState(null);
  const [backupKey, setBackupKey] = useState(null);
  const [keyVisible, setKeyVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const k = await getEncryptionKey();
        setKey(k);
        const bk = await exportKeyAsBackup();
        setBackupKey(bk);
      } catch (e) {
        Alert.alert('Error', 'Could not load encryption key');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function copyKey() {
    if (!backupKey) return;
    await Clipboard.setStringAsync(backupKey);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Encryption key copied to clipboard. Store it somewhere safe.');
  }

  async function exportData(filter) {
    try {
      setExporting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      let data = {};
      if (filter === 'all') {
        data = entries; // already all real entries from context
      } else if (filter === 'today') {
        const today = new Date();
        const padZ = n => String(n).padStart(2, '0');
        const key = `${today.getFullYear()}-${padZ(today.getMonth() + 1)}-${padZ(today.getDate())}`;
        data = entries[key] ? { [key]: entries[key] } : {};
      } else if (filter === 'week') {
        const now = new Date();
        const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        data = {};
        Object.entries(entries).forEach(([dk, arr]) => {
          if (new Date(dk) >= cutoff) data[dk] = arr;
        });
      } else if (filter === 'month') {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        data = {};
        Object.entries(entries).forEach(([dk, arr]) => {
          if (dk.startsWith(`${yyyy}-${mm}`)) data[dk] = arr;
        });
      }

      const totalEntries = Object.values(data).flat().length;
      if (totalEntries === 0) {
        Alert.alert('No Entries', 'No entries found for this filter.');
        setExporting(false);
        return;
      }

      const exportPayload = {
        exported_at: new Date().toISOString(),
        filter,
        total_entries: totalEntries,
        data,
      };

      const jsonStr = JSON.stringify(exportPayload, null, 2);
      const path = `${FileSystem.cacheDirectory}ghost_export_${filter}_${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(path, jsonStr, { encoding: 'utf8' });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(path, {
          mimeType: 'application/json',
          dialogTitle: `Export Ghost Journal (${filter})`,
        });
      } else {
        Alert.alert('Sharing not available', 'Export written to: ' + path);
      }
    } catch (e) {
      Alert.alert('Export Error', e.message || 'Could not export data.');
    } finally {
      setExporting(false);
    }
  }

  const filters = [
    { key: 'today', label: 'Today', icon: 'sun' },
    { key: 'week',  label: 'This Week', icon: 'calendar' },
    { key: 'month', label: 'This Month', icon: 'archive' },
    { key: 'all',   label: 'All Entries', icon: 'download-cloud' },
  ];

  return (
    <View style={[sc.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[sc.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Feather name="arrow-left" size={20} color={theme.textMuted} />
          </TouchableOpacity>
          <Text style={[sc.headerTitle, { color: theme.text }]}>Encryption & Data</Text>
          <View style={{ width: 20 }} />
        </View>

        <ScrollView contentContainerStyle={sc.content} showsVerticalScrollIndicator={false}>
          {/* Info Banner */}
          <View style={[sc.banner, { backgroundColor: accent + '12', borderColor: accent + '30' }]}>
            <Feather name="shield" size={20} color={accent} />
            <Text style={[sc.bannerTxt, { color: accent }]}>
              Your journal is encrypted with AES-256. Only you can read it.
            </Text>
          </View>

          {/* Key Section */}
          <Text style={[sc.sectionTitle, { color: theme.textMuted }]}>ENCRYPTION KEY</Text>
          <View style={[sc.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {loading ? (
              <ActivityIndicator size="small" color={accent} />
            ) : (
              <>
                <View style={sc.keyRow}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                    <Text
                      style={[sc.keyTxt, { color: keyVisible ? theme.text : theme.textMuted }]}
                      numberOfLines={1}
                    >
                      {keyVisible ? backupKey : '•'.repeat(32)}
                    </Text>
                  </ScrollView>
                  <TouchableOpacity onPress={() => setKeyVisible(v => !v)} style={sc.keyEye}>
                    <Feather name={keyVisible ? 'eye-off' : 'eye'} size={16} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
                <View style={[sc.divider, { backgroundColor: theme.border }]} />
                <View style={sc.keyActions}>
                  <TouchableOpacity style={[sc.keyBtn, { backgroundColor: accent + '15' }]} onPress={copyKey}>
                    <Feather name="copy" size={14} color={accent} />
                    <Text style={[sc.keyBtnTxt, { color: accent }]}>Copy Key</Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }} />
                  <Text style={[sc.keyHint, { color: theme.textMuted }]}>Store this safely!</Text>
                </View>
              </>
            )}
          </View>
          <Text style={[sc.helpTxt, { color: theme.textMuted }]}>
            If you lose this key, your data cannot be recovered. Keep a safe backup.
          </Text>

          {/* Details */}
          <Text style={[sc.sectionTitle, { color: theme.textMuted }]}>DETAILS</Text>
          <View style={[sc.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            {[
              { label: 'Algorithm', value: 'AES-256-CBC' },
              { label: 'Key Length', value: '256 bits' },
              { label: 'Storage', value: 'SecureStore (Keychain)' },
              { label: 'Drive Encryption', value: 'Enabled on backup' },
            ].map((row, i, arr) => (
              <View key={row.label}>
                <View style={sc.detailRow}>
                  <Text style={[sc.detailLabel, { color: theme.textMuted }]}>{row.label}</Text>
                  <Text style={[sc.detailValue, { color: theme.text }]}>{row.value}</Text>
                </View>
                {i < arr.length - 1 && <View style={[sc.divider, { backgroundColor: theme.border }]} />}
              </View>
            ))}
          </View>

          {/* Export */}
          <Text style={[sc.sectionTitle, { color: theme.textMuted }]}>EXPORT DATA</Text>
          <View style={sc.exportGrid}>
            {filters.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[sc.exportCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => exportData(f.key)}
                disabled={exporting}
                activeOpacity={0.7}
              >
                <View style={[sc.exportIcon, { backgroundColor: accent + '15' }]}>
                  <Feather name={f.icon} size={18} color={accent} />
                </View>
                <Text style={[sc.exportLabel, { color: theme.text }]}>{f.label}</Text>
                <Text style={[sc.exportSub, { color: theme.textMuted }]}>JSON</Text>
              </TouchableOpacity>
            ))}
          </View>
          {exporting && (
            <View style={sc.exportingRow}>
              <ActivityIndicator size="small" color={accent} />
              <Text style={[sc.exportingTxt, { color: accent }]}>Preparing export...</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const sc = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  content: { padding: 20, gap: 6, paddingBottom: 60 },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 16,
  },
  bannerTxt: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '500' },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginTop: 14, marginBottom: 8 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  keyRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  keyTxt: { fontSize: 13, fontFamily: 'monospace', letterSpacing: 0.5 },
  keyEye: { padding: 6 },
  divider: { height: StyleSheet.hairlineWidth },
  keyActions: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  keyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8,
  },
  keyBtnTxt: { fontSize: 12, fontWeight: '600' },
  keyHint: { fontSize: 11 },
  helpTxt: { fontSize: 12, lineHeight: 18, marginBottom: 6, marginTop: 4 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 13, paddingHorizontal: 16 },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 13, fontWeight: '600' },
  exportGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  exportCard: {
    width: '47%', padding: 16, borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth, gap: 8, alignItems: 'flex-start',
  },
  exportIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  exportLabel: { fontSize: 14, fontWeight: '700', letterSpacing: -0.1 },
  exportSub: { fontSize: 11 },
  exportingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10 },
  exportingTxt: { fontSize: 13, fontWeight: '600' },
});
