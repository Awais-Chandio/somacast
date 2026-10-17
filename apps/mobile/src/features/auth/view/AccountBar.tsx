import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LogIn, LogOut, UserRound } from 'lucide-react-native';
import { size, theme } from '@somacast/core';
import { ICON_STROKE } from '../../../shared/theme/icons';
import { ff, fs } from '../../../shared/theme/typography';

const SMALL_ICON = size.icon[0]; // 16

type Props = {
  label: string; // "Maya, crew C1" or "Offline demo"
  action: 'SIGN OUT' | 'SIGN IN';
  onAction: () => void;
};

// Who is using the phone, and the way out (or in, from the offline demo).
export function AccountBar({ label, action, onAction }: Props) {
  const Icon = action === 'SIGN OUT' ? LogOut : LogIn;
  return (
    <View style={styles.bar}>
      <UserRound
        size={SMALL_ICON}
        color={theme.textSecondary}
        strokeWidth={ICON_STROKE}
      />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Pressable
        onPress={onAction}
        accessibilityRole="button"
        accessibilityLabel={action === 'SIGN OUT' ? 'Sign out' : 'Sign in'}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        testID="account-action"
      >
        <Icon size={SMALL_ICON} color={theme.link} strokeWidth={ICON_STROKE} />
        <Text style={styles.buttonText}>{action}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  label: { ...ff.bodySemi, color: theme.text, fontSize: fs.small, flex: 1 },
  button: {
    minHeight: size.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  buttonText: { ...ff.bodyBold, color: theme.link, fontSize: fs.small },
  pressed: { opacity: 0.7 },
});
