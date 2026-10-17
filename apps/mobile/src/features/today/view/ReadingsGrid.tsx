import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@somacast/core';
import { fs } from '../../../shared/theme/typography';
import type { LatestView } from '../model/todayModel';

export function ReadingsGrid({ readings }: { readings: LatestView[] }) {
  return (
    <View style={styles.grid}>
      {readings.map(r => (
        <View
          key={r.metric}
          style={styles.cell}
          accessible
          accessibilityLabel={`${r.label}: ${r.valueText} ${r.unit}`}
        >
          <Text style={styles.label}>{r.label}</Text>
          <Text style={styles.value}>
            {r.valueText} <Text style={styles.unit}>{r.unit}</Text>
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
  },
  label: { color: theme.textSecondary, fontSize: fs.small },
  value: {
    color: theme.text,
    fontSize: fs.card * 0.8,
    fontWeight: '700',
    marginTop: 4,
  },
  unit: { fontSize: fs.small, fontWeight: '400' },
});
