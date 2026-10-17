import {
  color,
  gradient,
  pattern,
  size,
  theme,
  webFont,
  weather,
} from '@somacast/core';

// Brand tokens from @somacast/core become CSS custom properties, so styles.css never hardcodes a
// colour or a font name. Called once before the first render.
export function applyTokens(root: HTMLElement = document.documentElement) {
  const vars: Record<string, string | number> = {
    '--c-deep-blue': color.deepBlue,
    '--c-electric-blue': color.electricBlue,
    '--c-neon-blue': color.neonBlue,
    '--c-blue-yonder': color.blueYonder,
    '--c-neon-yellow': color.neonYellow,
    '--c-rocket-red': color.rocketRed,
    '--c-martian-red': color.martianRed,
    '--c-white': color.white,
    '--bg': theme.bg,
    '--hero': theme.hero,
    '--text': theme.text,
    '--text-2': theme.textSecondary,
    '--accent': theme.accent,
    '--on-accent': theme.onAccent,
    '--link': theme.link,
    '--link-hover': theme.linkHover,
    '--border': theme.border,
    '--w-clear': weather.clear.color,
    '--w-cloudy': weather.cloudy.color,
    '--w-storm': weather.storm.color,
    '--gradient': `linear-gradient(${gradient.angleDeg}deg, ${gradient.stops
      .map(([at, c]) => `${c} ${at * 100}%`)
      .join(', ')})`,
    '--pattern-opacity': pattern.opacity,
    '--touch': `${size.minTouch}px`,
  };
  for (const [k, f] of Object.entries(webFont)) {
    vars[`--f-${k}`] = f.family;
    vars[`--w-${k}`] = f.weight;
  }
  for (const [k, v] of Object.entries(vars))
    root.style.setProperty(k, String(v));
}
