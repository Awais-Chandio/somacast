import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { size, theme, weather, type Forecast } from '@somacast/core';
import { fs, headingFont } from '../../../shared/theme/typography';
import type { TodayView } from '../model/todayModel';

// Plain-text icons until an icon set is chosen. The word is always shown next to it.
const weatherIcon: Record<Forecast['state'], string> = {
  clear: '☀️',
  cloudy: '☁️',
  storm: '⛈️',
};

export function ForecastCard({ view }: { view: TodayView }) {
  const w = weather[view.state];
  const lowConfidence = view.confidence === 'low';

  return (
    <View
      style={[styles.card, { borderLeftColor: w.color }]}
      accessible
      accessibilityLabel={`72 hour forecast for ${view.crewName}: ${w.label}.${
        lowConfidence ? ' Low confidence.' : ''
      }`}
    >
      <Text style={styles.meta}>
        {view.crewName} · {view.dateLabel}
      </Text>
      <Text style={styles.meta}>NEXT 72 HOURS</Text>
      <View style={styles.row}>
        <Text style={styles.icon}>{weatherIcon[view.state]}</Text>
        <Text style={[styles.word, headingFont]}>{w.label}</Text>
      </View>
      <View style={[styles.stateBar, { backgroundColor: w.color }]} />
      {lowConfidence && (
        <View style={styles.lowTag}>
          <Text style={styles.lowTagText}>⚠ LOW CONFIDENCE</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 24,
    backgroundColor: theme.hero,
    borderRadius: 8,
    borderLeftWidth: 8,
    padding: 16,
  },
  meta: { color: theme.text, fontSize: fs.small, letterSpacing: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  icon: { fontSize: size.icon[3] },
  word: { color: theme.text, fontSize: size.h2 },
  stateBar: { height: 4, borderRadius: 2, marginTop: 12 },
  lowTag: {
    alignSelf: 'flex-start',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lowTagText: { color: theme.accent, fontSize: fs.small, fontWeight: '700' },
});
