import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Image, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';

const MONTHS_LONG = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const MOOD_COLORS = {
  joyful:'#F59E0B', peaceful:'#10B981', grateful:'#3B82F6',
  sad:'#6366F1', anxious:'#EF4444', tender:'#EC4899',
  focused:'#0EA5E9', empty:'#94A3B8', excited:'#F97316',
};

function EntryRow({ entry, accent, theme, onPress }) {
  const moodColor  = (entry.mood && MOOD_COLORS[entry.mood]) || accent;
  
  // Resolve image and preview from blocks if available
  const coverImage = entry.images?.[0]?.uri || 
    entry.blocks?.find(b => b.type === 'collage')?.images?.[0]?.uri || null;
  
  const bodyText = entry.blocks 
    ? entry.blocks.filter(b => b.type === 'text').map(b => b.content).join(' ')
    : entry.body || '';

  const preview = bodyText.replace(/\n+/g, ' ').trim().slice(0, 95);

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[el.row, { backgroundColor: theme.surface, borderColor: theme.border }]}
      activeOpacity={0.68}
    >
      <View style={[el.moodBar, { backgroundColor: moodColor }]} />

      <View style={el.content}>
        <View style={el.rowTop}>
          <Text style={[el.rowTitle, { color: theme.text }]} numberOfLines={1}>
            {entry.title || 'Untitled'}
          </Text>
          <Text style={[el.rowTime, { color: theme.textMuted }]}>
            {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        {preview ? (
          <Text style={[el.rowPreview, { color: theme.textMuted }]} numberOfLines={2}>
            {preview}
          </Text>
        ) : null}

        <View style={el.rowFooter}>
          {entry.mood && (
            <View style={[el.moodChip, { backgroundColor: moodColor + '18' }]}>
              <View style={[el.moodDot, { backgroundColor: moodColor }]} />
              <Text style={[el.moodTxt, { color: moodColor }]}>
                {entry.mood.charAt(0).toUpperCase() + entry.mood.slice(1)}
              </Text>
            </View>
          )}

          <View style={el.indicators}>
            {entry.music && (
              <View style={[el.miniPill, { backgroundColor: '#8B5CF612' }]}>
                <Feather name="music" size={10} color="#8B5CF6" />
              </View>
            )}
            {entry.voice && (
              <View style={[el.miniPill, { backgroundColor: '#EC489912' }]}>
                <Feather name="mic" size={10} color="#EC4899" />
              </View>
            )}
            {entry.location && (
              <View style={[el.miniPill, { backgroundColor: '#10B98112' }]}>
                <Feather name="map-pin" size={10} color="#10B981" />
              </View>
            )}
            {entry.video && (
              <View style={[el.miniPill, { backgroundColor: '#3B82F612' }]}>
                <Feather name="video" size={10} color="#3B82F6" />
              </View>
            )}
            {(entry.wordCount || 0) > 0 && (
              <Text style={[el.wordCount, { color: theme.textMuted }]}>{entry.wordCount}w</Text>
            )}
          </View>
        </View>
      </View>

      {coverImage ? (
        <Image source={{ uri: coverImage }} style={el.cover} resizeMode="cover" />
      ) : (
        <View style={[el.coverPlaceholder, { backgroundColor: moodColor + '10' }]}>
          <Feather name="image" size={24} color={moodColor} />
        </View>
      )}
    </TouchableOpacity>
  );
}

function EmptyState({ theme, accent, onNew, appIcon }) {
  return (
    <View style={el.empty}>
       {appIcon ? (
         <Image source={{ uri: appIcon }} style={{ width: 60, height: 60, borderRadius: 16 }} resizeMode='cover' />
       ) : (
         <Image source={require('../../assets/dino.png')} style={{ width: 60, height: 60 }} resizeMode='contain' />
       )}
      <Text style={[el.emptyTitle, { color: theme.text }]}>Nothing here yet</Text>
      <Text style={[el.emptySub, { color: theme.textMuted }]}>
        Tap below to write your first entry for this day
      </Text>
      <TouchableOpacity
        style={[el.emptyBtn, { backgroundColor: accent }]}
        onPress={onNew}
        activeOpacity={0.8}
      >
        <Feather name="plus" size={16} color="white" />
        <Text style={el.emptyBtnTxt}>New Entry</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function EntriesListScreen({ route, navigation }) {
  const { entries, theme, appIcon } = useApp();
  const accent = theme.primary;
  const { year, month, day, dateKey } = route.params || {};

  const dayEntries = useMemo(() => entries[dateKey] || [], [entries, dateKey]);

  const dateLabel = useMemo(() => {
    return new Date(year, month, day).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    });
  }, [year, month, day]);

  function goNew() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('Editor', { entry: null, prefillDate: dateKey });
  }

  function goEntry(entry) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('EntryViewer', { entry });
  }

  return (
    <View style={[el.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={theme.statusBar} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[el.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top:10, bottom:10, left:10, right:10 }}>
            <Feather name="chevron-down" size={22} color={theme.textMuted} />
          </TouchableOpacity>
          <View style={el.headerMid}>
            <Text style={[el.headerDate, { color: theme.text }]}>{dateLabel}</Text>
            {dayEntries.length > 0 && <Text style={[el.headerCount, { color: theme.textMuted }]}>{dayEntries.length} {dayEntries.length === 1 ? 'entry' : 'entries'}</Text>}
          </View>
          <TouchableOpacity style={[el.newBtn, { backgroundColor: accent }]} onPress={goNew} activeOpacity={0.8}><Feather name="plus" size={16} color="white" /></TouchableOpacity>
        </View>

        {dayEntries.length === 0 ? <EmptyState theme={theme} accent={accent} onNew={goNew} appIcon={appIcon} /> : (
          <FlatList
            data={dayEntries.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <EntryRow entry={item} accent={accent} theme={theme} onPress={() => goEntry(item)} />}
            contentContainerStyle={el.list}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const el = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, gap: 12 },
  headerMid: { flex: 1 },
  headerDate: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  headerCount: { fontSize: 12, marginTop: 2 },
  newBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 14 },
  row: { flexDirection: 'row', borderRadius: 16, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, minHeight: 96 },
  moodBar: { width: 3, alignSelf: 'stretch' },
  content: { flex: 1, padding: 13, gap: 5 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  rowTime: { fontSize: 11, marginTop: 1 },
  rowPreview: { fontSize: 13, lineHeight: 19 },
  rowFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  moodChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  moodDot: { width: 5, height: 5, borderRadius: 3 },
  moodTxt: { fontSize: 10, fontWeight: '700' },
  indicators: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniPill: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  wordCount: { fontSize: 10, fontWeight: '600', marginLeft: 2 },
  cover: { width: 86, alignSelf: 'stretch' },
  coverPlaceholder: { width: 86, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, gap: 12 },
  emptyGhost: { fontSize: 54, marginBottom: 4 },
  emptyTitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  emptyBtnTxt: { color: 'white', fontSize: 14, fontWeight: '700' },
});