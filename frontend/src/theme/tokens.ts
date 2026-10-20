export const THEME = {
  colors: {
    sidebar: {
      bg: '#161E16',
      card: '#202C1F',
      cardBorder: '#2A3A29',
      activeItem: '#283727',
      hoverItem: '#1E2A1D',
      textMuted: '#8A9E88',
      textActive: '#FFFFFF'
    },
    canvas: {
      bg: '#FBF9F5',
      surface: '#FFFFFF',
      border: '#E8E3D9',
      subtle: '#F6F3EC'
    },
    primary: {
      main: '#D85836',
      hover: '#C44422',
      light: '#FDF4F0'
    },
    accent: {
      emerald: '#255E3E',
      emeraldBg: '#EAF4EE',
      emeraldBorder: '#C2E2CF',
      amber: '#B45309',
      amberBg: '#FEF3C7'
    }
  }
} as const;

export type ThemeColors = typeof THEME;
