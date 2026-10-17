import {
  Cloud,
  CloudLightning,
  Sun,
  type LucideIcon,
} from 'lucide-react-native';
import type { weather } from '@somacast/core';

// Brand rule: line icons, one stroke weight everywhere.
export const ICON_STROKE = 2;

type WeatherIconName = (typeof weather)[keyof typeof weather]['icon'];

// Maps the icon names in the weather tokens to Lucide line icons.
export const weatherIcons: Record<WeatherIconName, LucideIcon> = {
  sun: Sun,
  cloud: Cloud,
  'cloud-lightning': CloudLightning,
};
