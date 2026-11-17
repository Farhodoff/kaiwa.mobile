import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

type Notif = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  time: string;
  type: 'daily' | 'streak' | 'system' | 'achievement';
  unread: boolean;
};

const INITIAL: Notif[] = [
  {
    id: 'n1',
    icon: 'flame',
    title: 'Streak saqlandi! 🔥',
    body: '12 kunlik streakni davom ettiring — bugun 20 daqiqa o\'qing.',
    time: 'Hozir',
    type: 'streak',
    unread: true,
  },
  {
    id: 'n2',
    icon: 'mic',
    title: 'Kaiwa AI suhbatga tayyor',
    body: '"At the café" mavzusida yangi suhbat kutmoqda.',
    time: '2 soat oldin',
    type: 'daily',
    unread: true,
  },
  {
    id: 'n3',
    icon: 'albums',
    title: 'Kartalar muddati keldi',
    body: '18 ta karta takrorlashga tayyor (SM-2).',
    time: 'Bugun 09:00',
    type: 'daily',
    unread: false,
  },
  {
    id: 'n4',
    icon: 'trophy',
    title: 'Yangi yutuq ochildi',
    body: '"Birinchi suhbat" yutuqini qo\'lga kiritdingiz.',
    time: 'Kecha',
    type: 'achievement',
    unread: false,
  },
  {
    id: 'n5',
    icon: 'ribbon',
    title: 'JLPT mock imtihon',
    body: 'Haftalik mock imtihon har payshanba kunida.',
    time: '2 kun oldin',
    type: 'system',
    unread: false,
  },
];

const FILTERS = [
  { id: 'all', label: 'Barchasi' },
  { id: 'daily', label: 'Kunlik' },
  { id: 'streak', label: 'Streak' },
  { id: 'achievement', label: 'Yutuqlar' },
] as const;

export default function NotificationsScreen({ navigation }: Props) {
  const [items, setItems] = useState(INITIAL);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');

  const visible = items.filter((i) => filter === 'all' || i.type === filter);
  const unreadCount = items.filter((i) => i.unread).length;

  const markAllRead = () =>
    setItems((prev) => prev.map((i) => ({ ...i, unread: false })));

  const toggleRead = (id: string) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, unread: !i.unread } : i)),
    );

  const clearAll = () => setItems([]);

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Bildirishnomalar"
        subtitle={unreadCount > 0 ? `${unreadCount} ta o'qilmagan` : "Barchasi o'qilgan"}
        onBack={() => navigation.goBack()}
        right={
          unreadCount > 0 ? (
            <Pressable onPress={markAllRead} hitSlop={8} style={styles.markAll}>
              <Text style={styles.markAllText}>O'qilgan qilish</Text>
            </Pressable>
          ) : null
        }
      />

      {/* Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => setFilter(f.id)}
            style={[styles.filter, filter === f.id && styles.filterActive]}
          >
            <Text
              style={[styles.filterText, filter === f.id && styles.filterTextActive]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {visible.length === 0 ? (
          <Card style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="notifications-off-outline" size={30} color={colors.textMuted} />
            </View>
            <Text style={typography.title}>Bildirishnoma yo'q</Text>
            <Text style={styles.emptySub}>
              Yangi xabarlar paydo bo'lganda shu yerda ko'rinadi
            </Text>
          </Card>
        ) : (
          <View style={styles.list}>
            {visible.map((n) => (
              <Pressable key={n.id} onPress={() => toggleRead(n.id)}>
                <Card style={[styles.row, n.unread && styles.rowUnread]}>
                  <View
                    style={[
                      styles.rowIcon,
                      n.unread && { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name={n.icon}
                      size={19}
                      color={n.unread ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowHead}>
                      <Text style={[styles.rowTitle, n.unread && { fontWeight: '800' }]}>
                        {n.title}
                      </Text>
                      {n.unread ? <View style={styles.dot} /> : null}
                    </View>
                    <Text style={styles.rowBody}>{n.body}</Text>
                    <Text style={styles.rowTime}>{n.time}</Text>
                  </View>
                </Card>
              </Pressable>
            ))}
          </View>
        )}

        {items.length > 0 ? (
          <Pressable onPress={clearAll} style={styles.clear} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={colors.accent} />
            <Text style={styles.clearText}>Barchasini o'chirish</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  markAll: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  markAllText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  filtersScroll: {
    // Keep the horizontal scroller at content height — without this web (RNW)
    // stretches it with flex:1 and blows the chips up to full screen height.
    flexGrow: 0,
    flexShrink: 0,
  },
  filters: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  filter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: colors.white },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
  list: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  rowUnread: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  rowTitle: { ...typography.title, flexShrink: 1 },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  rowBody: { ...typography.caption, marginTop: 4, lineHeight: 17 },
  rowTime: { fontSize: 11, color: colors.textMuted, marginTop: 6, fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: spacing.xxxl },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptySub: { ...typography.caption, marginTop: 6, textAlign: 'center' },
  clear: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: spacing.xl,
    padding: spacing.sm,
  },
  clearText: { fontSize: 13, fontWeight: '700', color: colors.accent },
});
