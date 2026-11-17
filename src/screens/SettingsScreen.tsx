import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { RootStackParamList } from '../navigation/types';
import { Card } from '../components/Card';
import { PrimaryButton } from '../components/PrimaryButton';
import { ScreenHeader } from '../components/ScreenHeader';
import { USER } from '../data/content';
import { useApp } from '../store/AppContext';
import { useAuth } from '../store/AuthContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export default function SettingsScreen({ navigation }: Props) {
  const {
    xp,
    streak,
    notifications,
    sound,
    setNotifications,
    setSound,
    resetSession,
    level,
  } = useApp();
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    resetSession();
    // Reset BOTH levels: the root stack back to Auth and the nested auth
    // stack to Login — otherwise the previous Main state stays mounted.
    navigation.reset({
      index: 0,
      routes: [
        {
          name: 'Auth',
          state: { index: 0, routes: [{ name: 'Login' as const }] },
        },
      ],
    });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Sozlamalar" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <Card style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {(user?.name || USER.name).charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={typography.title}>{user?.name || USER.name}</Text>
            <Text style={styles.profileMeta}>
              {user?.email || `${level} · ${streak} kunlik streak`}
            </Text>
          </View>
          <Pressable style={styles.editBtn} hitSlop={8}>
            <Text style={styles.editText}>Tahrirlash</Text>
          </Pressable>
        </Card>

        {/* Stats */}
        <View style={styles.miniStats}>
          <MiniStat label="XP" value={`${xp}`} />
          <MiniStat label="Streak" value={`${streak} kun`} />
          <MiniStat label="Daraja" value={level} />
        </View>

        {/* Preferences */}
        <Text style={styles.section}>Umumiy</Text>
        <Card padded={false}>
          <Row
            icon="notifications-outline"
            label="Bildirishnomalar"
            right={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.white}
              />
            }
          />
          <Divider />
          <Row
            icon="volume-high-outline"
            label="Ovoz effektlari"
            right={
              <Switch
                value={sound}
                onValueChange={setSound}
                trackColor={{ true: colors.primary, false: colors.border }}
                thumbColor={colors.white}
              />
            }
          />
          <Divider />
          <Row
            icon="language-outline"
            label="Ilova tili"
            value="O'zbek"
            chevron
          />
          <Divider />
          <Row
            icon="moon-outline"
            label="Tungi rejim"
            value="Tez orada"
            chevron
            muted
          />
        </Card>

        {/* Account */}
        <Text style={styles.section}>Hisob</Text>
        <Card padded={false}>
          <Row icon="notifications-outline" label="Bildirishnomalar" chevron onPress={() => navigation.navigate('Notifications')} />
          <Divider />
          <Row icon="stats-chart-outline" label="Progress statistikasi" chevron onPress={() => navigation.navigate('Progress')} />
          <Divider />
          <Row icon="person-outline" label="Profil ma'lumotlari" chevron />
          <Divider />
          <Row icon="card-outline" label="Obuna holati" value="Bepul" chevron />
          <Divider />
          <Row icon="help-circle-outline" label="Yordam markazi" chevron />
          <Divider />
          <Row icon="document-text-outline" label="Maxfiylik siyosati" chevron />
        </Card>

        <PrimaryButton
          title="Sessiyani qayta tiklash"
          variant="ghost"
          onPress={resetSession}
          style={{ marginTop: spacing.xl }}
        />
        <PrimaryButton
          title="Chiqish"
          variant="danger"
          onPress={handleSignOut}
          style={{ marginTop: spacing.md }}
        />

        <Text style={styles.version}>kaiwa.live v1.3.1 · Made with 💜</Text>
      </ScrollView>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  right,
  chevron,
  muted,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  right?: React.ReactNode;
  chevron?: boolean;
  muted?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={[styles.rowLabel, muted && { color: colors.textMuted }]}>
        {label}
      </Text>
      {value ? (
        <Text style={[styles.rowValue, muted && { color: colors.textMuted }]}>
          {value}
        </Text>
      ) : null}
      {right}
      {chevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      ) : null}
    </Pressable>
  );
}

const Divider = () => <View style={styles.divider} />;

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniStatValue}>{value}</Text>
      <Text style={styles.miniStatLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.white, fontSize: 22, fontWeight: '800' },
  profileMeta: { ...typography.caption, marginTop: 3 },
  editBtn: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  editText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  miniStats: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  miniStat: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  miniStatValue: { fontSize: 16, fontWeight: '800', color: colors.primary },
  miniStatLabel: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  section: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 54,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '500' },
  rowValue: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.divider, marginLeft: 68 },
  version: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xl,
    color: colors.textMuted,
  },
});
