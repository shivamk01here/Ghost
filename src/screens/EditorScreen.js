import React, {
  useState, useRef, useEffect,
} from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView,
  TouchableOpacity, KeyboardAvoidingView, Platform,
  Alert, Animated as RNAnimated, Dimensions, Image, StatusBar, Modal,
  Share, BackHandler,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioPlayer,
  useAudioPlayerStatus
} from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useApp } from '../context/AppContext';
import { formatDateKey, generateId } from '../utils/storage';
import { MOODS } from '../theme';
import { getCurrentLocation } from '../utils/location';
import { exportSingleEntry, triggerBackgroundSync } from '../utils/driveSync';

const MOOD_MAP = Object.fromEntries(MOODS.map(m => [m.key, m]));

const { width: SW } = Dimensions.get('window');
const CGAP = 3;
const CW   = SW - 48;

// ── Collage ───────────────────────────────────────────────────────────────────
function Cell({ uri, style, onRemove, onOpenFull }) {
  return (
    <TouchableOpacity 
      activeOpacity={0.9} 
      onPress={onOpenFull} 
      style={[style, { overflow: 'hidden', borderRadius: 8 }]}
    >
      <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <TouchableOpacity
        onPress={onRemove}
        style={ed.removeBtn}
        hitSlop={{ top:12, bottom:12, left:12, right:12 }}
      >
        <Feather name="trash-2" size={12} color="white" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function Collage({ images, onRemove, onOpenFull }) {
  const n = images.length;
  if (n === 0) return null;
  const S = 130;
  const L = 210;

  if (n === 1) return (
    <Cell uri={images[0].uri} style={{ width: CW, height: L }} onRemove={() => onRemove(0)} onOpenFull={() => onOpenFull(images[0])} />
  );

  if (n === 2) {
    const w = (CW - CGAP) / 2;
    return (
      <View style={{ flexDirection: 'row', gap: CGAP }}>
        {images.map((img, i) => (
          <Cell key={i} uri={img.uri} style={{ width: w, height: S }} onRemove={() => onRemove(i)} onOpenFull={() => onOpenFull(img)} />
        ))}
      </View>
    );
  }

  if (n === 3) {
    const bw = (CW - CGAP) * 0.6;
    const sw = CW - bw - CGAP;
    const sh = (S * 2 + CGAP) / 2;
    return (
      <View style={{ flexDirection: 'row', gap: CGAP }}>
        <Cell uri={images[0].uri} style={{ width: bw, height: S * 2 + CGAP }} onRemove={() => onRemove(0)} onOpenFull={() => onOpenFull(images[0])} />
        <View style={{ width: sw, gap: CGAP }}>
          {images.slice(1).map((img, i) => (
            <Cell key={i} uri={img.uri} style={{ width: sw, height: sh }} onRemove={() => onRemove(i + 1)} onOpenFull={() => onOpenFull(img)} />
          ))}
        </View>
      </View>
    );
  }

  if (n === 4) {
    const w = (CW - CGAP) / 2;
    return (
      <View style={{ gap: CGAP }}>
        <View style={{ flexDirection: 'row', gap: CGAP }}>
          {images.slice(0, 2).map((img, i) => (
            <Cell key={i} uri={img.uri} style={{ width: w, height: S }} onRemove={() => onRemove(i)} onOpenFull={() => onOpenFull(img)} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: CGAP }}>
          {images.slice(2, 4).map((img, i) => (
            <Cell key={i} uri={img.uri} style={{ width: w, height: S }} onRemove={() => onRemove(i + 2)} onOpenFull={() => onOpenFull(img)} />
          ))}
        </View>
      </View>
    );
  }

  const topW = (CW - CGAP * 2) / 3;
  const botW = (CW - CGAP) / 2;
  return (
    <View style={{ gap: CGAP }}>
      <View style={{ flexDirection: 'row', gap: CGAP }}>
        {images.slice(0, 3).map((img, i) => (
          <Cell key={i} uri={img.uri} style={{ width: topW, height: 100 }} onRemove={() => onRemove(i)} onOpenFull={() => onOpenFull(img)} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: CGAP }}>
        {images.slice(3, 5).map((img, i) => (
          <Cell key={i} uri={img.uri} style={{ width: botW, height: 130 }} onRemove={() => onRemove(i + 3)} onOpenFull={() => onOpenFull(img)} />
        ))}
      </View>
    </View>
  );
}

// ── Mood selector ─────────────────────────────────────────────────────────────
function MoodBar({ selected, onSelect, theme }) {
  return (
    <View style={[ed.moodBarWrap, {
      borderBottomColor: theme.border,
      backgroundColor:   theme.surface,
    }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={ed.moodScroll}
        bounces={false}
      >
        <TouchableOpacity
          onPress={() => { Haptics.selectionAsync(); onSelect(null); }}
          style={[
            ed.moodChip,
            { backgroundColor: theme.bg2, borderColor: theme.border },
            selected === null && { backgroundColor: theme.primary + '15', borderColor: theme.primary }
          ]}
        >
          <Feather name="slash" size={14} color={selected === null ? theme.primary : theme.textMuted} />
          <Text style={[
            ed.moodLabel,
            { color: theme.textMuted },
            selected === null && { color: theme.primary, fontWeight: '700' }
          ]}>
            None
          </Text>
        </TouchableOpacity>
        {MOODS.map(m => {
          const active = selected === m.key;
          return (
            <TouchableOpacity
              key={m.key}
              onPress={() => { Haptics.selectionAsync(); onSelect(active ? null : m.key); }}
              style={[
                ed.moodChip,
                { backgroundColor: theme.bg2, borderColor: theme.border },
                active && { backgroundColor: m.color + '15', borderColor: m.color }
              ]}
            >
              <Feather
                name={m.icon}
                size={active ? 16 : 14}
                color={active ? m.color : theme.textMuted}
              />
              <Text style={[
                ed.moodLabel,
                { color: theme.textMuted },
                active && { color: m.color, fontWeight: '700' }
              ]}>
                {m.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ActionItem({ icon, label, onPress, theme, color }) {
  return (
    <TouchableOpacity onPress={onPress} style={ed.drawerItem}>
      <View style={[ed.drawerIcon, { backgroundColor: color ? color + '15' : theme.bg2 }]}>
        <Feather name={icon} size={18} color={color || theme.primary} />
      </View>
      <Text style={[ed.drawerLabel, { color: theme.textMuted }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function EditorScreen({ route, navigation }) {
  const { theme, addEntry, updateEntry, autoPlayMusic } = useApp();
  const accent  = theme.primary;
  const insets  = useSafeAreaInsets();

  const existing    = route?.params?.entry    || null;
  const prefillDate = route?.params?.prefillDate || formatDateKey();

  const [title,    setTitle]    = useState(existing?.title  || '');
  const [blocks,   setBlocks]   = useState(existing?.blocks || (existing?.body ? [{ id: 'b1', type: 'text', content: existing.body }] : [{ id: 'b1', type: 'text', content: '' }]));
  const [mood,     setMood]     = useState(existing?.mood   || null);
  const [music,    setMusic]    = useState(existing?.music  || null);
  const [voice,    setVoice]    = useState(existing?.voice  || null);
  const [location, setLocation] = useState(existing?.location || null);
  const [tags,     setTags]     = useState(existing?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [video,    setVideo]    = useState(existing?.video  || null);
  const [showFull, setShowFull] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [fullImg,  setFullImg]  = useState(null);
  const [fullVid,  setFullVid]  = useState(null);

  useEffect(() => {
    if (showFull) {
      const backAction = () => {
        setShowFull(false); setFullImg(null); setFullVid(null);
        return true; // prevent default back action
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

  const animatedImageStyle = useAnimatedStyle(() => ({
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
  
  const [isSaving, setIsSaving] = useState(false);
  const [showMood, setShowMood] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);

  const musicPlayer = useAudioPlayer(music?.uri);
  const musicStatus = useAudioPlayerStatus(musicPlayer);

  useEffect(() => {
    if (music?.uri) {
      musicPlayer.loop = true;
      if (autoPlayMusic) musicPlayer.play();
    }
  }, [music?.uri]);

  const isRecording = recorderState.isRecording;

  const saveScale = useRef(new RNAnimated.Value(1)).current;

  const dateLabel = new Date(existing?.createdAt || Date.now())
    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  // ── Handlers ───────────────────────────────────────────────────────────────
  function updateBlock(id, content) {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
  }
  function addBlock(type, data = {}) {
    setBlocks(prev => [...prev, { id: generateId(), type, ...data }]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  function removeBlock(id) {
    if (blocks.length <= 1 && blocks[0].type === 'text') return;
    setBlocks(prev => prev.filter(b => b.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handlePickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 5, quality: 0.82,
    });
    if (result.canceled) return;
    const newImgs = result.assets.map(a => ({ id: generateId(), uri: a.uri }));
    addBlock('collage', { images: newImgs });
    setShowDrawer(false);
  }

  async function handlePickVideo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow video access.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'], allowsMultipleSelection: false, quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const sizeMB = (asset.fileSize || 0) / (1024 * 1024);
    if (sizeMB > 10) {
      Alert.alert('Video too large', 'Please select a video smaller than 10MB.');
      return;
    }
    setVideo({ uri: asset.uri, duration: asset.duration });
    setShowDrawer(false);
  }

  async function handlePickMusic() {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      setMusic({ uri: asset.uri, name: asset.name, startTime: 0 });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowDrawer(false);
    } catch (e) {
      Alert.alert('Error', 'Could not pick music.');
    }
  }

  async function startRecording() {
    try {
      const { status } = await requestRecordingPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow microphone access to record voice memos.');
        return;
      }
      await recorder.prepareToRecordAsync();
      recorder.record();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (err) {
      Alert.alert('Failed to start recording', err.message);
    }
  }

  async function stopRecording() {
    await recorder.stop();
    const uri = recorder.uri;
    setVoice({ uri, duration: recorderState.durationMillis });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDrawer(false);
  }


  async function handleAddLocation() {
    const loc = await getCurrentLocation();
    if (loc) {
      setLocation(loc);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Alert.alert('Location Error', 'Could not get your location.');
    }
    setShowDrawer(false);
  }

  async function handleExport() {
    await exportSingleEntry(existing || { title, blocks, mood, location, tags, music, voice, createdAt: new Date().toISOString() });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowDrawer(false);
  }

  async function handleSave() {
    const hasContent = title.trim() || blocks.some(b => (b.type === 'text' && (b.content || '').trim()) || (b.type === 'collage' && b.images.length > 0));
    if (!hasContent) { Alert.alert('Empty entry', 'Write something first.'); return; }
    setIsSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const bodyText = blocks.filter(b => b.type === 'text').map(b => b.content || '').join('\n');
    const allImages = blocks.filter(b => b.type === 'collage').flatMap(b => b.images);

    // Limit block size and image counts for stability
    const finalBlocks = blocks.slice(0, 50); // limit to 50 blocks max
    const finalImages = allImages.slice(0, 10); // limit 10 images total
    
    let wCount = 0;
    if (bodyText && bodyText.trim().length > 0) {
      wCount = bodyText.trim().split(/\s+/).filter(Boolean).length;
    }

    const data = {
      ...existing,
      title: title.trim(),
      body: bodyText,
      blocks: finalBlocks,
      images: finalImages,
      mood, music, voice, video, location, tags,
      dateKey: existing?.dateKey || prefillDate,
      wordCount: wCount,
    };
    if (existing) {
      await updateEntry(data);
      navigation.goBack();
    } else {
      await addEntry(data, prefillDate);
      navigation.replace('EntryViewer', { entry: data });
    }
    
    // Auto-sync in background seamlessly
    triggerBackgroundSync();
    
    setIsSaving(false);
  }

  function handleDiscard() {
    const dirty = title.trim() || blocks.some(b => b.type === 'text' ? (b.content || '').trim() : true);
    if (!dirty && !existing) { navigation.goBack(); return; }
    Alert.alert('Discard entry?', 'Changes will be lost.', [
      { text: 'Keep writing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  }

  return (
    <View style={[ed.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

          {/* ── Navbar ── */}
          <View style={[ed.navbar, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={handleDiscard}><Feather name="x" size={20} color={theme.textMuted}/></TouchableOpacity>
            <View style={ed.navMid}>
              <Text style={[ed.navDate, { color: theme.textMuted }]}>{dateLabel}</Text>
              {location && (
                <View style={ed.navLocWrap}>
                  <Text style={[ed.navLoc, { color: theme.primary }]} numberOfLines={1}>
                    <Feather name="map-pin" size={10}/> {location.name}
                  </Text>
                  <TouchableOpacity onPress={() => setLocation(null)} style={ed.navLocClose}>
                    <Feather name="x" size={10} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={()=>{setShowMood(!showMood);setShowDrawer(false); setShowDetails(false);}} style={ed.iconBtn}>
              <Feather name="smile" size={16} color={showMood?accent:theme.textMuted}/>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>{setShowDrawer(!showDrawer);setShowMood(false); setShowDetails(false);}} style={ed.iconBtn}>
              <Feather name="plus" size={18} color={showDrawer?accent:theme.textMuted}/>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDetails(true)} style={ed.iconBtn}>
              <Feather name="info" size={17} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={[ed.saveBtn, { backgroundColor: accent }]}>
              <Text style={ed.saveTxt}>{isSaving ? '…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>

          {showMood && <MoodBar selected={mood} onSelect={setMood} theme={theme} />}

          {/* ── Action Drawer ── */}
          {showDrawer && (
            <View style={[ed.drawer, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ed.drawerInner}>
                <ActionItem icon="type" label="Text" onPress={() => { addBlock('text'); setShowDrawer(false); }} theme={theme} />
                <ActionItem icon="image" label="Photos" onPress={handlePickImages} theme={theme} />
                <ActionItem icon="music" label="Music" color="#8B5CF6" onPress={handlePickMusic} theme={theme} />
                <ActionItem 
                  icon={isRecording ? "stop-circle" : "mic"} 
                  label={isRecording ? "Stop" : "Voice"} 
                  color={isRecording ? "#EF4444" : "#EC4899"}
                  onPress={isRecording ? stopRecording : startRecording} 
                  theme={theme} 
                />
                <ActionItem icon="map-pin" label="Location" color="#10B981" onPress={handleAddLocation} theme={theme} />
                <ActionItem icon="video" label="Video" color="#3B82F6" onPress={handlePickVideo} theme={theme} />
                <ActionItem icon="share" label="Export" color="#F59E0B" onPress={handleExport} theme={theme} />
              </ScrollView>
            </View>
          )}

          {/* ── Writing Area ── */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={[ed.scrollContent, { paddingBottom: insets.bottom + 40 }]}>
            <TextInput
              style={[ed.titleInput, { color: theme.text }]}
              placeholder="Journal Title" placeholderTextColor={theme.textMuted + '55'}
              value={title} onChangeText={setTitle} multiline
            />
            {/* Tags area */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {tags.map(t => (
                <View key={t} style={[ed.tag, { backgroundColor: theme.bg2, borderColor: theme.border }]}>
                  <Text style={[ed.tagTxt, { color: theme.textMuted }]}>#{t}</Text>
                  <TouchableOpacity onPress={() => setTags(prev => prev.filter(x => x !== t))}>
                    <Feather name="x" size={10} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              ))}
              <TextInput
                style={[ed.tagInput, { color: theme.text }]}
                placeholder="+ Add tag..." placeholderTextColor={theme.textMuted + '60'}
                value={tagInput}
                onChangeText={setTagInput}
                onSubmitEditing={() => {
                  const t = tagInput.trim().toLowerCase();
                  if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
                  setTagInput('');
                }}
              />
            </View>

            {/* Ambient Music Indicator */}
            {music && (
              <View style={[ed.mediaPill, { backgroundColor: '#8B5CF615', borderColor: '#8B5CF630' }]}>
                <TouchableOpacity onPress={() => musicStatus.playing ? musicPlayer.pause() : musicPlayer.play()}>
                  <Feather name={musicStatus.playing ? "pause" : "music"} size={12} color="#8B5CF6" />
                </TouchableOpacity>
                <Text style={[ed.mediaTxt, { color: '#8B5CF6' }]} numberOfLines={1}>{music.name}</Text>
                <TouchableOpacity onPress={() => setMusic(null)} style={{ marginLeft: 8 }}>
                  <Feather name="x" size={12} color="#8B5CF6" />
                </TouchableOpacity>
              </View>
            )}
            {/* Video Attachment Indicator */}
            {video && (
              <View style={[ed.mediaPill, { backgroundColor: '#3B82F615', borderColor: '#3B82F630' }]}>
                <TouchableOpacity onPress={() => { setFullVid(video); setFullImg(null); setShowFull(true); }}>
                  <Feather name="video" size={12} color="#3B82F6" />
                </TouchableOpacity>
                <Text style={[ed.mediaTxt, { color: '#3B82F6' }]}>Video Memo</Text>
                <TouchableOpacity onPress={()=>setVideo(null)}><Feather name="x" size={12} color="#3B82F6" /></TouchableOpacity>
              </View>
            )}
            {/* Voice Attachment Indicator */}
            {voice && (
              <View style={[ed.mediaPill, { backgroundColor: '#EC489915', borderColor: '#EC489930' }]}>
                <Feather name="mic" size={12} color="#EC4899" />
                <Text style={[ed.mediaTxt, { color: '#EC4899' }]}>Voice Attachment</Text>
                <TouchableOpacity onPress={()=>setVoice(null)}><Feather name="x" size={12} color="#EC4899" /></TouchableOpacity>
              </View>
            )}

            <View style={[ed.rule, { backgroundColor: theme.border }]} />

            {blocks.map((block) => {
              if (block.type === 'text') {
                const urls = (block.content || '').match(/https?:\/\/[^\s]+/gi) || [];
                const imgUrls = urls.filter(u => /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(u) || u.includes('imagekit'));

                return (
                  <View key={block.id} style={ed.blockWrap}>
                    <TextInput
                      style={[ed.bodyInput, { color: theme.text }]}
                      placeholder="Start writing..." placeholderTextColor={theme.textMuted + '40'}
                      value={block.content} onChangeText={(t) => updateBlock(block.id, t)}
                      multiline scrollEnabled={false}
                    />
                    {imgUrls.map((url, idx) => (
                      <View key={`prev-${idx}`} style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: theme.border }}>
                        <Image source={{ uri: url }} style={{ width: '100%', height: 200 }} resizeMode="cover" />
                      </View>
                    ))}
                    {blocks.length > 1 && (
                      <TouchableOpacity onPress={() => removeBlock(block.id)} style={ed.blockRemove}>
                        <Feather name="minus-circle" size={14} color={theme.textMuted + '80'} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }
              if (block.type === 'collage') {
                return (
                  <View key={block.id} style={ed.collageBlock}>
                    <Collage 
                      images={block.images} 
                      onRemove={(imgIdx) => {
                        const updatedImgs = block.images.filter((_, i) => i !== imgIdx);
                        if (updatedImgs.length === 0) removeBlock(block.id);
                        else setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, images: updatedImgs } : b));
                      }} 
                      onOpenFull={(img) => {
                        setFullImg(img);
                        setShowFull(true);
                      }}
                    />
                    <TouchableOpacity onPress={() => removeBlock(block.id)} style={ed.blockRemoveFloating}>
                      <Feather name="trash-2" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                );
              }
              return null;
            })}
            <TouchableOpacity 
              activeOpacity={1} 
              style={{ minHeight: 180 }} 
              onPress={() => addBlock('text')}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Details Drawer */}
      <Modal visible={showDetails} transparent animationType="slide" onRequestClose={() => setShowDetails(false)}>
        <TouchableOpacity activeOpacity={1} style={ed.modalOverlay} onPress={() => setShowDetails(false)}>
          <View style={[ed.detailsSheet, { backgroundColor: theme.surface }]}>
            <View style={ed.sheetHeader}>
              <Text style={[ed.sheetTitle, { color: theme.text }]}>Entry Details</Text>
              <TouchableOpacity onPress={() => setShowDetails(false)} style={ed.sheetClose}>
                <Feather name="x" size={20} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={ed.sheetStats}>
              {mood ? (
                <DetailRow icon={MOOD_MAP[mood]?.icon || "smile"} label="Mood" value={MOOD_MAP[mood]?.label || "Set"} theme={theme} color={MOOD_MAP[mood]?.color} />
              ) : (
                <DetailRow icon="slash" label="Mood" value="None" theme={theme} />
              )}
              {location ? (
                <DetailRow icon="map-pin" label="Location" value={location.name} theme={theme} color="#10B981" />
              ) : (
                <DetailRow icon="map-pin" label="Location" value="None" theme={theme} />
              )}
              {music ? (
                <DetailRow icon="music" label="Music" value={music.name} theme={theme} color="#8B5CF6" />
              ) : (
                <DetailRow icon="music" label="Music" value="None" theme={theme} />
              )}
              
              {voice && (
                <View style={{ marginTop: 10 }}>
                  <Text style={[ed.drawerLabel, { color: theme.textMuted, marginBottom: 8 }]}>Voice Memo</Text>
                  <VoicePlayer inline voice={voice} theme={theme} />
                </View>
              )}
            </View>

            <TouchableOpacity 
              style={[ed.sheetShareBtn, { backgroundColor: theme.primary }]}
              onPress={() => {
                const body = blocks.filter(b => b.type==='text').map(b=>b.content).join('\n\n');
                Share.share({ title, message: `${title}\n\n${body}` });
              }}
            >
              <Feather name="share-2" size={16} color="white" />
              <Text style={ed.shareTxt}>Share Selection</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Full Screen Image / Video Overlay */}
      {showFull && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 9999, elevation: 9999 }]}>
          <View style={ed.fullRoot}>
            <SafeAreaView style={{ flex: 1 }}>
              <View style={ed.fullHeader}>
                <TouchableOpacity onPress={() => { setShowFull(false); setFullImg(null); setFullVid(null); }} style={ed.fullClose}>
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
                      style={[ed.fullClose, { marginRight: 15 }]}
                    >
                      <Feather name="download" size={20} color="white" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={async () => {
                        try { await Sharing.shareAsync(fullImg.uri); }
                        catch (e) { Alert.alert('Error', e.message); }
                      }}
                      style={ed.fullClose}
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
                      style={[{ width: SW, height: SW * 1.3 }, animatedImageStyle]}
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
}

const ed = StyleSheet.create({
  root: { flex: 1 },
  navbar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  navMid: { flex: 1, marginLeft: 4, gap: 2 },
  navDate: { fontSize: 12, fontWeight: '500' },
  navLocWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  navLoc: { fontSize: 10, fontWeight: '500' },
  navLocClose: { padding: 2, marginLeft: 2 },
  iconBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveTxt: { color: 'white', fontSize: 13, fontWeight: '700' },

  drawer: { paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  drawerInner: { paddingHorizontal: 16, gap: 20 },
  drawerItem: { alignItems: 'center', gap: 6, minWidth: 50 },
  drawerIcon: { 
    width: 44, height: 44, borderRadius: 14, 
    alignItems: 'center', justifyContent: 'center' 
  },
  drawerLabel: { fontSize: 11, fontWeight: '600' },

  moodBarWrap: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  moodScroll:  { paddingHorizontal: 14, gap: 7 },
  moodChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 24, borderWidth: 1,
  },
  moodDot: { width: 6, height: 6, borderRadius: 3 },
  moodLabel: { fontSize: 12, fontWeight: '500' },

  scrollContent: { paddingHorizontal: 22, paddingTop: 22 },
  titleInput: {
    fontSize: 28, fontWeight: '700', letterSpacing: -0.6,
    lineHeight: 36, marginBottom: 12, minHeight: 44,
  },
  mediaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
    borderWidth: 1, marginBottom: 8, alignSelf: 'flex-start',
  },
  mediaTxt: { fontSize: 11, fontWeight: '600', maxWidth: 200 },
  rule: { height: StyleSheet.hairlineWidth, marginBottom: 18 },

  blockWrap: { position: 'relative', marginBottom: 8 },
  blockRemove: { position: 'absolute', top: 0, right: -16, padding: 8 },
  blockRemoveFloating: {
    position: 'absolute', top: 8, right: 8, backgroundColor: 'white',
    padding: 6, borderRadius: 8, elevation: 2, shadowOpacity: 0.1, shadowRadius: 4,
  },
  collageBlock: { marginBottom: 20, position: 'relative' },
  bodyInput: { fontSize: 17, lineHeight: 28, letterSpacing: -0.1, minHeight: 44, paddingVertical: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tagTxt: { fontSize: 11, fontWeight: '600' },
  tagInput: { fontSize: 13, minWidth: 80, paddingVertical: 4 },
  removeBtn: {
    position: 'absolute', top: 8, right: 8, width: 28, height: 28,
    borderRadius: 14, backgroundColor: 'rgba(239, 68, 68, 0.85)',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2, shadowRadius: 3, elevation: 3,
  },
  fullRoot: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' },
  fullHeader: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  fullClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  detailsSheet: {
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 28, paddingBottom: 40, paddingTop: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 20,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 },
  sheetTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
  sheetClose: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sheetStats: { gap: 16, marginBottom: 30 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statIconBox: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statLabel: { fontSize: 13, fontWeight: '500' },
  statValue: { fontSize: 13, fontWeight: '700', flex: 1, textAlign: 'right' },
  statDivider: { height: 1, marginVertical: 8, opacity: 0.5 },
  sheetShareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    height: 54, borderRadius: 16, marginTop: 10,
  },
  shareTxt: { color: 'white', fontSize: 15, fontWeight: '700' },

  voiceBox: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: 16 },
  playBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  voiceInfo: { flex: 1, gap: 4 },
  voiceLabel: { fontSize: 13, fontWeight: '600' },
  progTrack: { height: 4, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' },
  progThumb: { height: '100%', borderRadius: 2 },
});

function DetailRow({ icon, label, value, theme, color }) {
  const iconColor = color || theme.textMuted;
  return (
    <View style={ed.statRow}>
      <View style={[ed.statIconBox, { backgroundColor: color ? color + '15' : theme.bg2 }]}>
        <Feather name={icon} size={14} color={iconColor} />
      </View>
      <Text style={[ed.statLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[ed.statValue, { color: theme.text }]} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function VoicePlayer({ voice, theme, inline }) {
  const player = useAudioPlayer(voice.uri);
  const status = useAudioPlayerStatus(player);
  const pos = (status.duration > 0) ? (status.currentTime / status.duration) : 0;

  function handleSeek(e) {
    const x = e.nativeEvent.locationX;
    const width = 200; // approximate width of track
    const percent = Math.max(0, Math.min(1, x / width));
    if (status.duration > 0) {
      player.time = percent * status.duration;
    }
  }

  return (
    <View style={[ed.voiceBox, { backgroundColor: theme.bg2, marginBottom: inline ? 0 : 20 }]}>
      <TouchableOpacity onPress={() => status.playing ? player.pause() : player.play()} style={[ed.playBtn, { backgroundColor: theme.primary }]}>
        <Feather name={status.playing ? "pause" : "play"} size={16} color="white" />
      </TouchableOpacity>
      <View style={ed.voiceInfo}>
        <Text style={[ed.voiceLabel, { color: theme.text }]}>Recording</Text>
        <TouchableOpacity activeOpacity={1} onPress={handleSeek} style={ed.progTrack}>
          <View style={[ed.progThumb, { width: `${pos * 100}%`, backgroundColor: theme.primary }]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}