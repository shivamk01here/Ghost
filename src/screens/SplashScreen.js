import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

const { width: SW, height: SH } = Dimensions.get('window');

function Particle({ x, y, size, delay }) {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(op, { toValue: 0.55, duration: 500, useNativeDriver: true }),
        Animated.timing(ty, { toValue: -28,  duration: 2200, useNativeDriver: true }),
        Animated.timing(op, { toValue: 0,    duration: 400,  useNativeDriver: true }),
        Animated.timing(ty, { toValue: 0,    duration: 0,    useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[
      sp.particle,
      { left: x, top: y, width: size, height: size, borderRadius: size / 2 },
      { opacity: op, transform: [{ translateY: ty }] },
    ]} />
  );
}

export default function SplashScreen() {
  const { primaryColor, appIcon } = useApp();
  const color = primaryColor || '#9B5BC4';
  const ghostScale = useRef(new Animated.Value(0.3)).current;
  const ghostOp    = useRef(new Animated.Value(0)).current;
  const ghostBob   = useRef(new Animated.Value(0)).current;
  const textOp     = useRef(new Animated.Value(0)).current;
  const textY      = useRef(new Animated.Value(12)).current;
  const tagOp      = useRef(new Animated.Value(0)).current;
  const glowScale  = useRef(new Animated.Value(0.5)).current;
  const glowOp     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Ghost pop in
    Animated.parallel([
      Animated.spring(ghostScale, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }),
      Animated.timing(ghostOp,   { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();

    // Glow ring
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(glowScale, { toValue: 1.8, duration: 1100, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(glowOp, { toValue: 0.4, duration: 350, useNativeDriver: true }),
          Animated.timing(glowOp, { toValue: 0,   duration: 750, useNativeDriver: true }),
        ]),
      ]).start();
    }, 180);

    // Bob loop — simple timing, no Easing import needed
    setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(ghostBob, { toValue: -10, duration: 1300, useNativeDriver: true }),
          Animated.timing(ghostBob, { toValue:  0,  duration: 1300, useNativeDriver: true }),
        ])
      ).start();
    }, 400);

    // Text
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(textOp, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(textY,  { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
      ]).start();
    }, 480);

    // Tagline
    setTimeout(() => {
      Animated.timing(tagOp, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 780);
  }, []);

  const PARTICLES = [
    { x: SW * 0.10, y: SH * 0.14, size: 6,  delay: 0    },
    { x: SW * 0.84, y: SH * 0.18, size: 4,  delay: 550  },
    { x: SW * 0.75, y: SH * 0.66, size: 5,  delay: 280  },
    { x: SW * 0.06, y: SH * 0.58, size: 3,  delay: 820  },
    { x: SW * 0.52, y: SH * 0.82, size: 4,  delay: 1100 },
    { x: SW * 0.90, y: SH * 0.44, size: 6,  delay: 140  },
  ];

  return (
    <View style={sp.root}>
      <LinearGradient
        colors={[color, color, '#fff']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />

      {PARTICLES.map((p, i) => <Particle key={i} {...p} />)}

      <View style={sp.center}>
        <Animated.View style={[
          sp.glowRing,
          { opacity: glowOp, transform: [{ scale: glowScale }] },
        ]} />

        <Animated.View style={{
          opacity:    ghostOp,
          transform:  [{ scale: ghostScale }, { translateY: ghostBob }],
        }}>
          {appIcon ? (
            <Image 
              source={{ uri: appIcon }} 
              style={{ width: 90, height: 90, borderRadius: 20 }} 
              resizeMode="cover" 
            />
          ) : (
            <Image 
              source={require('../../assets/aegis.png')} 
              style={{ width: 90, height: 90 }} 
              resizeMode="contain" 
            />
          )}
        </Animated.View>

        <Animated.View style={{
          opacity:    textOp,
          transform:  [{ translateY: textY }],
          alignItems: 'center',
        }}>
          <Text style={sp.appName}>
            Aegis<Text style={sp.dot}>.</Text>
          </Text>
        </Animated.View>

        <Animated.Text style={[sp.tagline, { opacity: tagOp }]}>
          RISE ABOVE EVERYTHING.
        </Animated.Text>
      </View>

      <View style={sp.sparkleRow}>
        <Text style={sp.sparkle}>✦</Text>
      </View>
    </View>
  );
}

const sp = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  glowRing: {
    position: 'absolute',
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  ghost:   { fontSize: 90, lineHeight: 106 },
  appName: { fontSize: 44, fontWeight: '800', color: 'white', letterSpacing: -1.5 },
  dot:     { color: '#C49DD6' },
  tagline: {
    fontSize: 12, color: 'rgba(255,255,255,0.65)',
    letterSpacing: 2.8, textTransform: 'uppercase', marginTop: 10,
  },
  particle: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.45)' },
  sparkleRow: { alignItems: 'center', paddingBottom: 56 },
  sparkle:    { fontSize: 14, color: 'rgba(255,255,255,0.35)' },
});