import React, { useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { key: 'Calendar', icon: 'calendar', label: 'Journal' },
  { key: 'Gallery',  icon: 'image',    label: 'Gallery' },
  { key: 'Search', icon: 'search', label: 'Search' },
  { key: 'Backup', icon: 'cloud', label: 'Backup' },
  { key: 'Settings', icon: 'settings', label: 'Settings' },
];

export default function DrawerContent({ navigation, state }) {
  const { theme, lock, isReal, userName, appIcon } = useApp();
  const accent = theme.primary;
  const activeRoute = state?.routes?.[state.index]?.name || 'Calendar';

  const logoOp = useRef(new Animated.Value(0)).current;
  const logoY = useRef(new Animated.Value(-8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(logoOp, { toValue: 1, duration: 380, delay: 60, useNativeDriver: true }),
      Animated.timing(logoY, { toValue: 0, duration: 320, delay: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  function go(key) {
    Haptics.selectionAsync();
    // Backup screen is in the root Stack, not in the Drawer
    // Use navigate — RN v6 will find it in parent Stack
    if (key === 'Backup') {
      navigation.navigate(key);
    } else {
      navigation.navigate(key);
    }
    navigation.closeDrawer();
  }

  const initial = (userName || 'G').charAt(0).toUpperCase();

  return (
    <View style={[dr.root, { backgroundColor: theme.surface }]}>
      <LinearGradient
        colors={theme.isDark
          ? [theme.surface, theme.bg2]
          : [theme.surface, theme.bg]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>

        {/* Brand */}
        <Animated.View style={[
          dr.brand, { opacity: logoOp, transform: [{ translateY: logoY }] },
        ]}>
          {/* <View style={[dr.ghostBox, { backgroundColor: accent + '18' }]}>
            <Feather name="cloud" size={24} color={accent} />
          </View>
          <View>
            <Text style={[dr.brandName, { color: theme.text }]}>
              sync<Text style={{ color: accent }}>.</Text>
            </Text>
            <Text style={[dr.brandSub, { color: theme.textMuted }]}>
              {isReal ? 'Private vault' : 'Your quiet space'}
            </Text>
          </View> */}
          <View style={{ alignItems: 'center', gap: 4, marginTop: 8 }}>
            <Text style={{ fontSize: 26, fontWeight: '800', letterSpacing: -1, color: theme.textMuted }}>
              Aegis<Text style={{ color: accent }}>.</Text>
            </Text>
          </View>
        </Animated.View>

        <View style={[dr.rule, { backgroundColor: theme.border }]} />

        {/* Nav */}
        <View style={dr.navList}>

          {[
            ...NAV_ITEMS.filter(i => i.key !== 'Settings'),
            ...(isReal ? [{ key: 'Encryption', icon: 'key', label: 'Encryption' }] : []),
            NAV_ITEMS.find(i => i.key === 'Settings'),
          ].map((item, i) => {
            // Backup is a Stack screen — consider it active if current route is Backup
            const isActive = activeRoute === item.key;
            return (
              <Animated.View
                key={item.key}
                style={{
                  opacity: logoOp,
                  transform: [{ translateX: logoY }],
                }}
              >
                <TouchableOpacity
                  onPress={() => go(item.key)}
                  style={[dr.navItem, isActive && { backgroundColor: accent + '14' }]}
                  activeOpacity={0.65}
                >
                  {isActive && (
                    <View style={[dr.activeBar, { backgroundColor: accent }]} />
                  )}
                  <Feather
                    name={item.icon}
                    size={17}
                    color={isActive ? accent : theme.textMuted}
                  />
                  <Text style={[
                    dr.navLabel,
                    { color: isActive ? accent : theme.text },
                    isActive && { fontWeight: '600' },
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        <View style={{ flex: 1 }} />

        {/* Vault indicator */}
        {/* {isReal && (
          <View style={[dr.vaultRow, { backgroundColor: accent + '10', marginHorizontal: 18, marginBottom: 10, borderRadius: 10 }]}>
            <View style={[dr.vaultDot, { backgroundColor: '#10B981' }]} />
            <Text style={[dr.vaultTxt, { color: theme.textMuted }]}>Vault active</Text>
          </View>
        )} */}

        {/* Bottom row */}
        <View style={[dr.bottom, { borderTopColor: theme.border }]}>
          {/* <View style={[dr.avatar, { backgroundColor: accent + '22' }]}>
            <Text style={[dr.avatarTxt, { color: accent }]}>{initial}</Text>
          </View>
          <Text style={[dr.userName, { color: theme.text }]} numberOfLines={1}>
            {userName || 'Ghost User'}
          </Text>
          <TouchableOpacity
            style={[dr.lockBtn, { borderColor: theme.border, backgroundColor: theme.bg }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              lock();
              navigation.closeDrawer();
            }}
          >
            <Feather name="lock" size={14} color={theme.textMuted} />
          </TouchableOpacity> */}
          {appIcon ? (
            <Image source={{ uri: appIcon }} style={{ width: 60, height: 60, borderRadius: 16, marginRight: 20 }} resizeMode='cover' />
          ) : (
            <Image source={require('../../assets/aegis.png')} style={{ width: 60, height: 60, marginRight: 20 }} resizeMode='contain' />
          )}
        </View>

      </SafeAreaView>
    </View>
  );
}

const dr = StyleSheet.create({
  root: { flex: 1 },
  brand: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingHorizontal: 22, paddingTop: 8, paddingBottom: 20,
  },
  ghostBox: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ghostEmoji: { fontSize: 24 },
  brandName: { fontSize: 28, fontWeight: '800', letterSpacing: -1, lineHeight: 32 },
  brandSub: { fontSize: 11, letterSpacing: 0.2, marginTop: 2 },
  rule: { height: StyleSheet.hairlineWidth, marginHorizontal: 22 },
  navList: { paddingHorizontal: 12, paddingTop: 12, gap: 2 },
  navItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: 13, paddingHorizontal: 12, paddingVertical: 13,
    borderRadius: 12, position: 'relative', overflow: 'hidden',
  },
  activeBar: {
    position: 'absolute', left: 0, top: 8, bottom: 8,
    width: 3, borderRadius: 2,
  },
  navLabel: { fontSize: 14, letterSpacing: -0.1 },
  vaultRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  vaultDot: { width: 6, height: 6, borderRadius: 3 },
  vaultTxt: { fontSize: 11, fontWeight: '500' },
  bottom: {
    flexDirection: 'row', alignItems: 'center',
    gap: 10, paddingTop: 14,
    justifyContent:'flex-end'
  },
  avatar: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  avatarTxt: { fontSize: 15, fontWeight: '800' },
  userName: { flex: 1, fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
  lockBtn: {
    width: 34, height: 34, borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center', justifyContent: 'center',
  },
});