import React from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

type Props = ViewProps & {
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
};

/** White rounded card used across the whole app. */
export function Card({ style, padded = true, children, ...rest }: Props) {
  return (
    <View
      style={[styles.card, padded && styles.padded, style]}
      {...rest}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow.card,
  },
  padded: {
    padding: spacing.lg,
  },
});
