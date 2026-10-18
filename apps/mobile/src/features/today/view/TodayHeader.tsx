import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@somacast/core';
import { SourceBadge } from '../../../shared/components';
import type { SourceLabel } from '../../../shared/model/missionData';
import { useCopy } from '../../../shared/copy/useCopy';
import { ff, fs } from '../../../shared/theme/typography';

// badge: where the values on screen came from (simulated, imported, ...).
export function TodayHeader({ badge }: { badge: SourceLabel }) {
  const { words } = useCopy();
  return (
    <View style={styles.header}>
      <View style={styles.text}>
        <Text style={styles.title} accessibilityRole="header">
          SOMACAST
        </Text>
        <Text style={styles.subtitle}>{words.tagline}</Text>
      </View>
      <SourceBadge text={badge.text} a11y={badge.a11y} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Wraps: a long badge ("IMPORTED DATA (example file)") moves under the tagline instead of
  // squeezing the wordmark.
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  text: { flexGrow: 1, flexShrink: 0 },
  title: {
    ...ff.heading,
    color: theme.text,
    fontSize: fs.title,
    letterSpacing: fs.title * 0.05,
  },
  subtitle: { ...ff.body, color: theme.textSecondary, fontSize: fs.small },
});
