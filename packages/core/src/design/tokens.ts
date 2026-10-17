// Somacast design tokens.
// Source: NASA Space Apps Brand Guidelines (updated June 25, 2026).
// Shared by apps/mobile (React Native) and apps/web (Vite).

export const color = {
  blueYonder: '#2E96F5', // secondary text on Deep Blue, chart accents
  neonBlue: '#0960E1', // links / secondary buttons on white
  electricBlue: '#0042A6', // hero panels, gradient start
  deepBlue: '#07173F', // default background, gradient end
  rocketRed: '#E43700', // large text, icons, borders only (white on it = 4.33:1)
  martianRed: '#8E1100', // dark red fill with white text (9.42:1)
  neonYellow: '#EAFE07', // ACCENT ONLY: buttons, highlights, icons. Never a background panel.
  white: '#FFFFFF',
} as const;

// Semantic roles. Body text only on deepBlue, electricBlue or white.
export const theme = {
  bg: color.deepBlue,
  surface: color.deepBlue,
  hero: color.electricBlue,
  text: color.white,
  textSecondary: color.blueYonder, // only on deepBlue (5.65:1)
  accent: color.neonYellow,
  onAccent: color.deepBlue, // button label (15.52:1)
  link: color.neonYellow,
  linkHover: color.rocketRed,
  border: 'rgba(255,255,255,0.22)',
} as const;

// Gradient: linear, top-left Electric Blue to bottom-right Deep Blue, eased.
export const gradient = {
  angleDeg: 135,
  stops: [
    [0.0, '#0042A6'],
    [0.2, '#013E9B'],
    [0.4, '#023382'],
    [0.6, '#052663'],
    [0.8, '#061B4A'],
    [1.0, '#07173F'],
  ],
} as const;

// Weather status: ALWAYS icon + word, colour is only a helper.
export const weather = {
  clear: { label: 'Clear', icon: 'sun', color: color.blueYonder },
  cloudy: { label: 'Cloudy', icon: 'cloud', color: color.neonYellow },
  storm: { label: 'Storm', icon: 'cloud-lightning', color: color.rocketRed },
} as const;

export const font = {
  heading: 'FiraSans-Black',
  headingBold: 'FiraSans-Bold',
  body: 'Overpass-Regular',
  bodySemi: 'Overpass-SemiBold',
  bodyBold: 'Overpass-Bold',
  bodyItalic: 'Overpass-Italic',
  code: 'FiraCode-Regular',
} as const;

// Reference sizes from the guide (px). Scale down for small phones.
export const size = {
  h1: 60,
  h2: 42,
  h3: 20,
  body: 20,
  button: 24,
  minTouch: 48,
  icon: [16, 24, 32, 48],
} as const;

export const pattern = {
  opacity: 0.25,
} as const;
