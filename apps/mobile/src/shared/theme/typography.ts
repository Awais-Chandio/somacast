import { font, size } from '@somacast/core';

// Brand fonts are not linked into the native projects yet, so headings use system bold for now.
const FONTS_LINKED = false;
export const headingFont = FONTS_LINKED
  ? { fontFamily: font.heading }
  : { fontWeight: '900' as const };

// Phone-sized steps derived from the brand type scale.
export const fs = {
  title: size.h3 * 1.6, // 32
  card: size.h3 * 1.4, // 28
  body: size.body * 0.8, // 16
  small: size.body * 0.7, // 14
};
