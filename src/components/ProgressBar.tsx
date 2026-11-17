import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radius } from '../theme';

type Props = {
  /** 0..1 */
  progress: number;
  color?: string;
  height?: number;
  trackColor?: string;
};

export function ProgressBar({
  progress,
  color = colors.primary,
  height = 8,
  trackColor = colors.divider,
}: Props) {
  const pct = Math.max(0, Math.min(1, progress));
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }]}>
      <View
        style={[
          styles.fill,
          { width: `${pct * 100}%`, backgroundColor: color, height },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fill: {
    borderRadius: radius.pill,
  },
});
