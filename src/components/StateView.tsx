import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { PrimaryButton } from './PrimaryButton';

export function LoadingView({ label = 'Yuklanmoqda…' }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function ErrorView({
  message = 'Maʼlumotni yuklab boʻlmadi',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Ionicons name="cloud-offline-outline" size={30} color={colors.textMuted} />
      </View>
      <Text style={styles.title}>Ulanishda xatolik</Text>
      <Text style={styles.label}>{message}</Text>
      {onRetry ? (
        <PrimaryButton title="Qayta urinish" onPress={onRetry} style={styles.btn} />
      ) : null}
    </View>
  );
}

export function EmptyView({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.label}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
    gap: spacing.sm,
    backgroundColor: colors.bg,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    backgroundColor: colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: { ...typography.title, textAlign: 'center' },
  label: { ...typography.bodySecondary, textAlign: 'center' },
  btn: { marginTop: spacing.lg, minWidth: 200 },
});
