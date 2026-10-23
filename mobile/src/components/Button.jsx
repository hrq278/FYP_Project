import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { colors, radii, touch } from "../theme";
import AppText from "./AppText";

const VARIANTS = {
  primary: { bg: colors.accent, pressed: "#D4930F", text: colors.textPrimary, border: null },
  outline: { bg: "transparent", pressed: colors.primaryTint, text: colors.primary, border: colors.primary },
  neutral: { bg: colors.surface, pressed: colors.surfaceMuted, text: colors.textPrimary, border: colors.border },
  dark: { bg: colors.primary, pressed: colors.primaryDark, text: colors.white, border: null }
};

/**
 * Buttons from spec §2: primary (amber CTA), outline (green border), neutral (white), dark (green).
 * `icon` renders before the label, `trailingIcon` after it (e.g. an arrow).
 */
export default function Button({
  title,
  onPress,
  variant = "primary",
  icon: Icon,
  trailingIcon: Trailing,
  loading = false,
  disabled = false,
  size = "large",
  style,
  accessibilityLabel,
  ...rest
}) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => [
        styles.base,
        { minHeight: size === "large" ? touch.buttonLarge : touch.button, backgroundColor: pressed ? v.pressed : v.bg },
        v.border && { borderWidth: 2, borderColor: v.border },
        inactive && styles.disabled,
        style
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <View style={styles.row}>
          {Icon ? <Icon size={22} color={v.text} strokeWidth={2.4} /> : null}
          <AppText variant={variant === "primary" ? "button" : "bodyLarge"} weight={800} color={v.text}>
            {title}
          </AppText>
          {Trailing ? <Trailing size={22} color={v.text} strokeWidth={2.4} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.button, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  disabled: { opacity: 0.5 }
});
