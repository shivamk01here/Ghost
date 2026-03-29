import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image, Dimensions, Modal, StatusBar, BackHandler
} from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import Markdown from 'react-native-markdown-display';
import { useApp } from '../context/AppContext';
import { MOODS } from '../theme';

const { width: SW } = Dimensions.get('window');
const GAP = 12;
const W   = SW - 48;

const MOOD_MAP = Object.fromEntries(MOODS.map(m => [m.key, m]));

// VoicePlayer and ViewCollage are now inside EntryViewerScreen for scope

export default function EntryViewerScreen({ route, navigation }) {
  const { entries, theme, deleteEntry, updateEntry, autoPlayMusic } = useApp();
  const paramsEntry = route?.params?.entry;
  // Get reactive entry from context
  const entry = (entries[paramsEntry?.dateKey] || []).find(e => e.id === paramsEntry?.id) || paramsEntry;
  const [showFull, setShowFull] = useState(false);
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [fullImg,  setFullImg]  = useState(null);
  const [fullVid,  setFullVid]  = useState(null);

  useEffect(() => {
    if (showFull) {
      const backAction = () => {
        setShowFull(false); setFullImg(null); setFullVid(null);
        return true; 
      };
      const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
      return () => backHandler.remove();
    }
  }, [showFull]);

  const scale = useSharedValue(1);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = e.scale;
      focalX.value = e.focalX;
      focalY.value = e.focalY;
    })
    .onEnd(() => {
      scale.value = withSpring(1);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: focalX.value },
      { translateY: focalY.value },
      { translateX: -focalX.value },
      { translateY: -focalY.value },
      { scale: scale.value },
    ],
  }));

  const videoPlayer = useVideoPlayer(fullVid?.uri, (player) => {
    player.loop = false;
    player.play();
  });

  if (!entry) return null;

  const mood = entry.mood ? MOOD_MAP[entry.mood] : null;
  const blocks = entry.blocks || (entry.body ? [{ id: 'b1', type: 'text', content: entry.body }] : []);

  const dateLabel = new Date(entry.createdAt).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const timeLabel = new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });


  return (
    <View style={[ev.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[ev.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Feather name="arrow-left" size={20} color={theme.textMuted}/></TouchableOpacity>
          <View style={ev.headerMid} />
          {entry.music && (
            <AmbientAudioPlayer entry={entry} theme={theme} SW={SW} dateLabel={dateLabel} autoPlayMusic={autoPlayMusic} />
          )}
          <TouchableOpacity onPress={() => navigation.navigate('Editor', { entry })} style={[ev.actionBtn, { backgroundColor: theme.bg2 }]}><Feather name="edit-2" size={15} color={theme.textMuted}/></TouchableOpacity>
          <TouchableOpacity onPress={() => {
            Alert.alert('Delete?', 'This cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: async () => { await deleteEntry(entry.id, entry.dateKey); navigation.goBack(); }}
            ]);
          }} style={[ev.actionBtn, { backgroundColor: theme.bg2 }]}><Feather name="trash-2" size={15} color="#EF4444"/></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={ev.content} showsVerticalScrollIndicator={false}>
          <View style={ev.metaRow}>
            {mood && (
              <View style={[ev.moodChip, { backgroundColor: mood.color + '18' }]}>
                <Feather name={mood.icon} size={14} color={mood.color} style={{ marginRight: 4 }} />
                <Text style={[ev.moodTxt, { color: mood.color }]}>{mood.label}</Text>
              </View>
            )}
            {entry.location && <View style={[ev.locChip, { backgroundColor: theme.bg2 }]}><Feather name="map-pin" size={10} color={theme.textMuted} /><Text style={[ev.locTxt, { color: theme.textMuted }]}>{entry.location.name}</Text></View>}
          </View>
          {entry.title ? <Text style={[ev.title, { color: theme.text }]}>{entry.title}</Text> : null}
          <View style={ev.timeMeta}><Text style={[ev.metaTxt, { color: theme.textMuted }]}>{dateLabel} · {timeLabel}</Text></View>
          {entry.video && (
            <View style={[ev.mediaPill, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
              <TouchableOpacity onPress={() => { setFullVid(entry.video); setFullImg(null); setShowFull(true); }}>
                <Feather name="video" size={12} color="#3B82F6" />
              </TouchableOpacity>
              <Text style={[ev.mediaTxt, { color: '#3B82F6' }]}>Video Memo</Text>
            </View>
          )}
          {entry.voice && <VoicePlayer voice={entry.voice} theme={theme} />}
          <View style={[ev.rule, { backgroundColor: theme.border }]} />
          {blocks.map((block) => (
            block.type === 'text' ? (
              <Markdown
                key={block.id}
                style={{
                  body: [ev.body, { color: theme.text }],
                  heading1: { color: theme.text, fontSize: 24, marginTop: 16, marginBottom: 8, fontWeight: '700' },
                  heading2: { color: theme.text, fontSize: 20, marginTop: 16, marginBottom: 8, fontWeight: '700' },
                  heading3: { color: theme.text, fontSize: 18, marginTop: 16, marginBottom: 8, fontWeight: '600' },
                  link: { color: theme.primary },
                  strong: { color: theme.text, fontWeight: 'bold' },
                  em: { color: theme.text, fontStyle: 'italic' },
                  bullet_list: { marginBottom: 16 },
                  ordered_list: { marginBottom: 16 },
                }}
              >
                {block.content}
              </Markdown>
            ) :
            block.type === 'collage' ? <View key={block.id} style={ev.collageBlock}><ViewCollage images={block.images} /></View> : null
          ))}
          {blocks.length === 0 && <Text style={[ev.emptyBody, { color: theme.textMuted }]}>No content found</Text>}
        </ScrollView>
      </SafeAreaView>

      {/* Full Screen Image / Video Overlay */}
      {showFull && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
          <View style={ev.fullRoot}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={ev.fullHeader}>
                <TouchableOpacity onPress={() => { setShowFull(false); setFullImg(null); setFullVid(null); }} style={ev.fullClose}>
                  <Feather name="x" size={24} color="white" />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                {fullImg?.uri && (
                  <>
                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          const { status } = await MediaLibrary.requestPermissionsAsync();
                          if (status !== 'granted') {
                            Alert.alert('Permission needed', 'Please grant permission to save photos.');
                            return;
                          }
                          await MediaLibrary.saveToLibraryAsync(fullImg.uri);
                          Alert.alert('Success', 'Image saved to your gallery.');
                        } catch (e) {
                          Alert.alert('Error', e.message);
                        }
                      }}
                      style={[ev.fullClose, { marginRight: 15 }]}
                    >
                      <Feather name="download" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        try { await Sharing.shareAsync(fullImg?.uri); }
                        catch (e) { Alert.alert('Error', e.message); }
                      }}
                      style={ev.fullClose}
                    >
                      <Feather name="share-2" size={20} color="white" />
                    </TouchableOpacity>
                  </>
                )}
              </View>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                {fullImg?.uri && (
                  <GestureDetector gesture={pinchGesture}>
                    <Animated.Image
                      source={{ uri: fullImg.uri }}
                      style={[{ width: SW, height: SW * 1.3 }, animatedStyle]}
                      resizeMode="contain"
                    />
                  </GestureDetector>
                )}
                {fullVid?.uri && (
                  <VideoView
                    player={videoPlayer}
                    style={{ width: SW, height: SW * (9/16) }}
                    allowsFullscreen
                    allowsPictureInPicture
                  />
                )}
              </View>
            </SafeAreaView>
          </View>
        </View>
      )}
    </View>
  );

  function ViewCollage({ images }) {
    const n = images.length;
    if (!n) return null;
    function Img({ uri, style }) {
      return (
        <TouchableOpacity 
          activeOpacity={0.9} 
          onPress={() => { setFullImg({ uri }); setShowFull(true); }}
          style={[style, { overflow: 'hidden', borderRadius: 8 }]}
        >
          <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        </TouchableOpacity>
      );
    }
    if (n === 1) return <Img uri={images[0].uri} style={{ width: W, height: 220 }} />;
    if (n === 2) {
      const w = (W - GAP) / 2;
      return (
        <View style={{ flexDirection: 'row', gap: GAP }}>
          {images.map((img, i) => <Img key={i} uri={img.uri} style={{ width: w, height: 160 }} />)}
        </View>
      );
    }
    if (n === 3) {
      const w = (W - GAP) / 2;
      return (
        <View style={{ flexDirection: 'row', gap: GAP }}>
          <Img uri={images[0].uri} style={{ width: w, height: 210 }} />
          <View style={{ gap: GAP, flex: 1 }}>
            <Img uri={images[1].uri} style={{ height: 100 }} />
            <Img uri={images[2].uri} style={{ height: 100 }} />
          </View>
        </View>
      );
    }
    if (n === 4) {
      const w = (W - GAP) / 2;
      return (
        <View style={{ gap: GAP }}>
          <View style={{ flexDirection: 'row', gap: GAP }}>
            {images.slice(0, 2).map((img, i) => <Img key={i} uri={img.uri} style={{ width: w, height: 130 }} />)}
          </View>
          <View style={{ flexDirection: 'row', gap: GAP }}>
            {images.slice(2, 4).map((img, i) => <Img key={i} uri={img.uri} style={{ width: w, height: 130 }} />)}
          </View>
        </View>
      );
    }
    const topW = (W - GAP * 2) / 3;
    const botW = (W - GAP) / 2;
    return (
      <View style={{ gap: GAP }}>
        <View style={{ flexDirection: 'row', gap: GAP }}>
          {images.slice(0, 3).map((img, i) => <Img key={i} uri={img.uri} style={{ width: topW, height: 100 }} />)}
        </View>
        <View style={{ flexDirection: 'row', gap: GAP }}>
          {images.slice(3, 5).map((img, i) => <Img key={i} uri={img.uri} style={{ width: botW, height: 130 }} />)}
        </View>
      </View>
    );
  }
}

