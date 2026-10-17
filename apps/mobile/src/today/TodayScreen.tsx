import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  color,
  scenarios,
  simulate,
  size,
  theme,
  weather,
  type Alert,
  type Forecast,
} from '@somacast/core';
import { buildTodayView } from './buildTodayView';

// Brand fonts are not linked into the native projects yet, so headings use system bold for now.
const FONTS_LINKED = false;
const headingFont = FONTS_LINKED
  ? { fontFamily: 'FiraSans-Black' }
  : { fontWeight: '900' as const };

const DAYS = 90;
const CREW = [
  { id: 'C1', name: 'Maya' },
  { id: 'C2', name: 'Kenji' },
  { id: 'C3', name: 'Amara' },
  { id: 'C4', name: 'Luis' },
];
const SCENARIOS = [
  { key: 'normal', label: 'Normal' },
  { key: 'blackoutDecline', label: 'Blackout' },
  { key: 'solarStorm', label: 'Solar storm' },
] as const;
type ScenarioKey = (typeof SCENARIOS)[number]['key'];

// Plain-text icons until an icon set is chosen. The word is always shown next to it.
const weatherIcon: Record<Forecast['state'], string> = {
  clear: '☀️',
  cloudy: '☁️',
  storm: '⛈️',
};
const severityColor: Record<Alert['severity'], string> = {
  low: color.blueYonder,
  medium: color.neonYellow,
  high: color.rocketRed,
};

// Phone-sized steps derived from the brand type scale.
const fs = {
  title: size.h3 * 1.6, // 32
  card: size.h3 * 1.4, // 28
  body: size.body * 0.8, // 16
  small: size.body * 0.7, // 14
};

