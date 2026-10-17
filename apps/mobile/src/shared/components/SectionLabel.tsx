import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { theme } from '@somacast/core';
import { ff, fs } from '../theme/typography';

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    ...ff.bodySemi,
    color: theme.textSecondary,
    fontSize: fs.small,
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
  },
});
