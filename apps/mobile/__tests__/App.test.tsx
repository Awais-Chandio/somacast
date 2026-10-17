/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../src/app/App';

// The real provider renders nothing until the native side reports insets; the library's mock does.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// Jest has no .env (see jest.config.js), so the app starts signed out with no backend.
test('starts on sign-in; offline demo opens Today on the demo ground', async () => {
  let root: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    root = ReactTestRenderer.create(<App />);
  });
  const offline = root!.root.findByProps({ testID: 'sign-in-offline' });
  await ReactTestRenderer.act(async () => offline.props.onPress());

  const texts = root!.root
    .findAllByType(Text)
    .flatMap(n => n.props.children)
    .filter(c => typeof c === 'string');
  expect(texts).toContain('Offline demo, no account');
  expect(texts).toContain('offline demo on this phone');
});
