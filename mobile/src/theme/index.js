// Spacing, radii and shadows from spec §1.3
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  section: 28,
  screen: 20
};

export const radii = {
  pill: 999,
  icon: 14,
  button: 16,
  input: 14,
  card: 20,
  smallCard: 16,
  hero: 24,
  logo: 40
};

export const borders = { default: 2, selected: 3 };

export const touch = { min: 48, button: 56, buttonLarge: 60 };

export const shadows = {
  selected: {
    shadowColor: "#1F5F3A",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  }
};

export { colors, verdictColors, warningColors } from "./colors";
export { fonts, typeScale, URDU_LINE_HEIGHT } from "./type";
