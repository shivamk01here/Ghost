import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';

const { width: SW } = Dimensions.get('window');
const COLUMNS = 3;
const SPACING = 2;
const ITEM_SIZE = (SW - (SPACING * (COLUMNS - 1))) / COLUMNS;

export default function GalleryScreen({ navigation }) {
  const { entries, theme } = useApp();
  
  const allMedia = useMemo(() => {
    const media = [];
    Object.values(entries).flat().forEach(e => {
      const add = (uri, type) => { if (uri) media.push({ uri, type, entry: e }); };
      if (e.video) add(e.video.uri, 'video');
      if (e.images) e.images.forEach(img => add(img.uri, 'image'));
      if (e.blocks) {
        e.blocks.forEach(b => {
          if (b.type === 'collage' && b.images) {
             b.images.forEach(img => add(img.uri, 'image'));
          }
        });
      }
    });
    return media.sort((a,b) => new Date(b.entry.createdAt) - new Date(a.entry.createdAt));
  }, [entries]);

  function renderItem({ item }) {
    return (
      <TouchableOpacity 
        style={{ width: ITEM_SIZE, height: ITEM_SIZE, marginBottom: SPACING, marginRight: SPACING }}
        onPress={() => navigation.navigate('EntryViewer', { entry: item.entry })}
        activeOpacity={0.8}
      >
        <Image source={{ uri: item.uri }} style={{ flex: 1, backgroundColor: theme.surface }} resizeMode="cover" />
        {item.type === 'video' && (
          <View style={st.videoIcon}>
            <Feather name="video" size={12} color="white" />
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={[st.header, { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
           <TouchableOpacity onPress={() => navigation.openDrawer()} style={st.iconBtn}>
             <Feather name="menu" size={20} color={theme.text} />
           </TouchableOpacity>
           <Text style={[st.title, { color: theme.text }]}>Gallery</Text>
           <View style={{ width: 44 }} />
        </View>

        {/* Grid */}
        {allMedia.length === 0 ? (
          <View style={st.empty}>
            <Feather name="image" size={48} color={theme.textMuted} style={{ opacity: 0.3 }} />
            <Text style={{ color: theme.textMuted, marginTop: 16 }}>No photos yet</Text>
          </View>
        ) : (
          <FlatList
            data={allMedia}
            keyExtractor={(_, i) => String(i)}
            numColumns={COLUMNS}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 60,
  },
  iconBtn: {
    width: 44, height: 44, justifyContent: 'center',
  },
  title: {
    flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center', letterSpacing: -0.5,
  },
  videoIcon: {
    position: 'absolute', top: 5, right: 5, backgroundColor: 'rgba(0,0,0,0.5)', padding: 5, borderRadius: 10,
  },
  empty: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
  }
});
