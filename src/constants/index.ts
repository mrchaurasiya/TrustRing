// Constants for the TrustRing app

export const DAYS_OF_WEEK = [
  {id: 0, short: 'Mon', full: 'Monday'},
  {id: 1, short: 'Tue', full: 'Tuesday'},
  {id: 2, short: 'Wed', full: 'Wednesday'},
  {id: 3, short: 'Thu', full: 'Thursday'},
  {id: 4, short: 'Fri', full: 'Friday'},
  {id: 5, short: 'Sat', full: 'Saturday'},
  {id: 6, short: 'Sun', full: 'Sunday'},
];

export const COLORS = {
  // Primary palette — deep teal to cyan
  primary: '#0891B2',
  primaryDark: '#0E7490',
  primaryLight: '#22D3EE',
  primaryGlow: 'rgba(8, 145, 178, 0.15)',

  // Accent — mint/teal for success states
  accent: '#00D4AA',
  accentDark: '#059669',
  accentLight: '#A7F3D0',
  accentGlow: 'rgba(0, 212, 170, 0.12)',

  // Semantic
  danger: '#F43F5E',
  dangerLight: 'rgba(244, 63, 94, 0.12)',
  dangerSurface: '#FFF1F2',
  warning: '#F59E0B',
  warningLight: 'rgba(245, 158, 11, 0.12)',
  success: '#10B981',
  successLight: 'rgba(16, 185, 129, 0.12)',

  // Surfaces — clean whites with subtle warmth
  background: '#F0F4F8',
  surface: '#FFFFFF',
  surfaceAlt: '#F8FAFC',
  surfaceElevated: '#FFFFFF',
  card: '#FFFFFF',

  // Text hierarchy
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textOnPrimary: '#FFFFFF',
  textOnDark: '#E2E8F0',

  // Borders & dividers
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  divider: '#F1F5F9',

  // Other
  shadow: '#0F172A',
  overlay: 'rgba(15, 23, 42, 0.4)',
  white: '#FFFFFF',
  black: '#000000',

  // Gradient endpoints
  gradientStart: '#0891B2',
  gradientEnd: '#0E7490',
  headerGradientStart: '#0C4A6E',
  headerGradientEnd: '#0891B2',

  // Legacy compat
  secondary: '#10B981',
  secondaryDark: '#059669',
};

export const STORAGE_KEYS = {
  BLOCKING_ENABLED: 'blocking_enabled',
  SCHEDULE: 'schedule',
  BLOCKED_LOG: 'blocked_log',
  FIRST_LAUNCH: 'first_launch',
  WHITELIST: 'whitelist',
};

export const DEFAULT_SCHEDULE = {
  startHour: 9,
  startMinute: 0,
  endHour: 20,
  endMinute: 0,
  activeDays: '0,1,2,3,4,5,6',
};
