import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@somacast/core';
import { SimulatedBadge } from '../../../shared/components';
import { ff, fs } from '../../../shared/theme/typography';

export function TodayHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.text}>
        <Text style={styles.title} accessibilityRole="header">
          SOMACAST
        </Text>
        <Text style={styles.subtitle}>Body weather for crews beyond Earth</Text>
      </View>
      <SimulatedBadge />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  text: { flex: 1 },
  title: {
    ...ff.heading,
    color: theme.text,
    fontSize: fs.title,
    letterSpacing: fs.title * 0.05,
  },
  subtitle: { ...ff.body, color: theme.textSecondary, fontSize: fs.small },
});
