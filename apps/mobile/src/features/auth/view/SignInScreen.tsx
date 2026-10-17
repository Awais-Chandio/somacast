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
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, LogIn } from 'lucide-react-native';
import { color, size, theme } from '@somacast/core';
import { ICON_STROKE } from '../../../shared/theme/icons';
import { ff, fs } from '../../../shared/theme/typography';

const ICON = size.icon[1]; // 24

type Props = {
  configured: boolean; // false: no Supabase .env in this build
  busy: boolean;
  error: string | null;
  onSignIn: (email: string, password: string) => void;
  onOffline: () => void;
};

// View: email + password before Today. All checks live in the auth model and controller.
export function SignInScreen({
  configured,
  busy,
  error,
  onSignIn,
  onOffline,
}: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focus, setFocus] = useState<'email' | 'password' | null>(null);
  const submit = () => onSignIn(email, password);

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title} accessibilityRole="header">
            SOMACAST
          </Text>
          <Text style={styles.subtitle}>
            Body weather for crews beyond Earth
          </Text>

          <Text style={styles.h3}>CREW SIGN-IN</Text>

          {configured ? (
            <>
              <Text style={styles.label} nativeID="email-label">
                Email
              </Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                keyboardType="email-address"
                textContentType="username"
                returnKeyType="next"
                editable={!busy}
                onFocus={() => setFocus('email')}
                onBlur={() => setFocus(null)}
                accessibilityLabel="Email"
                accessibilityLabelledBy="email-label"
                placeholder="name@somacast.test"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, focus === 'email' && styles.focused]}
                testID="sign-in-email"
              />

              <Text style={styles.label} nativeID="password-label">
                Password
              </Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={submit}
                editable={!busy}
                onFocus={() => setFocus('password')}
                onBlur={() => setFocus(null)}
                accessibilityLabel="Password"
                accessibilityLabelledBy="password-label"
                style={[styles.input, focus === 'password' && styles.focused]}
                testID="sign-in-password"
              />

              {error && (
                <View
                  style={styles.error}
                  accessible
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                >
                  <AlertTriangle
                    size={ICON}
                    color={color.rocketRed}
                    strokeWidth={ICON_STROKE}
                  />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              <Pressable
                onPress={submit}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
                accessibilityState={{ disabled: busy, busy }}
                style={({ pressed }) => [
                  styles.primary,
                  (pressed || busy) && styles.pressed,
                ]}
                testID="sign-in-submit"
              >
                {busy ? (
                  <ActivityIndicator color={theme.onAccent} />
                ) : (
                  <LogIn
                    size={ICON}
                    color={theme.onAccent}
                    strokeWidth={ICON_STROKE}
                  />
                )}
                <Text style={styles.primaryText}>
                  {busy ? 'SIGNING IN…' : 'SIGN IN'}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.body}>
              This build has no ground database configured (apps/mobile/.env is
              missing). The demo still works offline.
            </Text>
          )}

          <Pressable
            onPress={onOffline}
            disabled={busy}
            accessibilityRole="link"
            accessibilityLabel="Continue offline with the demo ground"
            style={({ pressed }) => [styles.link, pressed && styles.pressed]}
            testID="sign-in-offline"
          >
            <Text style={styles.linkText}>Continue offline (demo ground)</Text>
          </Pressable>

          <Text style={styles.footer}>
            Demo accounts only. All vitals in Somacast are simulated. Decision
            support, not a medical device.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 24, paddingTop: 48, gap: 8 },
  title: {
    ...ff.heading,
    color: theme.text,
    fontSize: fs.title,
    letterSpacing: fs.title * 0.05,
  },
  subtitle: {
    ...ff.body,
    color: theme.textSecondary,
    fontSize: fs.small,
    marginBottom: 32,
  },
  h3: {
    ...ff.bodySemi,
    color: theme.text,
    fontSize: fs.body,
    letterSpacing: 1,
    marginBottom: 8,
  },
  label: { ...ff.bodySemi, color: theme.text, fontSize: fs.body },
  input: {
    ...ff.body,
    minHeight: size.minTouch,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 6,
    color: theme.text,
    fontSize: fs.body,
    marginBottom: 8,
  },
  focused: { borderColor: theme.accent }, // visible focus state (brand rule)
  error: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  errorText: { ...ff.bodySemi, color: theme.text, fontSize: fs.body, flex: 1 },
  primary: {
    minHeight: size.minTouch,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 6,
    backgroundColor: theme.accent,
  },
  primaryText: { ...ff.bodyBold, color: theme.onAccent, fontSize: fs.body },
  body: {
    ...ff.body,
    color: theme.text,
    fontSize: fs.body,
    lineHeight: fs.body * 1.5,
  },
  link: {
    minHeight: size.minTouch,
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: 16,
  },
  linkText: {
    ...ff.bodyBold,
    color: theme.link,
    fontSize: fs.body,
    textDecorationLine: 'underline',
  },
  pressed: { opacity: 0.7 },
  footer: {
    ...ff.body,
    color: theme.textSecondary,
    fontSize: fs.small,
    lineHeight: fs.small * 1.5,
    marginTop: 32,
  },
});