export function TodayScreen() {
  const [crewId, setCrewId] = useState('C1');
  const [scenario, setScenario] = useState<ScenarioKey>('normal');
  const [day, setDay] = useState(DAYS - 1);

  const sim = useMemo(
    () =>
      simulate({
        seed: 42,
        crewCount: CREW.length,
        days: DAYS,
        startDate: '2027-01-01',
        scenario: scenarios[scenario],
      }),
    [scenario],
  );
  const view = useMemo(
    () => buildTodayView(sim, crewId, day),
    [sim, crewId, day],
  );
  const w = weather[view.state];
  const lowConfidence = view.confidence === 'low';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, headingFont]} accessibilityRole="header">
            SOMACAST
          </Text>
          <Text style={styles.subtitle}>
            Body weather for crews beyond Earth
          </Text>
        </View>
        <View
          style={styles.simBadge}
          accessible
          accessibilityLabel="All values on this screen are simulated data"
        >
          <Text style={styles.simBadgeText}>SIMULATED DATA</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>CREW MEMBER</Text>
        <View style={styles.row}>
          {CREW.map(c => (
            <Chip
              key={c.id}
              label={c.name}
              selected={c.id === crewId}
              onPress={() => setCrewId(c.id)}
              a11y={`Crew member ${c.name}`}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>SCENARIO</Text>
        <View style={styles.row}>
          {SCENARIOS.map(s => (
            <Chip
              key={s.key}
              label={s.label}
              selected={s.key === scenario}
              onPress={() => setScenario(s.key)}
              a11y={`Scenario ${s.label}`}
            />
          ))}
        </View>

        <Text style={styles.sectionLabel}>MISSION DAY</Text>
        <View style={styles.stepper}>
          <StepButton
            label="−"
            a11y="Previous day"
            disabled={day <= 0}
            onPress={() => setDay(d => Math.max(0, d - 1))}
          />
          <Text
            style={styles.stepperValue}
            accessibilityLabel={`Mission day ${day} of ${DAYS - 1}`}
          >
            Day {day}
          </Text>
          <StepButton
            label="+"
            a11y="Next day"
            disabled={day >= DAYS - 1}
            onPress={() => setDay(d => Math.min(DAYS - 1, d + 1))}
          />
        </View>

        <View
          style={[styles.forecastCard, { borderLeftColor: w.color }]}
          accessible
          accessibilityLabel={`72 hour forecast for ${view.crewName}: ${
            w.label
          }.${lowConfidence ? ' Low confidence.' : ''}`}
        >
          <Text style={styles.cardMeta}>
            {view.crewName} · {view.dateLabel}
          </Text>
          <Text style={styles.cardMeta}>NEXT 72 HOURS</Text>
          <View style={styles.forecastRow}>
            <Text style={styles.forecastIcon}>{weatherIcon[view.state]}</Text>
            <Text style={[styles.forecastWord, headingFont]}>{w.label}</Text>
          </View>
          <View style={[styles.stateBar, { backgroundColor: w.color }]} />
          {lowConfidence && (
            <View style={styles.lowTag}>
              <Text style={styles.lowTagText}>⚠ LOW CONFIDENCE</Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionLabel}>WHY</Text>
        {view.reasons.map((r, i) => (
          <Text key={i} style={styles.reason}>
            • {r}
          </Text>
        ))}

        <Text style={styles.sectionLabel}>ALERTS ({view.alerts.length})</Text>
        {view.alerts.length === 0 && (
          <Text style={styles.muted}>No alerts for this day.</Text>
        )}
        {view.alerts.map(a => (
          <View
            key={a.id}
            style={[
              styles.alertCard,
              { borderColor: severityColor[a.severity] },
            ]}
            accessible
            accessibilityLabel={`${a.severityWord} alert. ${a.reason}`}
          >
            <View style={styles.alertTop}>
              <Text style={styles.alertMetric}>{a.metricLabel}</Text>
              <Text style={styles.alertSeverity}>
                {a.severity === 'high' ? '▲▲' : '▲'}{' '}
                {a.severityWord.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.alertValue}>{a.valueText}</Text>
            <Text style={styles.alertDetail}>
              {a.usualText} · {a.zText} · {a.daysText}
            </Text>
          </View>
        ))}

        <Text style={styles.sectionLabel}>LATEST READINGS (SIMULATED)</Text>
        <View style={styles.grid}>
          {view.latest.map(r => (
            <View
              key={r.metric}
              style={styles.cell}
              accessible
              accessibilityLabel={`${r.label}: ${r.valueText} ${r.unit}`}
            >
              <Text style={styles.cellLabel}>{r.label}</Text>
              <Text style={styles.cellValue}>
                {r.valueText} <Text style={styles.cellUnit}>{r.unit}</Text>
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          Decision support only, not a medical device. Thresholds are
          illustrative.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Chip(props: {
  label: string;
  selected: boolean;
  onPress: () => void;
  a11y: string;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      accessibilityRole="button"
      accessibilityLabel={props.a11y}
      accessibilityState={{ selected: props.selected }}
      style={({ pressed }) => [
        styles.chip,
        props.selected && styles.chipSelected,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.chipText, props.selected && styles.chipTextSelected]}
      >
        {props.selected ? '✓ ' : ''}
        {props.label}
      </Text>
    </Pressable>
  );
}

function StepButton(props: {
  label: string;
  a11y: string;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      accessibilityRole="button"
      accessibilityLabel={props.a11y}
      accessibilityState={{ disabled: props.disabled }}
      style={({ pressed }) => [
        styles.stepButton,
        props.disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.stepButtonText}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerText: { flex: 1 },
  title: {
    color: theme.text,
    fontSize: fs.title,
    letterSpacing: fs.title * 0.05,
  },
  subtitle: { color: theme.textSecondary, fontSize: fs.small },
  simBadge: {
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  simBadgeText: {
    color: theme.accent,
    fontSize: fs.small * 0.85,
    fontWeight: '700',
    letterSpacing: 1,
  },
  content: { padding: 16, paddingBottom: 48 },
  sectionLabel: {
    color: theme.textSecondary,
    fontSize: fs.small,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 20,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: size.minTouch,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  chipSelected: { backgroundColor: theme.accent, borderColor: theme.accent },
  chipText: { color: theme.text, fontSize: fs.body, fontWeight: '600' },
  chipTextSelected: { color: theme.onAccent, fontWeight: '700' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepButton: {
    width: size.minTouch,
    height: size.minTouch,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonText: { color: theme.accent, fontSize: fs.card, fontWeight: '700' },
  stepperValue: {
    color: theme.text,
    fontSize: fs.card * 0.8,
    fontWeight: '700',
    minWidth: 96,
    textAlign: 'center',
  },
  forecastCard: {
    marginTop: 24,
    backgroundColor: theme.hero,
    borderRadius: 8,
    borderLeftWidth: 8,
    padding: 16,
  },
  cardMeta: { color: theme.text, fontSize: fs.small, letterSpacing: 0.5 },
  forecastRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  forecastIcon: { fontSize: size.icon[3] },
  forecastWord: { color: theme.text, fontSize: size.h2 },
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
  reason: {
    color: theme.text,
    fontSize: fs.body,
    lineHeight: fs.body * 1.5,
    marginBottom: 4,
  },
  muted: { color: theme.textSecondary, fontSize: fs.body },
  alertCard: {
    borderWidth: 1.5,
    borderLeftWidth: 6,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  alertTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  alertMetric: {
    color: theme.text,
    fontSize: fs.body,
    fontWeight: '700',
    flex: 1,
  },
  alertSeverity: { color: theme.text, fontSize: fs.small, fontWeight: '700' },
  alertValue: {
    color: theme.text,
    fontSize: fs.card,
    fontWeight: '700',
    marginTop: 4,
  },
  alertDetail: { color: theme.textSecondary, fontSize: fs.small, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: {
    flexBasis: '48%',
    flexGrow: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
  },
  cellLabel: { color: theme.textSecondary, fontSize: fs.small },
  cellValue: {
    color: theme.text,
    fontSize: fs.card * 0.8,
    fontWeight: '700',
    marginTop: 4,
  },
  cellUnit: { fontSize: fs.small, fontWeight: '400' },
  footer: {
    color: theme.textSecondary,
    fontSize: fs.small,
    lineHeight: fs.small * 1.5,
    marginTop: 32,
    textAlign: 'center',
  },
});
