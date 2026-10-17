import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stethoscope } from 'lucide-react-native';
import { size, theme } from '@somacast/core';
import { ICON_STROKE } from '../../../shared/theme/icons';
import { ff, fs } from '../../../shared/theme/typography';
import { AccountBar } from './AccountBar';

type Props = {
  label: string;
  title: string;
  message: string;
  onSignOut: () => void;
};

// Shown when a valid account cannot use the crew phone app, e.g. a flight surgeon
// (the surgeon works from the ground console, Phase 8).
export function AccountNotice({ label, title, message, onSignOut }: Props) {
  return (
    <SafeAreaView style={styles.screen}>
      <AccountBar label={label} action="SIGN OUT" onAction={onSignOut} />
      <Stethoscope
        size={size.icon[3]}
        color={theme.textSecondary}
        strokeWidth={ICON_STROKE}
        style={styles.icon}
      />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.body}>{message}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  icon: { marginTop: 48, marginHorizontal: 24 },
  title: {
    ...ff.bodySemi,
    color: theme.text,
    fontSize: fs.body,
    letterSpacing: 1,
    marginTop: 16,
    marginHorizontal: 24,
  },
  body: {
    ...ff.body,
    color: theme.text,
    fontSize: fs.body,
    lineHeight: fs.body * 1.5,
    marginTop: 8,
    marginHorizontal: 24,
  },
});
