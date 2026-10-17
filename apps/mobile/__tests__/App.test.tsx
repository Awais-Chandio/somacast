/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import App from '../src/app/App';

// The real provider renders nothing until the native side reports insets; the library's mock does.
jest.mock(
  'react-native-safe-area-context',
  () => require('react-native-safe-area-context/jest/mock').default,
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
  expect(texts).toContain('SIMULATED DATA'); // NFR-001
});

// REQ-019: the Space / Earth toggle changes words on the phone, not the forecast.
test('Earth wording: Offline / team member / indoor CO2, same forecast', async () => {
  let root: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(() => {
    root = ReactTestRenderer.create(<App />);
  });
  const r = root!.root;
  const texts = () =>
    r
      .findAllByType(Text)
      .flatMap(n => [n.props.children].flat())
      .filter(c => typeof c === 'string')
      .join('|');
  const press = (label: string) =>
    ReactTestRenderer.act(async () =>
      r
        .find(n => n.props.accessibilityLabel === label && n.props.onPress)
        .props.onPress(),
    );

  await ReactTestRenderer.act(async () =>
    r.findByProps({ testID: 'sign-in-offline' }).props.onPress(),
  );
  const forecast = () =>
    r.findAll(
      n =>
        typeof n.props.accessibilityLabel === 'string' &&
        n.props.accessibilityLabel.startsWith('72 hour forecast'),
    )[0]!.props.accessibilityLabel;
  const forecastSpace = forecast();
  expect(texts()).toContain('Body weather for crews beyond Earth');
  expect(texts()).toContain('LOS');
  expect(texts()).toContain('CREW MEMBER');

  await press('Wording: Earth');
  expect(texts()).toContain('Body weather for teams far from a clinic');
  expect(texts()).toContain('Offline');
  expect(texts()).toContain('TEAM MEMBER');
  expect(texts()).toContain('Indoor CO2 partial pressure');
  expect(texts()).toContain('DAY');
  expect(texts()).not.toMatch(/\bLOS\b|CREW MEMBER|MISSION DAY|Cabin CO2/);
  expect(forecast()).toBe(forecastSpace);

  await press('Wording: Space');
  expect(texts()).toContain('CREW MEMBER');
});
