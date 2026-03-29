import React, { useRef, useEffect, useState } from 'react';
import { DrawerActions } from '@react-navigation/native';

import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Animated, TextInput, Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather,  } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useApp } from '../context/AppContext';
import { PRESET_COLORS } from '../theme';

function AnimCard({ children, delay = 0, bg, border }) {
  const op = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.spring(y, { toValue: 0, tension: 65, friction: 11, delay, useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={[
      ss.card,
      { backgroundColor: bg, borderColor: border },
      { opacity: op, transform: [{ translateY: y }] },
    ]}>
      {children}
    </Animated.View>
  );
}

function SLabel({ text, color }) {
  return <Text style={[ss.sLabel, { color }]}>{text}</Text>;
}

function Row({ icon, iconBg, iconColor, label, desc, right, onPress, danger, noBorder, borderColor }) {
  const {isDark} = useApp();
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <TouchableOpacity
      onPress={() => { if (onPress) { Haptics.selectionAsync(); onPress(); } }}
      onPressIn={() => onPress && Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 60, bounciness: 0 }).start()}
      onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start()}
      activeOpacity={1}
      disabled={!onPress}
    >
      <Animated.View style={[
        ss.row,
        { borderBottomColor: borderColor, borderBottomWidth: noBorder ? 0 : StyleSheet.hairlineWidth },
        { transform: [{ scale }] },
      ]}>
        <View style={[ss.iconBox, { backgroundColor: danger ? '#FEF2F2' : iconBg }]}>
          <Feather name={icon} size={15} color={danger ? '#EF4444' : iconColor} />
        </View>
        <View style={ss.rowBody}>
          <Text style={[ss.rowLabel, { color: isDark ? '#fff' : danger ? '#EF4444' : '#1C1917' }]}>{label}</Text>
          {desc ? <Text style={ss.rowDesc}>{desc}</Text> : null}
        </View>
        {right !== undefined
          ? right
          : onPress && !danger && <Feather name="chevron-right" size={15} color="#94A3B8" />
        }
      </Animated.View>
    </TouchableOpacity>
  );
}

function Toggle({ value, onToggle, accent }) {
  const slide = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(slide, {
      toValue: value ? 1 : 0,
      tension: 80, friction: 10, useNativeDriver: false,
    }).start();
  }, [value]);
  const trackBg = slide.interpolate({
    inputRange: [0, 1], outputRange: ['rgba(155,91,196,0.2)', accent],
  });
  const thumbX = slide.interpolate({ inputRange: [0, 1], outputRange: [3, 23] });
  return (
    <TouchableOpacity onPress={() => { Haptics.selectionAsync(); onToggle(); }} activeOpacity={0.9}>
      <Animated.View style={[ss.track, { backgroundColor: trackBg }]}>
        <Animated.View style={[ss.thumb, { transform: [{ translateX: thumbX }] }]} />
      </Animated.View>
    </TouchableOpacity>
  );
}

