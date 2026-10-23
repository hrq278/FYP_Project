// Typography from spec §1.2. Latin: Plus Jakarta Sans. Urdu: Noto Nastaliq Urdu with ~1.9x line height,
// because Nastaliq glyphs are tall and get clipped with Latin line heights.

export const fonts = {
  latin: {
    400: "PlusJakartaSans_400Regular",
    500: "PlusJakartaSans_500Medium",
    600: "PlusJakartaSans_600SemiBold",
    700: "PlusJakartaSans_700Bold",
    800: "PlusJakartaSans_800ExtraBold"
  },
  urdu: {
    400: "NotoNastaliqUrdu_400Regular",
    500: "NotoNastaliqUrdu_500Medium",
    600: "NotoNastaliqUrdu_600SemiBold",
    700: "NotoNastaliqUrdu_700Bold",
    800: "NotoNastaliqUrdu_700Bold"
  }
};

export const URDU_LINE_HEIGHT = 1.9;

// [fontSize, weight]
export const typeScale = {
  display: [44, 800],
  h1: [28, 800],
  title: [22, 800],
  section: [21, 800],
  cardTitle: [18, 800],
  bodyLarge: [17, 600],
  body: [16, 500],
  bodyStrong: [16, 700],
  caption: [14, 600],
  small: [13, 700],
  overline: [12, 800],
  button: [19, 800]
};