// ── Top Level Components for 60fps Audio Hooks to prevent Parent Re-renders ──

function AmbientAudioPlayer({ entry, theme, SW, dateLabel, autoPlayMusic }) {
  const isFocused = useIsFocused();
  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const musicPlayer = useAudioPlayer(entry?.music?.uri);
  const musicStatus = useAudioPlayerStatus(musicPlayer);

  useEffect(() => {
    if (entry?.music?.uri && autoPlayMusic && isFocused) {
      musicPlayer.loop = true;
      if (entry.music.startTime) {
        musicPlayer.time = entry.music.startTime / 1000;
      }
      musicPlayer.play();
    }
    return () => {
      try { if (musicPlayer) musicPlayer.pause(); } catch (e) {}
    };
  }, [entry?.music?.uri]);

  // Automatically pause the music if the user navigates away (e.g. to the Editor)
  useEffect(() => {
    if (!isFocused && musicPlayer) {
      try { musicPlayer.pause(); } catch (e) {}
      setShowMusicPlayer(false);
    }
  }, [isFocused]);

  if (!entry?.music) return null;

  const pos = musicStatus.duration > 0 ? Math.max(0, Math.min(1, musicStatus.currentTime / musicStatus.duration)) : 0;
  
  function format(ms) {
    if (!ms || isNaN(ms)) return '0:00';
    const sec = Math.floor(ms / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function handleSeek(e) {
    const x = e.nativeEvent.locationX;
    const width = SW - 48; 
    const percent = Math.max(0, Math.min(1, x / width));
    if (musicStatus.duration > 0) {
      musicPlayer.seekTo(percent * musicStatus.duration);
    }
  }

  function toggleMusic() {
    if (musicStatus.playing) musicPlayer.pause();
    else musicPlayer.play();
  }

  return (
    <>
      <TouchableOpacity onPress={() => setShowMusicPlayer(true)} style={[ev.actionBtn, { backgroundColor: theme.primary + '15' }]}>
        <Feather name={musicStatus.playing ? "pause" : "music"} size={15} color={theme.primary} />
      </TouchableOpacity>
      
      <Modal transparent visible={showMusicPlayer} animationType="slide" onRequestClose={() => setShowMusicPlayer(false)}>
        <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setShowMusicPlayer(false)} />
          
          <View style={{ backgroundColor: theme.surface, padding: 24, paddingBottom: 50, borderTopLeftRadius: 32, borderTopRightRadius: 32 }}>
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: theme.border }} />
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 36 }}>
              <View style={{ width: 60, height: 60, borderRadius: 16, backgroundColor: theme.primary + '15', alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="music" size={24} color={theme.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: theme.text, letterSpacing: -0.3 }}>Ambient Loop</Text>
                <Text style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>Attached to {dateLabel}</Text>
              </View>
            </View>
            
            {/* Scrubber */}
            <View style={{ gap: 8, marginBottom: 36 }}>
              <TouchableOpacity activeOpacity={1} onPress={handleSeek} style={{ height: 20, justifyContent: 'center' }}>
                 <View style={{ height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ width: `${pos * 100}%`, height: '100%', backgroundColor: theme.primary }} />
                 </View>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontVariant: ['tabular-nums'] }}>{format(musicStatus.currentTime)}</Text>
                <Text style={{ fontSize: 12, color: theme.textMuted, fontVariant: ['tabular-nums'] }}>{format(musicStatus.duration)}</Text>
              </View>
            </View>
            
            {/* Controls */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
              <TouchableOpacity onPress={() => musicPlayer.seekTo(Math.max(0, musicStatus.currentTime - 15000))} style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="rewind" size={24} color={theme.textMuted} />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={toggleMusic} style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: {height: 4} }}>
                <Feather name={musicStatus.playing ? "pause" : "play"} size={28} color="#fff" style={{ marginLeft: musicStatus.playing ? 0 : 4 }} />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={() => musicPlayer.seekTo(Math.min(musicStatus.duration, musicStatus.currentTime + 15000))} style={{ width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="fast-forward" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            
          </View>
        </View>
      </Modal>
    </>
  );
}

