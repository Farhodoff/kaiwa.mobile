import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, spacing, typography } from '../theme';
import { AuthStackParamList } from '../navigation/types';
import { PrimaryButton } from '../components/PrimaryButton';
import { useAuth } from '../store/AuthContext';
import { OAuthProvider, getOAuthUnavailableReason } from '../services/oauth';
import { hasRealBackend } from '../lib/supabase';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;
type Mode = 'signin' | 'signup';

export default function LoginScreen({ navigation }: Props) {
  const { signIn, signUp, signInWithProvider } = useAuth();
  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<OAuthProvider | null>(null);

  const isSignup = mode === 'signup';
  const oauthUnavailable = getOAuthUnavailableReason();

  const submit = async () => {
    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError('Iltimos, email va parolni kiriting');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setError('Parol kamida 6 ta belgidan iborat bo\'lsin');
      return;
    }

    setLoading(true);
    const res = isSignup
      ? await signUp(email, password, name.trim() || undefined)
      : await signIn(email, password);
    setLoading(false);

    if (!res.ok) {
      setError(res.error || 'Xatolik yuz berdi');
      return;
    }

    // Sign-up with email confirmation returns a notice instead of a session.
    if (res.error) {
      setNotice(res.error);
      setMode('signin');
      return;
    }

    // Returning users go straight to the app; only sign-up runs onboarding.
    if (isSignup) {
      navigation.replace('OnboardingLevel');
    } else {
      navigation.replace('Main', { screen: 'Home' });
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const socialSignIn = async (provider: OAuthProvider) => {
    if (socialLoading) return;
    setError(null);
    setNotice(null);
    setSocialLoading(provider);

    const res = await signInWithProvider(provider);
    setSocialLoading(null);

    // Cancelled browser flow — nothing to show.
    if (!res.ok && !res.error) return;
    if (!res.ok) {
      setError(res.error || 'Xatolik yuz berdi');
      return;
    }

    // New accounts run onboarding; returning users go straight in.
    if (res.isNew) {
      navigation.replace('OnboardingLevel');
    } else {
      navigation.replace('Main', { screen: 'Home' });
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandRow}>
          <Text style={styles.brand}>kaiwa.live</Text>
          <Text style={styles.brandJa}>日本語</Text>
        </View>

        <Text style={styles.title}>
          {isSignup ? "Ro'yxatdan o'ting 👋" : 'Yana xush kelibsiz 👋'}
        </Text>
        <Text style={styles.subtitle}>
          {isSignup
            ? "Hisob yarating va o'rganishni boshlang"
            : "Davom etish uchun hisobingizga kiring"}
        </Text>

        {/* Mode switch */}
        <View style={styles.modeRow}>
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => switchMode(m)}
              style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
            >
              <Text
                style={[styles.modeText, mode === m && styles.modeTextActive]}
              >
                {m === 'signin' ? 'Kirish' : "Ro'yxatdan o'tish"}
              </Text>
            </Pressable>
          ))}
        </View>

        {isSignup ? (
          <View style={styles.field}>
            <Ionicons name="person-outline" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.input}
              placeholder="Ismingiz"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        ) : null}

        <View style={styles.field}>
          <Ionicons name="mail-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.field}>
          <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Parol"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={secure}
            value={password}
            onChangeText={setPassword}
          />
          <Pressable onPress={() => setSecure((v) => !v)} hitSlop={10}>
            <Ionicons
              name={secure ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={colors.textMuted}
            />
          </Pressable>
        </View>

        {error ? (
          <View style={[styles.banner, styles.bannerError]}>
            <Ionicons name="alert-circle" size={16} color={colors.accent} />
            <Text style={[styles.bannerText, { color: colors.accent }]}>{error}</Text>
          </View>
        ) : null}

        {notice ? (
          <View style={[styles.banner, styles.bannerOk]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={[styles.bannerText, { color: colors.success }]}>{notice}</Text>
          </View>
        ) : null}

        <PrimaryButton
          title={isSignup ? "Ro'yxatdan o'tish" : 'Kirish'}
          onPress={submit}
          loading={loading}
          style={{ marginTop: spacing.lg }}
        />

        {!isSignup ? (
          <Pressable style={styles.forgot} hitSlop={8}>
            <Text style={styles.forgotText}>Parolni unutdingizmi?</Text>
          </Pressable>
        ) : null}

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>yoki</Text>
          <View style={styles.divider} />
        </View>

        {oauthUnavailable ? (
          <Text style={[styles.backendHint, { marginBottom: spacing.md }]}>{oauthUnavailable}</Text>
        ) : null}

        <Pressable
          style={[styles.socialBtn, (socialLoading !== null || !!oauthUnavailable) && styles.socialBtnDisabled]}
          disabled={socialLoading !== null || !!oauthUnavailable}
          onPress={() => socialSignIn('google')}
        >
          {socialLoading === 'google' ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Ionicons name="logo-google" size={18} color={colors.text} />
          )}
          <Text style={styles.socialText}>
            {socialLoading === 'google' ? 'Kutilmoqda…' : 'Google bilan davom etish'}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.socialBtn, (socialLoading !== null || !!oauthUnavailable) && styles.socialBtnDisabled]}
          disabled={socialLoading !== null || !!oauthUnavailable}
          onPress={() => socialSignIn('apple')}
        >
          {socialLoading === 'apple' ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Ionicons name="logo-apple" size={18} color={colors.text} />
          )}
          <Text style={styles.socialText}>
            {socialLoading === 'apple' ? 'Kutilmoqda…' : 'Apple bilan davom etish'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.guestBtn}
          onPress={() => {
            navigation.replace('Main', { screen: 'Home' });
          }}
        >
          <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.guestBtnText}>Mehmon sifatida kirish</Text>
        </Pressable>

        {isSignup ? (
          <Text style={styles.terms}>
            Davom etish orqali Xizmat shartlari va Maxfiylik siyosatiga
            rozilik bildirasiz.
          </Text>
        ) : (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Hisobingiz yo'qmi? </Text>
            <Pressable onPress={() => switchMode('signup')} hitSlop={8}>
              <Text style={styles.footerLink}>Ro'yxatdan o'tish</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.backendHint}>
          {hasRealBackend
            ? 'Supabase backendiga ulangan'
            : 'Demo rejim — backend ulanmagan'}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  scroll: {
    padding: spacing.xxl,
    paddingTop: spacing.xxxl + spacing.xl,
    flexGrow: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.xxxl,
  },
  brand: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  brandJa: { fontSize: 16, fontWeight: '700', color: colors.primary },
  title: { ...typography.h1, marginBottom: spacing.sm },
  subtitle: { ...typography.bodySecondary, marginBottom: spacing.xl },
  modeRow: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  modeBtnActive: {
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  modeText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  modeTextActive: { color: colors.primary, fontWeight: '800' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    height: 54,
    marginBottom: spacing.md,
  },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 0 },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.xs,
  },
  bannerError: { backgroundColor: '#FFECEC' },
  bannerOk: { backgroundColor: colors.successLight },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600' },
  forgot: { alignSelf: 'center', marginTop: spacing.md, padding: spacing.sm },
  forgotText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { ...typography.small },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    height: 52,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  socialText: { fontSize: 15, fontWeight: '600', color: colors.text },
  socialBtnDisabled: { opacity: 0.6 },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 48,
    borderRadius: radius.pill,
    backgroundColor: colors.divider,
    marginBottom: spacing.md,
  },
  guestBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  terms: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 17,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: { ...typography.bodySecondary },
  footerLink: { ...typography.bodySecondary, color: colors.primary, fontWeight: '700' },
  backendHint: {
    ...typography.small,
    textAlign: 'center',
    marginTop: spacing.xl,
    color: colors.textMuted,
  },
});
