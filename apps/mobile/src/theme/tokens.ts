const brand = {
  primary: '#4C86F7',
  primaryStrong: '#2563EB',
  primaryDeep: '#17366F',
  primarySoft: '#EAF3FF',
  sky: '#8CC7FF',
  ultraSoft: '#F5F9FF',
  primaryTint: '#CFE0FF',
  background: '#F8FAFD',
  surface: '#FFFFFF',
  textPrimary: '#172033',
  textSecondary: '#697386',
  textMuted: '#8D9AAF',
  border: '#E7ECF3',
  desktopBackground: '#EEF2F7',
  onPrimary: '#FFFFFF',
  overlay: '#172033CC',
  softOverlay: '#FFFFFFF2',
  shadow: '#000000',
  navySurface: '#244B84',
  navyBadge: '#2E5798',
  navyDivider: '#31558D',
  navyText: '#D3E1FA',
  navyTextSoft: '#C9D9F7',
  navyTextBright: '#EAF2FF',
  translucentWhite: '#FFFFFF24',
  warningSoft: '#FFF3D6',
  accentSoft: '#F1F5FF',
  accent: '#6B598E',
  routeSoft: '#DCEAFF',
  danger: '#D64550',
  dangerSoft: '#FFF0F2',
  success: '#19865B',
  successSoft: '#EAF7F0',
  warning: '#986316',
  coral: '#FF8D8D',
  pink: '#FF91AE',
  pinkSoft: '#FFF0F5',
  skeleton: '#E7EDF5',
};

export const colors = {
  ...brand,
  // Compatibility aliases while older feature files move to semantic names.
  canvas: brand.background,
  paper: brand.surface,
  ink: brand.textPrimary,
  secondary: brand.textSecondary,
  muted: brand.textMuted,
  green: brand.primary,
  darkGreen: brand.primaryDeep,
  lime: brand.primaryTint,
  mint: brand.primarySoft,
  lilac: brand.accentSoft,
  butter: brand.warningSoft,
  blue: brand.routeSoft,
  dangerBg: brand.dangerSoft,
};
export const space = { xs: 4, sm: 8, md: 12, lg: 16, page: 20, xl: 24, xxl: 32, xxxl: 40 };
export const radius = { sm: 12, button: 14, input: 14, md: 16, lg: 20, image: 24, sheet: 28, pill: 999 };
export const typography = { hero: 30, title: 24, number: 34, section: 20, body: 15, secondary: 14, caption: 12 };
export const motion = { quick: 160, standard: 240, route: 1500, stagger: 130 };
export const shadow = { floating: { shadowColor: '#172033', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 5 }, elevation: 3 } };
export const zIndex = { content: 0, sticky: 10, navigation: 20, sheet: 30, toast: 40 };
export const iconSize = { small: 16, body: 20, navigation: 24, hero: 32 };
