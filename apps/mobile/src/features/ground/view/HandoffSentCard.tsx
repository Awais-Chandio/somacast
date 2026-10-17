import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Send } from 'lucide-react-native';
import { size, theme } from '@somacast/core';
import { ICON_STROKE } from '../../../shared/theme/icons';
import { ff, fs } from '../../../shared/theme/typography';
import type { HandoffCardView } from '../model/handoff';

const ICON = size.icon[1]; // 24

// Shown after an AOS once the SBAR handoff has reached the ground. Icon + words; no colour meaning.
export function HandoffSentCard({ view }: { view: HandoffCardView }) {
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${view.title}. ${view.sentText}. ${view.situation} ${view.evidenceText}`}
      testID="handoff-sent-card"
    >
      <View style={styles.head}>
        <Send size={ICON} color={theme.accent} strokeWidth={ICON_STROKE} />
        <Text style={styles.title}>{view.title}</Text>
      </View>
      <Text style={styles.meta}>{view.sentText}</Text>
      <Text style={styles.body}>{view.situation}</Text>
      <Text style={styles.body}>{view.evidenceText}</Text>
      <Text style={styles.meta}>{view.disclaimer}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    gap: 6,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    ...ff.bodyBold,
    color: theme.text,
    fontSize: fs.body,
    letterSpacing: 1,
  },
  meta: { ...ff.body, color: theme.textSecondary, fontSize: fs.small },
  body: {
    ...ff.body,
    color: theme.text,
    fontSize: fs.body,
    lineHeight: fs.body * 1.5,
  },
});
