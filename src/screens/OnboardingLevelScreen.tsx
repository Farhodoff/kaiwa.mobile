import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, spacing, typography } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import { LEVELS } from '../data/content';
import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressBar } from '../components/ProgressBar';

type Props = NativeStackScreenProps<AuthStackParamList, 'OnboardingLevel'>;

export default function OnboardingLevelScreen({ navigation }: Props) {
  const [selected, setSelected] = useState<string>('N3');

  return (
    <View style={styles.container}>
      <ProgressBar progress={0.33} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.step}>1 / 3</Text>
        <Text style={styles.title}>Darajangizni tanlang</Text>
        <Text style={styles.subtitle}>
          Hozir qaysi darajada ekanligingizni tanlang — sizga mos darslarni
          ko'rsatamiz.
        </Text>

        <View style={styles.list}>
          {LEVELS.map((lv) => {
            const active = selected === lv.id;
            return (
              <Pressable
                key={lv.id}
                onPress={() => setSelected(lv.id)}
                style={[styles.option, active && styles.optionActive]}
              >
                <View style={[styles.badge, active && styles.badgeActive]}>
                  <Text style={[styles.badgeText, active && styles.badgeTextActive]}>
                    {lv.label}
                  </Text>
                </View>
                <View style={styles.optionBody}>
                  <Text style={styles.optionTitle}>{lv.desc}</Text>
                  <Text style={styles.optionDesc}>
                    ~{lv.words.toLocaleString()} so'z
                  </Text>
                </View>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioDot} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="Davom etish"
          onPress={() => navigation.navigate('OnboardingDaily')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: spacing.xl },
  scroll: { padding: spacing.xxl, paddingBottom: spacing.xxxl },
  step: { ...typography.small, color: colors.primary, marginBottom: spacing.sm },
  title: { ...typography.h1, marginBottom: spacing.sm },
  subtitle: { ...typography.bodySecondary, marginBottom: spacing.xxl, lineHeight: 21 },
  list: { gap: spacing.md },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: { backgroundColor: colors.primary },
  badgeText: { fontSize: 17, fontWeight: '800', color: colors.textSecondary },
  badgeTextActive: { color: colors.white },
  optionBody: { flex: 1 },
  optionTitle: { ...typography.title },
  optionDesc: { ...typography.caption, marginTop: 2 },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  footer: {
    padding: spacing.xxl,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
  },
});
