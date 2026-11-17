import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import { PrimaryButton } from '../components/PrimaryButton';
import { ProgressBar } from '../components/ProgressBar';

type Props = NativeStackScreenProps<AuthStackParamList, 'OnboardingReady'>;

const FEATURES = [
  {
    icon: 'mic-outline',
    title: 'AI bilan suhbat',
    desc: 'Kaiwa AI bilan yapon tilida gaplashing',
  },
  {
    icon: 'book-outline',
    title: '140+ dars',
    desc: 'Minna no Nihongo asosida tuzilgan',
  },
  {
    icon: 'albums-outline',
    title: 'Aqlli kartalar',
    desc: 'SM-2 usulida takrorlash tizimi',
  },
] as const;

export default function OnboardingReadyScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <ProgressBar progress={1} />
      <View style={styles.body}>
        <View style={styles.hero}>
          <Ionicons name="sparkles" size={40} color={colors.white} />
        </View>
        <Text style={styles.title}>Hamma narsa tayyor! 🎉</Text>
        <Text style={styles.subtitle}>
          Siz uchun quyidagilarni tayyorladik. Keling, boshlaymiz.
        </Text>

        <View style={styles.list}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.row}>
              <View style={styles.rowIcon}>
                <Ionicons name={f.icon as never} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{f.title}</Text>
                <Text style={styles.rowDesc}>{f.desc}</Text>
              </View>
              <Ionicons
                name="checkmark-circle"
                size={22}
                color={colors.success}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          title="Boshlash"
          onPress={() => navigation.replace('Main', { screen: 'Home' })}
        />
        <PrimaryButton
          title="Keyinroq"
          variant="ghost"
          onPress={() => navigation.replace('Main', { screen: 'Home' })}
          style={{ marginTop: spacing.md }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: spacing.xl },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  hero: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { ...typography.h1, textAlign: 'center', marginBottom: spacing.sm },
  subtitle: {
    ...typography.bodySecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 21,
  },
  list: { width: '100%', gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  rowIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { ...typography.title },
  rowDesc: { ...typography.caption, marginTop: 2 },
  footer: { padding: spacing.xxl, paddingTop: spacing.md },
});