function VoicePlayer({ voice, theme }) {
  const player = useAudioPlayer(voice.uri);
  const status = useAudioPlayerStatus(player);
  
  useEffect(() => {
    return () => {
      try { if (player) player.pause(); } catch (e) {}
    };
  }, [voice.uri]);

  const pos = (status.duration > 0) ? (status.currentTime / status.duration) : 0;

  function handleSeek(e) {
    const x = e.nativeEvent.locationX;
    const width = SW - 36 - 14 - 40; 
    const percent = Math.max(0, Math.min(1, x / width));
    if (status.duration > 0) {
      player.seekTo(percent * status.duration);
    }
  }

    return (
      <View style={[ev.voiceBox, { backgroundColor: theme.bg2 }]}>
        <TouchableOpacity onPress={() => status.playing ? player.pause() : player.play()} style={[ev.playBtn, { backgroundColor: theme.primary }]}>
          <Feather name={status.playing ? "pause" : "play"} size={16} color="white" />
        </TouchableOpacity>
        <View style={ev.voiceInfo}>
          <Text style={[ev.voiceLabel, { color: theme.text }]}>Voice Memo</Text>
          <TouchableOpacity activeOpacity={1} onPress={handleSeek} style={ev.progTrack}>
            <View style={[ev.progThumb, { width: `${pos * 100}%`, backgroundColor: theme.primary }]} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

const ev = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, gap: 10 },
  headerMid: { flex: 1, alignItems: 'center' },
  musicPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  musicTxt: { fontSize: 10, fontWeight: '700' },
  actionBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 60 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  moodChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  moodDot: { width: 6, height: 6, borderRadius: 3 },
  moodTxt: { fontSize: 12, fontWeight: '600' },
  locChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  locTxt: { fontSize: 11, fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.6, lineHeight: 36, marginBottom: 8 },
  timeMeta: { marginBottom: 16 },
  metaTxt: { fontSize: 13 },
  voiceBox: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 16, marginBottom: 20 },
  playBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  voiceInfo: { flex: 1, gap: 4 },
  voiceLabel: { fontSize: 13, fontWeight: '600' },
  progTrack: { height: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' },
  progThumb: { height: '100%', borderRadius: 2 },
  mediaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, marginBottom: 12, alignSelf: 'flex-start',
  },
  mediaTxt: { fontSize: 11, fontWeight: '600' },
  rule: { height: StyleSheet.hairlineWidth, marginBottom: 24 },
  body: { fontSize: 17, lineHeight: 28, letterSpacing: -0.1, marginBottom: 20 },
  collageBlock: { marginBottom: 24 },
  emptyBody: { fontSize: 15, fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
  fullRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' },
  fullHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  fullClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
});