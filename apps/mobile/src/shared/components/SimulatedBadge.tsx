import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@somacast/core';
import { fs } from '../theme/typography';

// Required on every screen that shows vitals: all values are simulated.
export function SimulatedBadge() {
  return (
    <View
      style={styles.badge}
      accessible
      accessibilityLabel="All values on this screen are simulated data"
    >
      <Text style={styles.text}>SIMULATED DATA</Text>
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
    color: theme.accent,
    fontSize: fs.small * 0.85,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
