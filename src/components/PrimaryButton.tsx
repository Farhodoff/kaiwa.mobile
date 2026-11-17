import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type Props = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  small?: boolean;
};

export function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  small,
}: Props) {
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  const containerStyle: ViewStyle[] = [styles.base];
  const textStyle: TextStyle[] = [styles.text];

  if (isPrimary) {
    containerStyle.push(styles.primary);
    textStyle.push(styles.textPrimary);
  } else if (variant === 'secondary') {
    containerStyle.push(styles.secondary);
    textStyle.push(styles.textSecondaryBtn);
  } else if (variant === 'ghost') {
    containerStyle.push(styles.ghost);
    textStyle.push(styles.textGhost);
  } else if (isDanger) {
    containerStyle.push(styles.danger);
    textStyle.push(styles.textPrimary);
  }

  if (small) {
    containerStyle.push(styles.small);
    textStyle.push(styles.textSmall);
  }
  if (disabled) containerStyle.push(styles.disabled);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        ...containerStyle,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.white : colors.primary} />
      ) : (
        <Text style={textStyle}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 54,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
  },
  small: {
    height: 40,
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.primary,
    ...shadow.floating,
  },
  secondary: {
    backgroundColor: colors.primaryLight,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: colors.accent,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
  textPrimary: { color: colors.white },
  textSecondaryBtn: { color: colors.primary },
  textGhost: { color: colors.textSecondary },
  textSmall: { fontSize: 14 },
});
