import React, {
  useState, useRef, useCallback, useMemo, useEffect,
} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Dimensions, StatusBar, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather,  } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useApp } from '../context/AppContext';
import { toDateKey } from '../utils/storage';

const { width: SW } = Dimensions.get('window');
const H_PAD   = 4;
const GAP     = 2;
const CELL_W  = Math.floor((SW - H_PAD * 2 - GAP * 6) / 7);
const CELL_H  = CELL_W + 8;

const MONTHS_LONG = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];
const DAY_LABELS = ['S','M','T','W','T','F','S'];
const MOOD_COLORS = {
  joyful:'#F59E0B', peaceful:'#10B981', grateful:'#3B82F6',
  sad:'#6366F1', anxious:'#EF4444', tender:'#EC4899',
  focused:'#0EA5E9', empty:'#94A3B8', excited:'#F97316',
};

function buildMonth(y, m) {
  return { year: y, month: m, key: `${y}-${m}` };
}

function buildRange(endY, endM, count) {
  const list = [];
  for (let i = count - 1; i >= 0; i--) {
    let m = endM - i, y = endY;
    while (m < 0)  { m += 12; y--; }
    while (m > 11) { m -= 12; y++; }
    list.push(buildMonth(y, m));
  }
  return list;
}

// ── Single day cell — no animations for scroll performance ───────────────────
const DayCell = React.memo(function DayCell({
  day, isToday, isFuture, hasEntry, moodColor, entryCount, accent, theme, onPress, imageUri,
}) {
  const bg = isToday
    ? accent + '20'
    : hasEntry ? moodColor + '15'
    : theme.surface;

  const border = isToday
    ? accent
    : hasEntry ? moodColor + '55'
    : theme.border;

  const numColor = isToday
    ? accent
    : hasEntry ? moodColor
    : theme.textMuted;

  return (
    <TouchableOpacity
      onPress={!isFuture ? onPress : undefined}
      activeOpacity={0.6}
      style={[
        cs.cell,
        {
          width: CELL_W, height: CELL_H,
          backgroundColor: bg,
          borderColor: border,
          borderWidth: isToday ? 1.5 : 1,
          opacity: isFuture ? 0.2 : 1,
        },
      ]}
    >
      {imageUri ? (
        <Image source={{ uri: imageUri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : null}
      
      {isToday ? (
        <View style={[cs.todayBox, { backgroundColor: accent }]}>
          <Text style={cs.todayNum}>{day}</Text>
        </View>
      ) : (
        <Text style={[cs.dayNum, { color: numColor, textShadowColor: imageUri ? 'rgba(0,0,0,0.5)' : 'transparent', textShadowRadius: imageUri ? 2 : 0 }]}>{day}</Text>
      )}

      {hasEntry && !imageUri && (
        <View style={[cs.moodDot, { backgroundColor: moodColor }]} />
      )}

      {entryCount > 1 && (
        <View style={[cs.badge, { backgroundColor: moodColor + '28' }]}>
          <Text style={[cs.badgeTxt, { color: moodColor }]}>{entryCount}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ── Month block — no animation wrapper, renders synchronously ────────────────
const MonthBlock = React.memo(function MonthBlock({
  year, month, todayY, todayM, todayD, entries, accent, theme, onDayPress,
}) {
  const firstDay  = new Date(year, month, 1).getDay();
  const daysCount = new Date(year, month + 1, 0).getDate();

  // Build grid cells
  const cells = [];
  for (let i = 0; i < firstDay; i++)   cells.push({ empty: true, key: `e${i}` });
  for (let d = 1; d <= daysCount; d++) cells.push({ day: d, key: `d${d}` });
  while (cells.length % 7 !== 0)       cells.push({ empty: true, key: `ep${cells.length}` });

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  // Entry count for badge
  let monthCount = 0;
  for (let d = 1; d <= daysCount; d++) {
    const k = toDateKey(year, month, d);
    if (entries[k]) monthCount += entries[k].length;
  }

  return (
    <View style={cs.monthBlock}>
      <View style={cs.monthHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
          <Text style={[cs.monthName, { color: theme.text }]}>
            {MONTHS_LONG[month]}
          </Text>
          {year !== todayY && (
            <Text style={[cs.monthYear, { color: theme.textMuted }]}>{year}</Text>
          )}
        </View>
        {monthCount > 0 && (
          <View style={[cs.monthBadge, { backgroundColor: accent + '18' }]}>
            <Text style={[cs.monthBadgeTxt, { color: accent }]}>
              {monthCount} {monthCount === 1 ? 'entry' : 'entries'}
            </Text>
          </View>
        )}
      </View>

      {rows.map((row, ri) => (
        <View key={ri} style={cs.row}>
          {row.map(cell => {
            if (cell.empty) return (
              <View key={cell.key} style={{ width: CELL_W, height: CELL_H, margin: GAP / 2 }} />
            );

            const dk       = toDateKey(year, month, cell.day);
            const dayEnts  = entries[dk] || [];
            const isToday  = year === todayY && month === todayM && cell.day === todayD;
            const isFuture = new Date(year, month, cell.day) > new Date(todayY, todayM, todayD);
            const mood     = dayEnts[0]?.mood;
            const mc       = (mood && MOOD_COLORS[mood]) || accent;

            return (
              <View key={cell.key} style={{ margin: GAP / 2 }}>
                <DayCell
                  day={cell.day}
                  isToday={isToday}
                  isFuture={isFuture}
                  hasEntry={dayEnts.length > 0}
                  entryCount={dayEnts.length}
                  moodColor={mc}
                  accent={accent}
                  theme={theme}
                  onPress={() => onDayPress(year, month, cell.day, dk)}
                  imageUri={dayEnts[0]?.images?.[0]?.uri}
                />
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
});

// ── Main screen ───────────────────────────────────────────────────────────────
export default function CalendarScreen({ navigation }) {
  const { entries, theme, isReal, isSidebarEnabled, lock } = useApp();
  const accent = theme.primary;

  const today  = useMemo(() => new Date(), []);
  const todayY = today.getFullYear();
  const todayM = today.getMonth();
  const todayD = today.getDate();

  const [months, setMonths] = useState(() => buildRange(todayY, todayM, 4));
  const [currentLabel, setCurrentLabel] = useState(
    `${MONTHS_LONG[todayM]} ${todayY}`
  );

  const listRef  = useRef(null);
  const mounted  = useRef(false);

  // Scroll to bottom on first mount — no animation
  useEffect(() => {
    if (mounted.current) return;
    mounted.current = true;
    const t = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: false });
    }, 100);
    return () => clearTimeout(t);
  }, []);

  function loadMorePast() {
    setMonths(prev => {
      const oldest = prev[0];
      const extra  = [];
      for (let i = 6; i >= 1; i--) {
        let m = oldest.month - i, y = oldest.year;
        while (m < 0) { m += 12; y--; }
        extra.push(buildMonth(y, m));
      }
      return [...extra, ...prev];
    });
  }

  const onDayPress = useCallback((y, m, d, dk) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('EntriesList', { year: y, month: m, day: d, dateKey: dk });
  }, [navigation]);

  const onViewable = useCallback(({ viewableItems }) => {
    if (viewableItems.length > 0) {
      const { year, month } = viewableItems[0].item;
      setCurrentLabel(`${MONTHS_LONG[month]} ${year}`);
    }
  }, []);

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 30 }).current;

  const renderItem = useCallback(({ item }) => (
    <MonthBlock
      year={item.year}
      month={item.month}
      todayY={todayY} todayM={todayM} todayD={todayD}
      entries={entries}
      accent={accent}
      theme={theme}
      onDayPress={onDayPress}
    />
  ), [entries, theme, accent, todayY, todayM, todayD, onDayPress]);

  const keyExtractor = useCallback(item => item.key, []);

  return (
    <SafeAreaView style={[cs.root, { backgroundColor: theme.bg }]} edges={['top']}>
      <StatusBar barStyle={theme.statusBar} />

      {/* Top bar */}
      <View style={[cs.topBar, { borderBottomColor: theme.border }]}>
        {isSidebarEnabled ? (
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            style={cs.menuBtn}
            hitSlop={{ top:10, bottom:10, left:10, right:10 }}
          >
            <View style={cs.menuLines}>
              <View style={[cs.menuLine, { backgroundColor: theme.text, width: 20 }]} />
              <View style={[cs.menuLine, { backgroundColor: theme.text, width: 14 }]} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 14 }} />
        )}

        <View style={cs.labelWrap}>
          <Text style={[cs.monthTxt, { color: theme.text }]}>
            {currentLabel.split(' ')[0]}
          </Text>
          <Text style={[cs.yearTxt, { color: theme.textMuted }]}>
            {' '}{currentLabel.split(' ')[1]}
          </Text>
        </View>

        <View style={cs.topRight}>
          {/* {isReal && (
            <View style={[cs.vaultPill, { backgroundColor: accent + '18' }]}>
              <View style={[cs.vaultDot, { backgroundColor: '#10B981' }]} />
              <Text style={[cs.vaultTxt, { color: accent }]}>Vault</Text>
            </View>
          )} */}

          <TouchableOpacity
            style={{ padding: 6, marginRight: 4,  borderRadius:10, backgroundColor:accent + '15', }}
            onPress={() => {
              if (isReal) {
                // If already in real mode, the shield button locks the app (returns to normal login screen)
                lock();
              } else {
                // If in decoy mode, navigate to Security to unlock real mode
                navigation.navigate('Security', { from: 'calendar' });
              }
            }}
            activeOpacity={0.6}
            hitSlop={{ top:10, bottom:10, left:10, right:10 }}
          >
            <Feather
              name={isReal ? 'shield' : 'log-out'}
              size={18}
              color={accent}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[cs.addBtn, { backgroundColor: accent + '15' }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('Editor', { entry: null });
            }}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color={accent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Day labels */}
      <View style={[cs.dayRow, { borderBottomColor: theme.border }]}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={[
            cs.dayLbl,
            { width: CELL_W, color: i === 0 || i === 6 ? theme.textMuted + '88' : theme.textMuted },
          ]}>
            {d}
          </Text>
        ))}
      </View>

      {/* Calendar list */}
      <FlatList
        ref={listRef}
        data={months}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={viewConfig}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40, paddingTop: 2 }}
        maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
        initialNumToRender={4}
        maxToRenderPerBatch={2}
        windowSize={7}
        removeClippedSubviews={false}
        scrollEventThrottle={250}
        onScroll={e => {
          if (e.nativeEvent.contentOffset.y < 180) loadMorePast();
        }}
      />
    </SafeAreaView>
  );
}

const cs = StyleSheet.create({
  root:  { flex: 1 },
  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 8,
  },
  menuBtn:   { padding: 4 },
  menuLines: { gap: 5 },
  menuLine:  { height: 1.8, borderRadius: 1 },
  labelWrap: { flex: 1, flexDirection: 'row', alignItems: 'baseline', marginLeft: 4 },
  monthTxt:  { fontSize: 21, fontWeight: '700', letterSpacing: -0.5 },
  yearTxt:   { fontSize: 16, fontWeight: '300' },
  topRight:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vaultPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  vaultDot: { width: 5, height: 5, borderRadius: 3 },
  vaultTxt: { fontSize: 11, fontWeight: '700' },
  addBtn: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  dayRow: {
    flexDirection: 'row', paddingHorizontal: H_PAD,
    paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayLbl: {
    textAlign: 'center', fontSize: 10, fontWeight: '600',
    letterSpacing: 0.6, textTransform: 'uppercase',
    marginHorizontal: GAP / 2,
  },
  monthBlock: { paddingHorizontal: H_PAD, paddingBottom: 8, paddingTop: 2 },
  monthHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4, paddingVertical: 10,
  },
  monthName:     { fontSize: 16, fontWeight: '600', letterSpacing: -0.3 },
  monthYear:     { fontSize: 13, fontWeight: '300' },
  monthBadge:    { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  monthBadgeTxt: { fontSize: 10, fontWeight: '700' },
  row:  { flexDirection: 'row' },
  cell: { borderRadius: 6, justifyContent: 'flex-start', alignItems: 'flex-start', overflow: 'hidden' },
  dayNum:   { fontSize: 11, fontWeight: '500', margin: 4 },
  todayBox: { margin: 3, width: 22, height: 22, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  todayNum: { color: 'white', fontSize: 11, fontWeight: '700' },
  moodDot:  { position: 'absolute', bottom: 4, right: 4, width: 5, height: 5, borderRadius: 3 },
  badge:    { position: 'absolute', top: 3, right: 3, borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1, minWidth: 13, alignItems: 'center' },
  badgeTxt: { fontSize: 8, fontWeight: '700' },
});