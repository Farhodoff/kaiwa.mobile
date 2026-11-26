import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { ScreenHeader } from '../components/ScreenHeader';
import { ErrorView, LoadingView } from '../components/StateView';
import { useAsync } from '../hooks/useAsync';
import { supabase } from '../lib/supabase';
import {
  NotificationRow,
  fetchNotifications,
  isValidUuid,
  markNotificationRead,
  notificationIcon,
  seedWelcomeNotification,
} from '../services/progress';
import { useAuth } from '../store/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

const FILTERS = [
  { id: 'all', label: 'Barchasi' },
  { id: 'daily', label: 'Kunlik' },
  { id: 'streak', label: 'Streak' },
  { id: 'achievement', label: 'Yutuqlar' },
] as const;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Hozir';
  if (min < 60) return `${min} daqiqa oldin`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Kecha';
  return `${days} kun oldin`;
}

export default function NotificationsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['id']>('all');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const query = useAsync(async () => {
    await seedWelcomeNotification(userId);
    return fetchNotifications(userId);
  }, [userId]);

  const items: NotificationRow[] = query.data ?? [];
  const visible = items.filter((i) => filter === 'all' || i.type === filter);
  const unreadCount = items.filter((i) => !i.isRead).length;

  const markAllRead = () => {
    void runAction(() =>
      Promise.all(
        items
          .filter((item) => !item.isRead)
          .map((item) => markNotificationRead(userId, item.id)),
      ),
    );
  };

  const toggleRead = (id: string) => {
    void runAction(() => markNotificationRead(userId, id));
  };

  const clearAll = () => {
    if (!isValidUuid(userId)) {
      query.reload();
      return;
    }
    void runAction(async () => {
      const { error } = await supabase
        .from('user_notifications')
        .delete()
        .eq('user_id', userId);
      if (error) throw new Error(error.message);
    });
  };

  /**
   * Wait for the write to finish before reloading, otherwise the list renders
   * the old rows and the unread badge looks broken on slow networks.
   */
  const runAction = async (action: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await action();
      query.reload();
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Amalni bajarib bo‘lmadi. Qayta urinib ko‘ring.',
      );
    } finally {
      setBusy(false);
    }
  };

  if (query.loading) {
    return (
      <View style={styles.container}>
        <LoadingView label="Bildirishnomalar yuklanmoqda…" />
      </View>
    );
  }

  if (query.error) {
    return (
      <View style={styles.container}>
        <ErrorView message={query.error} onRetry={query.reload} />
      </View>
    );
  }

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

      {actionError ? (
        <Pressable
          onPress={() => setActionError(null)}
          accessibilityRole="button"
          accessibilityLabel={`${actionError} Yopish`}
          style={styles.actionError}
        >
          <Ionicons name="alert-circle-outline" size={16} color={colors.accent} />
          <Text style={styles.actionErrorText}>{actionError}</Text>
        </Pressable>
      ) : null}

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
            {visible.map((n) => {
              const unread = !n.isRead;
              const icon = notificationIcon(n.type) as keyof typeof Ionicons.glyphMap;
              return (
              <Pressable key={n.id} onPress={() => toggleRead(n.id)}>
                <Card style={[styles.row, unread && styles.rowUnread]}>
                  <View
                    style={[
                      styles.rowIcon,
                      unread && { backgroundColor: colors.primaryLight },
                    ]}
                  >
                    <Ionicons
                      name={icon}
                      size={19}
                      color={unread ? colors.primary : colors.textMuted}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.rowHead}>
                      <Text style={[styles.rowTitle, unread && { fontWeight: '800' }]}>
                        {n.title}
                      </Text>
                      {unread ? <View style={styles.dot} /> : null}
                    </View>
                    <Text style={styles.rowBody}>{n.message}</Text>
                    <Text style={styles.rowTime}>{timeAgo(n.createdAt)}</Text>
                  </View>
                </Card>
              </Pressable>
              );
            })}
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
  actionError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.xl,
    marginBottom: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  actionErrorText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.accent },
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
