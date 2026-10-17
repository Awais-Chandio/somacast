import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { size, theme, weather } from '@somacast/core';
import { ICON_STROKE, weatherIcons } from '../../../shared/theme/icons';
import { ff, fs } from '../../../shared/theme/typography';
import type { TodayView } from '../model/todayModel';

const ICON_SIZE = size.icon[2]; // 32
const HOLDER_SIZE = size.icon[3]; // 48
const TAG_ICON_SIZE = size.icon[0]; // 16

export function ForecastCard({ view }: { view: TodayView }) {
  const w = weather[view.state];
  const Icon = weatherIcons[w.icon];
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
        {/* Deep Blue holder: the status colours fail contrast on Electric Blue (Rocket Red 2.08:1). */}
        <View style={styles.iconHolder} testID={`weather-icon-${view.state}`}>
          <Icon size={ICON_SIZE} color={w.color} strokeWidth={ICON_STROKE} />
        </View>
        <Text style={styles.word}>{w.label}</Text>
      </View>
      <View style={[styles.stateBar, { backgroundColor: w.color }]} />
      {lowConfidence && (
        <View style={styles.lowTag}>
          <AlertTriangle
            size={TAG_ICON_SIZE}
            color={theme.accent}
            strokeWidth={ICON_STROKE}
            testID="low-confidence-icon"
          />
          <Text style={styles.lowTagText}>LOW CONFIDENCE</Text>
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
  meta: {
    ...ff.body,
    color: theme.text,
    fontSize: fs.small,
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  iconHolder: {
    width: HOLDER_SIZE,
    height: HOLDER_SIZE,
    borderRadius: HOLDER_SIZE / 2,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  word: { ...ff.heading, color: theme.text, fontSize: size.h2 },
  stateBar: { height: 4, borderRadius: 2, marginTop: 12 },
  lowTag: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  lowTagText: { ...ff.bodyBold, color: theme.accent, fontSize: fs.small },
});
