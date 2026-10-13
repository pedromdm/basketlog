import { colors } from '@basket-log/ui';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Field, Label, font } from '@/components/wizard/kit';
import { useAuth } from '@/lib/auth';

export default function SignInScreen() {
  const { signInWithEmailLink, signInWithPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<string | null>, success?: string) => {
    setBusy(true);
    const error = await action();
    setMessage(error ?? success ?? null);
    setBusy(false);
  };

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.card}>
        <Text style={styles.wordmark}>
          BASKET <Text style={{ color: colors.green }}>LOG</Text>
        </Text>
        <Text style={styles.subtitle}>Sign in to keep score.</Text>

        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" />
        <Button
          label="Email me a sign-in link"
          disabled={busy || !email.includes('@')}
          onPress={() => run(() => signInWithEmailLink(email.trim()), 'Check your email for the sign-in link.')}
        />

        <View style={styles.divider} />
        <Label>Or use a password (local dev account)</Label>
        <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" />
        <Button
          kind="outline"
          label="Sign in"
          disabled={busy || !email.includes('@') || !password}
          onPress={() => run(() => signInWithPassword(email.trim(), password))}
        />

        <View style={styles.divider} />
        <Button kind="outline" label="Continue with Google (soon)" disabled />
        <Button kind="outline" label="Continue with Apple (soon)" disabled />
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, backgroundColor: colors.card, borderRadius: 16, padding: 24, gap: 12, borderWidth: 1.5, borderColor: colors.line },
  wordmark: { fontFamily: font.displayItalic, fontSize: 36, color: colors.ink },
  subtitle: { fontFamily: font.body, fontSize: 15, color: colors.muted, marginBottom: 6 },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 6 },
  message: { fontFamily: font.bodyBold, fontSize: 14, color: colors.ink },
});
