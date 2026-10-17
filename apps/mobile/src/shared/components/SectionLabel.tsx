import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { theme } from '@somacast/core';
import { fs } from '../theme/typography';

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    color: theme.textSecondary,
    fontSize: fs.small,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
  },
});
