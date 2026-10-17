import React from 'react';
import { StyleSheet, View } from 'react-native';
import { copy, modes } from '@somacast/core';
import { useCopy } from '../copy/useCopy';
import { Chip } from './Chip';

// "Space / Earth": switches the wording only. The selected chip shows a tick, not just a colour.
export function ModeToggle() {
  const { mode, setMode } = useCopy();
  return (
    <View style={styles.row}>
      {modes.map(m => (
        <Chip
          key={m}
          label={copy[m].modeName}
          selected={m === mode}
          onPress={() => setMode(m)}
          a11y={`Wording: ${copy[m].modeName}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
