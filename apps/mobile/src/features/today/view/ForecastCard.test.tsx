import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { AlertTriangle, Cloud, CloudLightning, Sun } from 'lucide-react-native';
import type { Forecast } from '@somacast/core';
import { simulateMission } from '../../../shared/model/simulateMission';
import { ICON_STROKE } from '../../../shared/theme/icons';
import { buildTodayView } from '../model/todayModel';
import { ForecastCard } from './ForecastCard';

const baseView = buildTodayView(simulateMission('normal'), 'C1', 60);

async function render(
  state: Forecast['state'],
  confidence: Forecast['confidence'] = baseView.confidence,
) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <ForecastCard view={{ ...baseView, state, confidence }} />,
    );
  });
  return tree.root;
}

describe('ForecastCard', () => {
  it.each([
    ['clear', Sun, 'Clear'],
    ['cloudy', Cloud, 'Cloudy'],
    ['storm', CloudLightning, 'Storm'],
  ] as const)(
    '%s: line icon at 32 with the shared stroke, plus the word',
    async (state, Icon, word) => {
      const root = await render(state);
      const holder = root.findByProps({ testID: `weather-icon-${state}` });
      const icon = holder.findByType(Icon);
      expect(icon.props.size).toBe(32);
      expect(icon.props.strokeWidth).toBe(ICON_STROKE);

      const texts = root.findAllByType(Text).map(t => t.props.children);
      expect(texts).toContain(word);
    },
  );

  it('low confidence: AlertTriangle line icon plus the words, no emoji', async () => {
    const root = await render('cloudy', 'low');
    const icon = root.findByProps({ testID: 'low-confidence-icon' });
    expect(icon.type).toBe(AlertTriangle);
    expect(icon.props.strokeWidth).toBe(ICON_STROKE);

    const texts = root.findAllByType(Text).map(t => t.props.children);
    expect(texts).toContain('LOW CONFIDENCE');
    expect(JSON.stringify(texts)).not.toContain('⚠');
  });

  it('normal confidence: no low-confidence tag', async () => {
    const root = await render('clear', 'normal');
    expect(root.findAllByProps({ testID: 'low-confidence-icon' })).toHaveLength(
      0,
    );
  });
});
