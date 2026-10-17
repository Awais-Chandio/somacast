import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@somacast/core';
import { ff, fs } from '../../../shared/theme/typography';
import type { ActionView } from '../model/todayModel';

// A coach action: what to do, when, the alert it comes from, and the illustrative label.
export function ActionCard({ action }: { action: ActionView }) {
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${action.whenText}: ${action.text} ${action.fromText}. ${action.label}.`}
    >
      <Text style={styles.when}>{action.whenText.toUpperCase()}</Text>
      <Text style={styles.text}>{action.text}</Text>
      <Text style={styles.meta}>
        {action.fromText} · {action.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    gap: 4,
  },
  when: {
    ...ff.bodyBold,
    color: theme.accent,
    fontSize: fs.small,
    letterSpacing: 1,
  },
  text: {
    ...ff.body,
    color: theme.text,
    fontSize: fs.body,
    lineHeight: fs.body * 1.5,
  },
  meta: { ...ff.body, color: theme.textSecondary, fontSize: fs.small },
});
