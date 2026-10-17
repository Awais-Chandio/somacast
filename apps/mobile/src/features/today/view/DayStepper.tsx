import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@somacast/core';
import { StepButton } from '../../../shared/components';
import { fs } from '../../../shared/theme/typography';

type Props = {
  day: number;
  maxDay: number;
  onPrev: () => void;
  onNext: () => void;
};

export function DayStepper({ day, maxDay, onPrev, onNext }: Props) {
  return (
    <View style={styles.stepper}>
      <StepButton
        label="−"
        a11y="Previous day"
        disabled={day <= 0}
        onPress={onPrev}
      />
      <Text
        style={styles.value}
        accessibilityLabel={`Mission day ${day} of ${maxDay}`}
      >
        Day {day}
      </Text>
      <StepButton
        label="+"
        a11y="Next day"
        disabled={day >= maxDay}
        onPress={onNext}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  value: {
    color: theme.text,
    fontSize: fs.card * 0.8,
    fontWeight: '700',
    minWidth: 96,
    textAlign: 'center',
  },
});
