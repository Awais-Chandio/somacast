import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { size, theme } from '@somacast/core';
import { fs } from '../theme/typography';

type Props = {
  label: string;
  a11y: string;
  disabled: boolean;
  onPress: () => void;
};

export function StepButton({ label, a11y, disabled, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: size.minTouch,
    height: size.minTouch,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  text: { color: theme.accent, fontSize: fs.card, fontWeight: '700' },
});
