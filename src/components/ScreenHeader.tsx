import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, typography } from '../theme';

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  /** Show the kaiwa.live wordmark instead of a back arrow. */
  brand?: boolean;
};

export function ScreenHeader({ title, subtitle, onBack, right, brand }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, spacing.sm) + spacing.xs },
      ]}
    >
      <View style={styles.left}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        ) : brand ? (
          <View style={styles.brandRow}>
            <Text style={styles.brand}>kaiwa.live</Text>
            <Text style={styles.brandJa}>日本語</Text>
          </View>
        ) : null}

        <View style={styles.titles}>
          {!brand && <Text style={typography.h2}>{title}</Text>}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  pressed: { opacity: 0.6 },
  titles: { flexShrink: 1 },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  brand: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },
  brandJa: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
});
