export const COLORS = {
  primary:       '#9B5BC4',
  primaryDark:   '#7A3FA3',
  primaryLight:  '#C49DD6',
  primaryGhost:  'rgba(155, 91, 196, 0.12)',

  bgLight:       '#F8F5FC',
  bgLight2:      '#F0EBF8',
  surfaceLight:  '#FFFFFF',
  surface2Light: '#EDE0F8',
  borderLight:   'rgba(155, 91, 196, 0.15)',

  bgDark:        '#120A22',
  bgDark2:       '#1A0F2E',
  surfaceDark:   '#231540',
  surface2Dark:  '#2D1A50',
  borderDark:    'rgba(155, 91, 196, 0.28)',

  textDark:      '#120A22',
  textDark2:     '#3D2B60',
  textMuted:     '#7A6B96',
  textMutedDark: '#9B8AB8',
  textLight:     '#F0EBF8',
  textLight2:    '#C8BAE8',

  white:   '#FFFFFF',
  black:   '#000000',
  error:   '#EF4444',
  success: '#10B981',
};

export const MOODS = [
  { key: 'joyful',   label: 'Joyful',   color: '#F59E0B', emoji: '😊', icon: 'sun'          },
  { key: 'peaceful', label: 'Peaceful', color: '#10B981', emoji: '😌', icon: 'feather'       },
  { key: 'grateful', label: 'Grateful', color: '#3B82F6', emoji: '🙏', icon: 'heart'         },
  { key: 'sad',      label: 'Sad',      color: '#6366F1', emoji: '😢', icon: 'cloud-rain'    },
  { key: 'anxious',  label: 'Anxious',  color: '#EF4444', emoji: '😰', icon: 'zap'           },
  { key: 'tender',   label: 'Tender',   color: '#EC4899', emoji: '🥰', icon: 'anchor'        },
  { key: 'focused',  label: 'Focused',  color: '#0EA5E9', emoji: '🧐', icon: 'target'        },
  { key: 'empty',    label: 'Empty',    color: '#94A3B8', emoji: '😶', icon: 'minus-circle'  },
  { key: 'excited',  label: 'Excited',  color: '#F97316', emoji: '🤩', icon: 'star'          },
];

export const PRESET_COLORS = [
  '#9B5BC4', '#7C3AED', '#3B82F6', '#10B981',
  '#F59E0B', '#EF4444', '#EC4899', '#0EA5E9',
  '#8B5CF6', '#14B8A6', '#F97316', '#6366F1',
];

export function buildTheme(isDark = false, primaryColor = COLORS.primary) {
  return {
    isDark,
    primary:   primaryColor,
    bg:        isDark ? COLORS.bgDark2       : COLORS.bgLight,
    bg2:       isDark ? COLORS.bgDark        : COLORS.bgLight2,
    surface:   isDark ? COLORS.surfaceDark   : COLORS.surfaceLight,
    surface2:  isDark ? COLORS.surface2Dark  : COLORS.surface2Light,
    border:    isDark ? COLORS.borderDark    : COLORS.borderLight,
    text:      isDark ? COLORS.textLight     : COLORS.textDark,
    text2:     isDark ? COLORS.textLight2    : COLORS.textDark2,
    textMuted: isDark ? COLORS.textMutedDark : COLORS.textMuted,
    statusBar: isDark ? 'light-content'      : 'dark-content',
    fonts: {
      regular: { fontFamily: 'System', fontWeight: '400' },
      medium:  { fontFamily: 'System', fontWeight: '500' },
      bold:    { fontFamily: 'System', fontWeight: '700' },
      heavy:   { fontFamily: 'System', fontWeight: '900' },
    },
  };
}