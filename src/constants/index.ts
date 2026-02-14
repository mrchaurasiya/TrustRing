// Constants for the TrustRing app

export const DAYS_OF_WEEK = [
  { id: 0, short: 'Mon', full: 'Monday' },
  { id: 1, short: 'Tue', full: 'Tuesday' },
  { id: 2, short: 'Wed', full: 'Wednesday' },
  { id: 3, short: 'Thu', full: 'Thursday' },
  { id: 4, short: 'Fri', full: 'Friday' },
  { id: 5, short: 'Sat', full: 'Saturday' },
  { id: 6, short: 'Sun', full: 'Sunday' },
];

export const COLORS = {
  primary: '#4F46E5',        // Indigo
  primaryDark: '#3730A3',
  primaryLight: '#818CF8',
  secondary: '#10B981',      // Emerald
  secondaryDark: '#059669',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  warning: '#F59E0B',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  shadow: '#000000',
  success: '#22C55E',
  white: '#FFFFFF',
  black: '#000000',
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
