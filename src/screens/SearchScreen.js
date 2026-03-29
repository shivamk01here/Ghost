import React, { useState, useMemo } from 'react';
import { 
  View, Text, StyleSheet, TextInput, 
  FlatList, TouchableOpacity, ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SearchScreen({ navigation }) {
  const { theme, entries } = useApp();
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState(null);
  const insets = useSafeAreaInsets();

  const allEntries = useMemo(() => {
    return Object.values(entries).flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [entries]);

  const allTags = useMemo(() => {
    const tags = new Set();
    allEntries.forEach(e => {
      if (e.tags) e.tags.forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [allEntries]);

  const filtered = useMemo(() => {
    return allEntries.filter(e => {
      const matchesQuery = query.toLowerCase() === '' || 
        e.title?.toLowerCase().includes(query.toLowerCase()) || 
        e.body?.toLowerCase().includes(query.toLowerCase());
      const matchesTag = !selectedTag || (e.tags && e.tags.includes(selectedTag));
      return matchesQuery && matchesTag;
    });
  }, [query, selectedTag, allEntries]);

  return (
    <View style={[s.root, { backgroundColor: theme.bg }]}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={[s.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.openDrawer()}>
            <Feather name="menu" size={20} color={theme.text} />
          </TouchableOpacity>
          <View style={[s.searchBar, { backgroundColor: theme.bg2 }]}>
            <Feather name="search" size={16} color={theme.textMuted} />
            <TextInput
              style={[s.input, { color: theme.text }]}
              placeholder="Search journals..."
              placeholderTextColor={theme.textMuted + '80'}
              value={query}
              onChangeText={setQuery}
              autoFocus
            />
            {query !== '' && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Feather name="x-circle" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={s.tagsScrollWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.tagsScroll}>
            <TouchableOpacity 
              onPress={() => setSelectedTag(null)}
              style={[s.tagChip, !selectedTag && { backgroundColor: theme.primary, borderColor: theme.primary }]}
            >
              <Text style={[s.tagTxt, !selectedTag && { color: 'white' }]}>All</Text>
            </TouchableOpacity>
            {allTags.map(t => (
              <TouchableOpacity 
                key={t}
                onPress={() => setSelectedTag(t === selectedTag ? null : t)}
                style={[s.tagChip, selectedTag === t && { backgroundColor: theme.primary, borderColor: theme.primary }]}
              >
                <Text style={[s.tagTxt, selectedTag === t && { color: 'white' }, { color: theme.textMuted }]}>#{t}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              onPress={() => navigation.navigate('EntryViewer', { entry: item })}
              style={[s.entryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <View style={s.entryInfo}>
                <Text style={[s.entryDate, { color: theme.textMuted }]}>
                  {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
                <Text style={[s.entryTitle, { color: theme.text }]} numberOfLines={1}>{item.title || 'Untitled'}</Text>
                <Text style={[s.entryBody, { color: theme.textMuted }]} numberOfLines={2}>{item.body}</Text>
                <View style={s.entryTags}>
                  {item.tags?.map(t => (
                    <Text key={t} style={[s.miniTag, { color: theme.primary }]}>#{t}</Text>
                  ))}
                </View>
              </View>
              <Feather name="chevron-right" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={s.empty}>
              <Feather name="search" size={48} color={theme.bg2} />
              <Text style={[s.emptyTxt, { color: theme.textMuted }]}>No entries found</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 40, borderRadius: 10, gap: 10 },
  input: { flex: 1, fontSize: 15 },
  tagsScrollWrap: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(0,0,0,0.05)' },
  tagsScroll: { paddingHorizontal: 16, gap: 8 },
  tagChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)' },
  tagTxt: { fontSize: 12, fontWeight: '600' },
  entryCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, marginBottom: 12, gap: 12 },
  entryInfo: { flex: 1, gap: 4 },
  entryDate: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  entryTitle: { fontSize: 16, fontWeight: '700' },
  entryBody: { fontSize: 13, lineHeight: 18 },
  entryTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  miniTag: { fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 100, gap: 12 },
  emptyTxt: { fontSize: 14, fontWeight: '500' },
});