function ColorDot({ color, selected, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  function handlePress() {
    Haptics.selectionAsync();
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.78, useNativeDriver: true, speed: 60, bounciness: 0 }),
      Animated.spring(scale, { toValue: 1.12, useNativeDriver: true, speed: 40, bounciness: 12 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 4 }),
    ]).start();
    onPress(color);
  }
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={1}>
      <Animated.View style={[
        ss.colorDot,
        { backgroundColor: color, transform: [{ scale }] },
        selected && ss.colorDotSelected,
      ]}>
        {selected && <Feather name="check" size={13} color="white" />}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation }) {
  const {
    theme, isDark, toggleDark,
    primaryColor, setPrimaryColor,
    userName, setUserName,
    appIcon, setAppIcon,
    lock, isReal,
    autoPlayMusic, toggleAutoPlayMusic,
  } = useApp();

  const accent = theme.primary;
  const border = theme.border;

  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(userName);

  const headerOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerOp, { toValue: 1, duration: 320, useNativeDriver: true }).start();
  }, []);

  async function saveName() {
    await setUserName(nameVal.trim());
    setEditingName(false);
  }

  async function pickIcon() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0].uri) {
      await setAppIcon(result.assets[0].uri);
    }
  }

  return (
    <View style={[ss.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>

        {/* Header */}
        <Animated.View style={[
          ss.header,
          { borderBottomColor: border, opacity: headerOp },
        ]}>

          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="menu" size={20} color={theme.text} />
          </TouchableOpacity>
          <Text style={[ss.headerTitle, { color: theme.text }]}>Settings</Text>
          <View style={{ width: 24 }} />
        </Animated.View>

        <ScrollView
          contentContainerStyle={ss.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Profile ── */}
          <AnimCard delay={50} bg={theme.surface} border={border}>
            <View style={ss.profileRow}>
              <TouchableOpacity onPress={pickIcon} activeOpacity={0.8}>
                <View style={[ss.avatar, { backgroundColor: accent + '22' }]}>
                  {appIcon ? (
                    <Image source={{ uri: appIcon }} style={{ width: 40, height: 40, borderRadius: 14 }} resizeMode='cover' />
                  ) : (
                    <Image source={require('../../assets/aegis.png')} style={{ width: 40, height: 40 }} resizeMode='contain' />
                  )}
                </View>
              </TouchableOpacity>
              {editingName ? (
                <TextInput
                  style={[ss.nameInput, { color: theme.text, borderColor: border }]}
                  value={nameVal}
                  onChangeText={setNameVal}
                  onSubmitEditing={saveName}
                  onBlur={saveName}
                  autoFocus
                  returnKeyType="done"
                />
              ) : (
                <TouchableOpacity style={{ flex: 1 }} onPress={() => setEditingName(true)}>
                  <Text style={[ss.profileName, { color: theme.text }]}>
                    {userName || 'Ghost User'}
                  </Text>
                  <Text style={[ss.profileSub, { color: theme.textMuted }]}>
                    Tap to edit name
                  </Text>
                </TouchableOpacity>
              )}
              {/* <View style={[ss.modePill, {
                backgroundColor: isReal ? '#10B98115' : accent + '15',
              }]}>
                <View style={[ss.modeDot, { backgroundColor: isReal ? '#10B981' : accent }]} />
                <Text style={[ss.modeTxt, { color: isReal ? '#10B981' : accent }]}>
                  {isReal ? 'Vault' : 'Journal'}
                </Text>
              </View> */}
            </View>
          </AnimCard>

          {/* ── Appearance ── */}
          <SLabel text="APPEARANCE" color={theme.textMuted} />
          <AnimCard delay={80} bg={theme.surface} border={border}>
            <Row
              icon={isDark ? 'moon' : 'sun'}
              iconBg={theme.bg2} iconColor={theme.textMuted}
              label={isDark ? 'Dark Mode' : 'Light Mode'}
              desc="Switch between light and dark"
              right={<Toggle value={isDark} onToggle={toggleDark} accent={accent} />}
              borderColor={border}
            />
            <Row
              icon="music"
              iconBg={theme.bg2} iconColor={theme.textMuted}
              label="Auto-play Music"
              desc="Looping music plays on open"
              right={<Toggle value={autoPlayMusic} onToggle={toggleAutoPlayMusic} accent={accent} />}
              borderColor={border} noBorder
            />
          </AnimCard>

          {/* ── Accent color ── */}
          <SLabel text="ACCENT COLOR" color={theme.textMuted} />
          <AnimCard delay={110} bg={theme.surface} border={border}>
            <View style={ss.colorGrid}>
              {PRESET_COLORS.map(c => (
                <ColorDot
                  key={c}
                  color={c}
                  selected={primaryColor === c}
                  onPress={setPrimaryColor}
                />
              ))}
            </View>
          </AnimCard>

          {/* ── Sync ── */}
          <SLabel text="SYNC & BACKUP" color={theme.textMuted} />
          <AnimCard delay={140} bg={theme.surface} border={border}>
            <Row
              icon="cloud"
              iconBg={theme.bg2} iconColor={theme.textMuted}
              label="Backup & Sync"
              desc={isReal ? 'Drive sync, export, encryption key' : 'Export your journal entries'}
              onPress={() => navigation.navigate('Backup')}
              borderColor={border} noBorder
            />
          </AnimCard>

          {/* ── Security ── */}
          <SLabel text="SECURITY" color={theme.textMuted} />
          <AnimCard delay={170} bg={theme.surface} border={border}>
            <Row
              icon="shield"
              iconBg={theme.bg2} iconColor={theme.textMuted}
              label="Change Journal Passcode"
              desc="The everyday code"
              onPress={() => Alert.alert('Coming soon')}
              borderColor={border}
            />
            <Row
              icon="lock"
              iconBg={theme.bg2} iconColor={theme.textMuted}
              label="Change Secret Passcode"
              desc="The vault code"
              onPress={() => Alert.alert('Coming soon')}
              borderColor={border} noBorder
            />
          </AnimCard>

          {/* ── Lock ── */}
          <AnimCard delay={200} bg={theme.surface} border={border}>
            <Row
              icon="log-out"
              label="Lock Journal"
              desc="Return to lock screen"
              onPress={lock}
              danger noBorder
              borderColor={border}
            />
          </AnimCard>

          {/* Footer */}
          <View style={ss.footer}>
            <Text style={[ss.footerName, { color: theme.textMuted }]}>
              Aegis<Text style={{ color: accent }}>.</Text>
            </Text>
            <Text style={[ss.footerVer, { color: theme.textMuted }]}>v1.0.0</Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const ss = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 14,
  },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  scroll: { paddingHorizontal: 16, paddingTop: 18 },
  sLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 1.2,
    marginBottom: 8, marginLeft: 2, marginTop: 16,
  },
  card: {
    borderRadius: 16, borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden', marginBottom: 4,
  },

  // Profile
  profileRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 13, padding: 16,
  },
  avatar: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  avatarTxt: { fontSize: 20, fontWeight: '800' },
  profileName: { fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  profileSub: { fontSize: 11, marginTop: 2 },
  nameInput: {
    flex: 1, fontSize: 15, fontWeight: '700',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  modePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  modeDot: { width: 5, height: 5, borderRadius: 3 },
  modeTxt: { fontSize: 11, fontWeight: '700' },

  // Rows
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 13, gap: 12,
  },
  iconBox: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: '500', letterSpacing: -0.2 },
  rowDesc: { fontSize: 12, color: '#78716C', marginTop: 2 },

  // Toggle
  track: { width: 46, height: 26, borderRadius: 13, justifyContent: 'center' },
  thumb: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: 'white',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15, shadowRadius: 2, elevation: 2,
  },

  // Colors
  colorGrid: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 12, padding: 16,
  },
  colorDot: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },
  colorDotSelected: { borderWidth: 3, borderColor: 'white' },

  // Footer
  footer: { alignItems: 'center', gap: 4, paddingVertical: 24, marginTop: 8 },
  footerName: { fontSize: 22, fontWeight: '800', letterSpacing: -1 },
  footerVer: { fontSize: 11, letterSpacing: 0.4 },
});