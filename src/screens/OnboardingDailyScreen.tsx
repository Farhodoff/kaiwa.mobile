import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressBar } from '../components/ProgressBar';

type Props = NativeStackScreenProps<AuthStackParamList, 'OnboardingDaily'>;

const GOALS = [
  { minutes: 10, label: 'Yengil', desc: 'Kuniga 10 daqiqa', icon: 'leaf-outline' },
  { minutes: 20, label: 'Barqaror', desc: 'Kuniga 20 daqiqa', icon: 'flame-outline' },
  { minutes: 30, label: 'Intensiv', desc: 'Kuniga 30 daqiqa', icon: 'rocket-outline' },
  { minutes: 45, label: 'Ekspert', desc: 'Kuniga 45 daqiqa', icon: 'trophy-outline' },
] as const;

export default function OnboardingDailyScreen({ navigation }: Props) {
  const [minutes, setMinutes] = useState(20);

  return (
    <View style={styles.container}>
      <ProgressBar progress={0.66} />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.step}>2 / 3</Text>
        <Text style={styles.title}>Har kuni bir qadam</Text>
        <Text style={styles.subtitle}>
          Kunlik maqsadingizni tanlang. Har kuni 10 daqiqa — katta natija!
        </Text>

        <View style={styles.grid}>
          {GOALS.map((g) => {
            const active = minutes === g.minutes;
            return (
              <Pressable
                key={g.minutes}
                onPress={() => setMinutes(g.minutes)}
                style={[styles.card, active && styles.cardActive]}
              >
                <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
                  <Ionicons
                    name={g.icon as never}
                    size={24}
                    color={active ? colors.white : colors.primary}
                  />
                </View>
                <Text style={styles.cardTitle}>{g.label}</Text>
                <Text style={styles.cardDesc}>{g.desc}</Text>
                {active ? (
                  <View style={styles.check}>
                    <Ionicons name="checkmark" size={14} color={colors.white} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.streakCard}>
          <Ionicons name="flame" size={22} color={colors.warning} />
          <View style={{ flex: 1 }}>
            <Text style={styles.streakTitle}>Streakni saqlang 🔥</Text>
            <Text style={styles.streakDesc}>
              Ketma-ket {minutes} daqiqa — har kuni +20 XP
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          title="Davom etish"
          onPress={() => navigation.navigate('OnboardingReady')}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  card: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  iconWrapActive: { backgroundColor: colors.primary },
  cardTitle: { ...typography.title, marginBottom: 2 },
  cardDesc: { ...typography.caption },
  check: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningLight,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  streakTitle: { ...typography.title },
  streakDesc: { ...typography.caption, marginTop: 2 },
  footer: { padding: spacing.xxl, paddingTop: spacing.md },
});
