import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Vibration, Modal, TextInput, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { importEncryptionKey } from '../utils/encryption';

function Dot({ filled, accent, error }) {
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
    <View style={su.dotOuter}>
      <View style={[su.dotRing, {
        borderColor: error ? '#EF4444' : (filled ? 'transparent' : 'rgba(255,255,255,0.35)'),
      }]} />
      <Animated.View style={[su.dotFill, {
        backgroundColor: error ? '#EF4444' : 'white',
        opacity: filled ? 1 : 0,
        transform: [{ scale }],
      }]} />
    </View>
  );
}

function Key({ label, onPress, isDelete, isEmpty }) {
  const scale = useRef(new Animated.Value(1)).current;
  if (isEmpty) return <View style={su.keyEmpty} />;

  function pressIn()  { Animated.spring(scale, { toValue: 0.86, useNativeDriver: true, speed: 60, bounciness: 0 }).start(); }
  function pressOut() { Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 30, bounciness: 10 }).start(); }

  return (
    <TouchableOpacity onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} activeOpacity={1}>
      <Animated.View style={[su.key, { transform: [{ scale }] }]}>
        {isDelete
          ? <Feather name="delete" size={20} color="rgba(255,255,255,0.8)" />
          : <Text style={su.keyNum}>{label}</Text>
        }
      </Animated.View>
    </TouchableOpacity>
  );
}

const STEPS = [
  {
    title:        'Set journal passcode',
    subtitle:     'This opens your everyday journal. Use something easy to remember.',
    confirmTitle: 'Confirm journal passcode',
  },
  {
    title:        'Set backup encryption',
    subtitle:     'Used to encrypt your backups on Google Drive. Keep this secure.',
    confirmTitle: 'Confirm encryption passcode',
  },
];

