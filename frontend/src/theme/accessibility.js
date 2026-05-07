import { PixelRatio } from 'react-native';

const rawScale = PixelRatio.getFontScale ? PixelRatio.getFontScale() : 1;
const clampedScale = Math.max(1, Math.min(rawScale, 1.5));

export const fs = (base) => Math.round(base * clampedScale);

export const MIN_BUTTON_HEIGHT = 56;
export const MIN_TOUCH_HEIGHT = 52;

export const A11Y_COLORS = {
  background: '#FFFFFF',
  surface: '#F4F7FB',
  textPrimary: '#111827',
  textSecondary: '#374151',
  textMuted: '#4B5563',
  border: '#6B7280',
  brand: '#0B57D0',
  success: '#1F7A1F',
  danger: '#B91C1C',
};
