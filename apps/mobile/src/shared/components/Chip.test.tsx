import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Text } from 'react-native';
import { Check } from 'lucide-react-native';
import { ICON_STROKE } from '../theme/icons';
import { Chip } from './Chip';

async function render(selected: boolean) {
  let tree!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(() => {
    tree = ReactTestRenderer.create(
      <Chip label="Maya" selected={selected} onPress={() => {}} a11y="Maya" />,
    );
  });
  return tree.root;
}

describe('Chip', () => {
  it('selected: Check line icon at 16 plus the plain label', async () => {
    const root = await render(true);
    const icon = root.findByProps({ testID: 'chip-check' });
    expect(icon.type).toBe(Check);
    expect(icon.props.size).toBe(16);
    expect(icon.props.strokeWidth).toBe(ICON_STROKE);
    expect(root.findByType(Text).props.children).toBe('Maya');
  });

  it('not selected: no icon', async () => {
    const root = await render(false);
    expect(root.findAllByProps({ testID: 'chip-check' })).toHaveLength(0);
  });
});