export default function SetupScreen() {
  const { completeSetup } = useApp();

  const [stepIdx,     setStepIdx]     = useState(0);
  const [confirming,  setConfirming]  = useState(false);
  const [digits,      setDigits]      = useState('');
  const [firstEntry,  setFirstEntry]  = useState('');
  const [decoyCode,   setDecoyCode]   = useState('');
  const [error,       setError]       = useState('');
  const [hasError,    setHasError]    = useState(false);
  const [showRestore, setShowRestore] = useState(false);
  const [restoreKey,  setRestoreKey]  = useState('');

  const shakeX   = useRef(new Animated.Value(0)).current;
  const contentOp = useRef(new Animated.Value(1)).current;

  const step = STEPS[stepIdx];

  function shake() {
    Vibration.vibrate(300);
    setHasError(true);
    Animated.sequence([
      Animated.timing(shakeX, { toValue: 13,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -13, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 9,   duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: -9,  duration: 50, useNativeDriver: true }),
      Animated.timing(shakeX, { toValue: 0,   duration: 50, useNativeDriver: true }),
    ]).start(() => setTimeout(() => { setHasError(false); setError(''); }, 1200));
  }

  async function handleRestore() {
    if (!restoreKey.trim()) return;
    try {
      await importEncryptionKey(restoreKey.trim());
      Alert.alert('Key Recovered!', 'Your encryption key was successfully imported. Please proceed to set up your local passcodes.');
      setShowRestore(false);
      setRestoreKey('');
    } catch (e) {
      Alert.alert('Invalid Key', 'Make sure you pasted the exact 64-character GHOST-KEY. Please try again.');
    }
  }

  function fade(fn) {
    Animated.timing(contentOp, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      fn();
      Animated.timing(contentOp, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    });
  }

  function pressDigit(d) {
    if (digits.length >= 4) return;
    Haptics.selectionAsync();
    const next = digits + d;
    setDigits(next);
    setError('');
    setHasError(false);
    if (next.length === 4) setTimeout(() => handleFour(next), 100);
  }

  function pressDelete() {
    Haptics.selectionAsync();
    setDigits(p => p.slice(0, -1));
    setError('');
    setHasError(false);
  }

  function handleFour(code) {
    if (!confirming) {
      fade(() => { setFirstEntry(code); setDigits(''); setConfirming(true); });
      return;
    }
    if (code !== firstEntry) {
      shake();
      setError("Codes don't match — try again");
      setDigits('');
      return;
    }
    if (stepIdx === 0) {
      fade(() => {
        setDecoyCode(code);
        setDigits(''); setFirstEntry(''); setConfirming(false); setStepIdx(1);
      });
    } else {
      completeSetup(decoyCode, code);
    }
  }

  const ROWS = [['1','2','3'],['4','5','6'],['7','8','9'],['EMPTY','0','DEL']];
  const title    = confirming ? step.confirmTitle : step.title;
  const subtitle = confirming ? 'Enter the same code again.' : step.subtitle;

  return (
    <View style={su.root}>
      <LinearGradient
        colors={['#6B3A9B','#9B5BC4','#B47DD6']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }}
      />
      <SafeAreaView style={su.safe}>

        {/* Progress */}
        <View style={su.progress}>
          {STEPS.map((_, i) => (
            <View key={i} style={[
              su.progressDot,
              { backgroundColor: i <= stepIdx ? 'white' : 'rgba(255,255,255,0.3)' },
              i === stepIdx && { width: 22 },
            ]} />
          ))}
        </View>

        <View style={su.inner}>
          <Feather name="cloud" size={54} color="white" style={{ marginBottom: 4 }} />

          <Animated.View style={{ opacity: contentOp, alignItems: 'center' }}>
            <Text style={su.title}>{title}</Text>
            <Text style={su.subtitle}>{subtitle}</Text>
          </Animated.View>

          <Animated.View style={[su.dotsRow, { transform: [{ translateX: shakeX }] }]}>
            {[0,1,2,3].map(i => (
              <Dot key={i} filled={i < digits.length} accent="#9B5BC4" error={hasError} />
            ))}
          </Animated.View>

          {error
            ? <Text style={su.error}>{error}</Text>
            : <View style={{ height: 18 }} />
          }

          <View style={su.numpad}>
            {ROWS.map((row, ri) => (
              <View key={ri} style={su.numRow}>
                {row.map((k, ki) => {
                  if (k === 'EMPTY') return <View key={ki} style={su.keyEmpty} />;
                  if (k === 'DEL')   return <Key key={ki} isDelete onPress={pressDelete} />;
                  return <Key key={ki} label={k} onPress={() => pressDigit(k)} />;
                })}
              </View>
            ))}
          </View>

          {stepIdx === 0 && !confirming && (
            <TouchableOpacity onPress={() => setShowRestore(true)} style={{ marginTop: 24, padding: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecorationLine:'underline' }}>
                Restore existing Journal from Recovery Key
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <Modal visible={showRestore} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={su.modalOverlay}>
            <View style={su.modalBody}>
              <Text style={su.modalTitle}>Restore Journal</Text>
              <Text style={su.modalSub}>Paste your exported GHOST-KEY here to recover your End-to-End Encrypted Drive backups.</Text>
              
              <TextInput 
                style={su.modalInput}
                value={restoreKey}
                onChangeText={setRestoreKey}
                placeholder="GHOST-KEY-..."
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                multiline
              />

              <View style={su.modalBtns}>
                <TouchableOpacity onPress={() => setShowRestore(false)} style={su.modalBtnSecondary}>
                  <Text style={su.modalBtnTextSec}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRestore} style={su.modalBtnPrimary}>
                  <Text style={su.modalBtnTextPri}>Import Key</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </SafeAreaView>
    </View>
  );
}

const KEY = 74;
const su = StyleSheet.create({
  root:  { flex: 1 },
  safe:  { flex: 1 },
  progress: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 16 },
  progressDot: { height: 4, width: 8, borderRadius: 2 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, paddingBottom: 20, gap: 18 },
  ghost:    { fontSize: 54, marginBottom: 4 },
  title:    { fontSize: 22, fontWeight: '700', color: 'white', letterSpacing: -0.4, textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 21, maxWidth: 290, marginTop: 6 },
  dotsRow:  { flexDirection: 'row', gap: 22, marginTop: 8 },
  dotOuter: { width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  dotRing:  { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 1.5 },
  dotFill:  { width: 10, height: 10, borderRadius: 5 },
  error:    { color: '#FFD6D6', fontSize: 12, fontWeight: '600', height: 18 },
  numpad:   { gap: 10, width: '100%', maxWidth: 300, marginTop: 6 },
  numRow:   { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  key: {
    width: KEY, height: KEY, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  keyEmpty: { width: KEY, height: KEY },
  keyNum:   { fontSize: 24, fontWeight: '300', color: 'white', letterSpacing: -0.3 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalBody: { backgroundColor: 'white', width: '100%', borderRadius: 24, padding: 24, alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#333' },
  modalSub: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 20, lineHeight: 18 },
  modalInput: { width: '100%', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 16, fontSize: 13, minHeight: 80, color: '#333', textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
  modalBtnSecondary: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  modalBtnPrimary: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#9B5BC4', alignItems: 'center' },
  modalBtnTextSec: { color: '#666', fontWeight: '600' },
  modalBtnTextPri: { color: 'white', fontWeight: '600' },
});