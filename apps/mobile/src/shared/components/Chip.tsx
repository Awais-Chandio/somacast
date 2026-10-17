import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { size, theme } from '@somacast/core';
import { ff, fs } from '../theme/typography';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  a11y: string;
};

// Selected state is shown by a tick and a fill, not by colour alone.
export function Chip({ label, selected, onPress, a11y }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.selected,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.text, selected && styles.textSelected]}>
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: size.minTouch,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  selected: { backgroundColor: theme.accent, borderColor: theme.accent },
  pressed: { opacity: 0.7 },
  text: { ...ff.bodySemi, color: theme.text, fontSize: fs.body },
  textSelected: { ...ff.bodyBold, color: theme.onAccent },
});
