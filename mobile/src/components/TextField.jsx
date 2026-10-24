import { Eye, EyeOff } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { colors, fonts, radii, touch, verdictColors } from "../theme";
import AppText from "./AppText";

/**
 * Labelled input (spec §2): optional prefix block such as "PKR" or "+92", password show/hide, error text.
 * Numbers, emails and passwords stay left-to-right inside Urdu screens.
 */
export default function TextField({ label, prefix, error, secure = false, ltr = false, style, inputStyle, ...inputProps }) {
  const { t } = useTranslation();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);
  const borderColor = error ? verdictColors.not_recommended.fill : focused ? colors.primary : colors.border;

  return (
    <View style={style}>
      {label ? (
        <AppText variant="bodyStrong" style={styles.label}>
          {label}
        </AppText>
      ) : null}
      <View style={[styles.box, { borderColor }, focused && styles.focusRing]}>
        {prefix ? (
          <View style={styles.prefix}>
            <AppText variant="bodyStrong" color={colors.primary} latin>
              {prefix}
            </AppText>
          </View>
        ) : null}
        <TextInput
          style={[styles.input, (ltr || secure) && styles.ltr, inputStyle]}
          placeholderTextColor={colors.iconMuted}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={label}
          {...inputProps}
        />
        {secure ? (
          <Pressable
            onPress={() => setHidden((h) => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? t("auth.showPassword") : t("auth.hidePassword")}
            style={styles.eye}
            hitSlop={8}
          >
            {hidden ? <Eye size={22} color={colors.iconMuted} /> : <EyeOff size={22} color={colors.iconMuted} />}
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <AppText variant="caption" color={verdictColors.not_recommended.text} style={styles.error}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { marginBottom: 8 },
  box: {
    minHeight: touch.buttonLarge - 2,
    borderWidth: 2,
    borderRadius: radii.input,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden"
  },
  focusRing: { shadowColor: colors.primary, shadowOpacity: 0.12, shadowRadius: 4, shadowOffset: { width: 0, height: 0 } },
  prefix: {
    alignSelf: "stretch",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceMuted,
    borderEndWidth: 2,
    borderEndColor: colors.border
  },
  // minWidth 0: on web an input keeps its default ~20-character width and pushes the prefix out of narrow boxes
  input: { flex: 1, minWidth: 0, fontSize: 18, fontFamily: fonts.latin[600], color: colors.textPrimary, paddingHorizontal: 12, paddingVertical: 12 },
  ltr: { writingDirection: "ltr", textAlign: "left" },
  eye: { paddingHorizontal: 14, minHeight: touch.min, justifyContent: "center" },
  error: { marginTop: 6 }
});
