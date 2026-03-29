import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';

function Dot({ filled, error }) {
  const scale = useRef(new Animated.Value(filled ? 1 : 0.35)).current;
  useEffect(() => {
    if (filled) {
      Animated.sequence([
        Animated.spring(scale, { toValue: 1.3, useNativeDriver: true, speed: 60, bounciness: 6 }),
        Animated.spring(scale, { toValue: 1,   useNativeDriver: true, speed: 40, bounciness: 4 }),
      ]).start();
    } else {
      Animated.timing(scale, { toValue: 0.35, duration: 140, useNativeDriver: true }).start();
    }
  }, [filled]);

  return (
    <View style={lk.dotOuter}>
      <View style={[lk.dotRing, {
        borderColor: error ? '#EF444460' : (filled ? 'transparent' : 'rgba(255,255,255,0.3)'),
      }]} />
      <Animated.View style={[lk.dotFill, {
        backgroundColor: error ? '#EF4444' : 'white',
        opacity: filled ? 1 : 0,
        transform: [{ scale }],
      }]} />
    </View>
  );
}

function Key({ label, onPress, isDelete, isEmpty }) {
  const scale = useRef(new Animated.Value(1)).current;
  const op    = useRef(new Animated.Value(1)).current;
  if (isEmpty) return <View style={lk.keyEmpty} />;

  function pressIn() {
    Animated.parallel([
      Animated.spring(scale, { toValue: 0.87, useNativeDriver: true, speed: 60, bounciness: 0 }),
      Animated.timing(op,    { toValue: 0.6,  duration: 60, useNativeDriver: true }),
    ]).start();
  }
  function pressOut() {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }),
      Animated.timing(op,    { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  }

  return (
    <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
      <Animated.View style={[
        lk.key,
        { opacity: op, transform: [{ scale }] },
        isDelete && { backgroundColor: 'transparent', borderColor: 'transparent' },
      ]}>
        {isDelete && <Feather name="delete" size={20} color="rgba(255,255,255,0.7)" />}
        {!isDelete && <Text style={lk.keyNum}>{label}</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function LockScreen({ navigation, route }) {
  const from = route?.params?.from || '';
  const { unlock, primaryColor, } = useApp();
 
  const [digits,   setDigits]   = useState('');
  const [error,    setError]    = useState('');
  const [hasError, setHasError] = useState(false);

  const shakeX    = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const logoOp    = useRef(new Animated.Value(0)).current;
  const contentOp = useRef(new Animated.Value(0)).current;
  const ghostBob  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
      Animated.timing(logoOp,   { toValue: 1, duration: 360, useNativeDriver: true }),
      Animated.timing(contentOp,{ toValue: 1, duration: 500, delay: 180, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(ghostBob, { toValue: -8, duration: 1400, useNativeDriver: true }),
        Animated.timing(ghostBob, { toValue:  0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function shake() {
    Vibration.vibrate(350);
    setHasError(true);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 14,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -14, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 10,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start(() => setTimeout(() => { setHasError(false); setError(''); }, 1400));
  }

  function pressDigit(d) {
    if (digits.length >= 4) return;
    Haptics.selectionAsync();
    const next = digits + d;
    setDigits(next);
    setError('');
    setHasError(false);
    if (next.length === 4) setTimeout(() => checkCode(next), 100);
  }

  function pressDelete() {
    Haptics.selectionAsync();
    setDigits(p => p.slice(0, -1));
    setError('')
    setHasError(false);
  }

  async function checkCode(code) {
    const ok = await unlock(code);
    if (!ok) { shake(); setError('Invalid authorization code'); setDigits(''); }
    else if (from === 'calendar') {
      
      navigation.goBack();
    }
    else return;
  }

  const ROWS = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['EMPTY', '0', 'DEL'],
  ];

  return (
    <View style={lk.root}>
      <LinearGradient
        colors={[primaryColor, primaryColor, primaryColor + '15']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
      />
      <SafeAreaView style={lk.safe}>
        <View style={lk.inner}>

          {/* Logo */}
          <Animated.View style={[
            lk.logoWrap,
            { opacity: logoOp, transform: [{ scale: logoScale }, { translateY: ghostBob }] },
          ]}>
            {/* <Feather name="cloud" size={56} color="white" /> */}
            <Text style={lk.appName}>ghost<Text style={lk.dot}>.</Text></Text>
          </Animated.View>

          {/* Passcode area */}
          <Animated.View style={[lk.padWrap, { opacity: contentOp }]}>
            {/* <Text style={lk.label}>Enter authorization code</Text> */}

            <Animated.View style={[lk.dotsRow, { transform: [{ translateX: shakeX }] }]}>
              {[0,1,2,3].map(i => (
                <Dot key={i} filled={i < digits.length} error={hasError} />
              ))}
            </Animated.View>

            {error
              ? <Text style={lk.error}>{error}</Text>
              : <View style={{ height: 18 }} />
            }

            <View style={lk.numpad}>
              {ROWS.map((row, ri) => (
                <View key={ri} style={lk.numRow}>
                  {row.map((k, ki) => {
                    if (k === 'EMPTY') return <View key={ki} style={lk.keyEmpty} />;
                    if (k === 'DEL')   return <Key key={ki} isDelete onPress={pressDelete} />;
                    return <Key key={ki} label={k} onPress={() => pressDigit(k)} />;
                  })}
                </View>
              ))}
            </View>
          </Animated.View>

        </View>
      </SafeAreaView>
    </View>
  );
}

const KEY = 74;
const lk = StyleSheet.create({
  root:  { flex: 1 },
  safe:  { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 20, gap: 32 },
  logoWrap: { alignItems: 'center', gap: 6 },
  appName: { fontSize: 40, fontWeight: '800', color: 'white', letterSpacing: -1.5 },
  dot:     { color: 'rgba(255,255,255,0.45)' },
  padWrap: { alignItems: 'center', gap: 18, width: '100%' },
  label:   { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500', letterSpacing: 0.3 },
  dotsRow: { flexDirection: 'row', gap: 22 },
  dotOuter:{ width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  dotRing: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  dotFill: { width: 10, height: 10, borderRadius: 5 },
  error:   { color: '#FFD6D6', fontSize: 12, fontWeight: '600', height: 18 },
  numpad:  { gap: 10, width: '100%', maxWidth: 300 },
  numRow:  { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  key: {
    width: KEY, height: KEY, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  keyEmpty: { width: KEY, height: KEY },
  keyNum:   { fontSize: 24, fontWeight: '300', color: 'white', letterSpacing: -0.3 },
});