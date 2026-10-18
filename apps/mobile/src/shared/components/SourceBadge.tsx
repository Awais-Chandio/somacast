import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@somacast/core';
import { ff, fs } from '../theme/typography';

type Props = { text: string; a11y: string };

// Required on every screen that shows vitals: says where the values came from
// ("SIMULATED DATA", "IMPORTED DATA (example file)"). The text comes from model/missionData.
export function SourceBadge({ text, a11y }: Props) {
  return (
    <View style={styles.badge} accessible accessibilityLabel={a11y}>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  text: {
    ...ff.bodyBold,
    color: theme.accent,
    fontSize: fs.small * 0.85,
    letterSpacing: 1,
  },
});
