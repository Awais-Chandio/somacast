import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MessageSquare } from 'lucide-react-native';
import { size, theme, type Copy, type UplinkNote } from '@somacast/core';
import { SectionLabel } from '../../../shared/components';
import { useCopy } from '../../../shared/copy/useCopy';
import { ICON_STROKE } from '../../../shared/theme/icons';
import { ff, fs } from '../../../shared/theme/typography';
import type { GroundNotes as GroundNotesState } from '../controller/useGroundNotes';
import { utcTime } from '../model/handoff';

const ICON = size.icon[0]; // 16

// One note from the flight surgeon. Plain text only: <Text> never interprets markup.
export function GroundNoteCard({ note }: { note: UplinkNote }) {
  const time = utcTime(note.createdAt);
  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`From the ground, ${note.author}, ${time}: ${note.text}`}
      testID="ground-note"
    >
      <View style={styles.head}>
        <MessageSquare
          size={ICON}
          color={theme.accent}
          strokeWidth={ICON_STROKE}
        />
        <Text style={styles.author}>{note.author}</Text>
        <Text style={styles.time}>{time}</Text>
      </View>
      <Text style={styles.text}>{note.text}</Text>
    </View>
  );
}

function statusText(s: GroundNotesState, words: Copy): string | null {
  if (s.phase === 'loading') return 'Checking for notes from the ground…';
  if (s.phase === 'error') return s.error;
  if (s.notes.length > 0) return null;
  return s.phase === 'idle'
    ? `Notes from the ${words.doctor} arrive ${words.nextLinkUp}.`
    : 'No notes from the ground yet.';
}

export function GroundNotes({ state }: { state: GroundNotesState }) {
  const { words } = useCopy();
  const status = statusText(state, words);
  return (
    <>
      <SectionLabel>FROM THE GROUND ({state.notes.length})</SectionLabel>
      {status && (
        <Text style={styles.status} accessibilityLiveRegion="polite">
          {status}
        </Text>
      )}
      {state.notes.map(n => (
        <GroundNoteCard key={n.id} note={n} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderLeftColor: theme.accent,
    borderLeftWidth: 6,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    gap: 6,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  author: { ...ff.bodyBold, color: theme.text, fontSize: fs.body },
  time: {
    ...ff.body,
    color: theme.textSecondary,
    fontSize: fs.small,
    marginLeft: 'auto',
  },
  text: {
    ...ff.body,
    color: theme.text,
    fontSize: fs.body,
    lineHeight: fs.body * 1.5,
  },
  status: { ...ff.body, color: theme.textSecondary, fontSize: fs.body },
});
