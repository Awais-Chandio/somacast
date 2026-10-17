import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, theme, type Alert } from '@somacast/core';
import { fs } from '../../../shared/theme/typography';
import type { AlertView } from '../model/todayModel';

const severityColor: Record<Alert['severity'], string> = {
  low: color.blueYonder,
  medium: color.neonYellow,
  high: color.rocketRed,
};

// Severity is shown as arrows + word; the border colour only helps.
export function AlertCard({ alert }: { alert: AlertView }) {
  return (
    <View
      style={[styles.card, { borderColor: severityColor[alert.severity] }]}
      accessible
      accessibilityLabel={`${alert.severityWord} alert. ${alert.reason}`}
    >
      <View style={styles.top}>
        <Text style={styles.metric}>{alert.metricLabel}</Text>
        <Text style={styles.severity}>
          {alert.severity === 'high' ? '▲▲' : '▲'}{' '}
          {alert.severityWord.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.value}>{alert.valueText}</Text>
      <Text style={styles.detail}>
        {alert.usualText} · {alert.zText} · {alert.daysText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderLeftWidth: 6,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  metric: {
    color: theme.text,
    fontSize: fs.body,
    fontWeight: '700',
    flex: 1,
  },
  severity: { color: theme.text, fontSize: fs.small, fontWeight: '700' },
  value: {
    color: theme.text,
    fontSize: fs.card,
    fontWeight: '700',
    marginTop: 4,
  },
  detail: { color: theme.textSecondary, fontSize: fs.small, marginTop: 2 },
});
