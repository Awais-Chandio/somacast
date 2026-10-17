import { Cloud, CloudLightning, Sun, type LucideIcon } from 'lucide-react';
import { size, weather, type Forecast } from '@somacast/core';

const ICONS: Record<Forecast['state'], LucideIcon> = {
  clear: Sun,
  cloudy: Cloud,
  storm: CloudLightning,
};

// Weather status is always icon + word; the colour only helps. The word stays white.
export function WeatherStatus({
  state,
  big = false,
}: {
  state: Forecast['state'];
  big?: boolean;
}) {
  const Icon = ICONS[state];
  const w = weather[state];
  const px = big ? size.icon[2] : size.icon[1]; // 32 or 24
  return (
    <span className={`weather weather-${state}${big ? ' weather-big' : ''}`}>
      <Icon size={px} strokeWidth={2} aria-hidden="true" />
      <span>{w.label}</span>
    </span>
  );
}
