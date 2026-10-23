import { useTranslation } from "react-i18next";
import { Platform, StyleSheet, Text } from "react-native";
import { colors, fonts, typeScale, URDU_LINE_HEIGHT } from "../theme";

/**
 * Text with the app's type scale. In Urdu it switches to Noto Nastaliq Urdu with taller lines so the
 * script isn't clipped. `latin` forces the Latin font (numbers, breed names, emails inside Urdu screens).
 */
export default function AppText({ variant = "body", weight, color = colors.textPrimary, latin = false, align, style, children, ...rest }) {
  const { i18n } = useTranslation();
  const [size, defaultWeight] = typeScale[variant] || typeScale.body;
  const w = weight || defaultWeight;
  const urdu = i18n.language === "ur" && !latin;
  const family = (urdu ? fonts.urdu : fonts.latin)[w] || fonts.latin[w];
  // Phones scale text by the system font size (capped at 1.3x below); the browser has no such setting,
  // so layout checks of large text set globalThis.__FONT_SCALE__ instead
  const scale = Platform.OS === "web" ? globalThis.__FONT_SCALE__ || 1 : 1;
  const lineHeight = Math.round(size * scale * (urdu ? URDU_LINE_HEIGHT : variant === "display" || variant === "h1" ? 1.15 : 1.35));
  // Align to the start of the line. Native RN swaps left/right in RTL, so "left" already means "start";
  // the browser doesn't, so on web Urdu screens use "right" (keeps Latin names aligned with the Urdu text)
  const startAlign = Platform.OS === "web" && i18n.language === "ur" ? "right" : "left";

  return (
    <Text
      style={[
        styles.base,
        { fontSize: Math.round(size * scale * (urdu ? 0.92 : 1)), fontFamily: family, lineHeight, color, textAlign: startAlign },
        variant === "overline" && styles.overline,
        align && { textAlign: align },
        style
      ]}
      maxFontSizeMultiplier={1.3}
      {...rest}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {},
  overline: { letterSpacing: 0.8, textTransform: "uppercase" }
});
