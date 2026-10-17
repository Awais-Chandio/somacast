import type { TextStyle } from 'react-native';
import { font, size } from '@somacast/core';

// Brand fonts are linked from assets/fonts (see react-native.config.js).
// Set to false to fall back to system font weights, e.g. on a build without the fonts.
const FONTS_LINKED = true;

// One face per brand role. With custom fonts the weight lives in the file itself,
// so no fontWeight is set (Android would otherwise fake-bold an already bold face).
function face(family: string, fallback: TextStyle): TextStyle {
  return FONTS_LINKED ? { fontFamily: family } : fallback;
}

export const ff = {
  heading: face(font.heading, { fontWeight: '900' }),
  headingBold: face(font.headingBold, { fontWeight: '700' }),
  body: face(font.body, { fontWeight: '400' }),
  bodySemi: face(font.bodySemi, { fontWeight: '600' }),
  bodyBold: face(font.bodyBold, { fontWeight: '700' }),
  bodyItalic: face(font.bodyItalic, { fontStyle: 'italic' }),
  code: face(font.code, { fontFamily: 'monospace' }),
} as const;

// Phone-sized steps derived from the brand type scale.
export const fs = {
  title: size.h3 * 1.6, // 32
  card: size.h3 * 1.4, // 28
  body: size.body * 0.8, // 16
  small: size.body * 0.7, // 14
};
