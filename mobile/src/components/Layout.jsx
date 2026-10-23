import { useRouter } from "expo-router";
import { ChevronDown, CircleAlert, Info } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDirection } from "../hooks/useDirection";
import { colors, radii, spacing, touch, warningColors } from "../theme";
import AppText from "./AppText";
import Button from "./Button";

// Off-white screen with safe areas and 20dp side padding; scrolls unless `fixed`
export function Screen({ children, fixed = false, footer, bg = colors.background, contentStyle, edges = ["top", "bottom"] }) {
  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: bg }]} edges={edges}>
      {fixed ? (
        <View style={[styles.content, styles.fill, contentStyle]}>{children}</View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, contentStyle]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      )}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </SafeAreaView>
  );
}

// 48x48 back button; the arrow points the right way in Urdu (RTL)
export function BackButton({ onPress, dark = false, label }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { BackArrow: Arrow } = useDirection();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label || t("common.back")}
      onPress={onPress || (() => router.back())}
      style={({ pressed }) => [styles.back, dark ? styles.backDark : styles.backLight, pressed && { opacity: 0.7 }]}
    >
      <Arrow size={24} color={dark ? colors.white : colors.textPrimary} strokeWidth={2.4} />
    </Pressable>
  );
}

// Back button + title (+ optional subtitle and trailing element)
export function ScreenHeader({ title, subtitle, onBack, right }) {
  return (
    <View style={styles.header}>
      <BackButton onPress={onBack} />
      <View style={styles.headerText}>
        {title ? <AppText variant="title">{title}</AppText> : null}
        {subtitle ? <AppText variant="caption" color={colors.textMuted}>{subtitle}</AppText> : null}
      </View>
      {right}
    </View>
  );
}

// White card, 2dp soft border
export function Card({ children, style, padded = true }) {
  return <View style={[styles.card, padded && styles.cardPad, style]}>{children}</View>;
}

// Neutral or warning banner with an icon (spec §2 InfoBanner)
export function InfoBanner({ text, variant = "neutral", icon }) {
  const warn = variant === "warning";
  const Icon = icon || (warn ? CircleAlert : Info);
  return (
    <View style={[styles.banner, { backgroundColor: warn ? warningColors.bannerBg : colors.surfaceMuted }]}>
      <Icon size={22} color={warn ? warningColors.text : colors.primary} strokeWidth={2.4} />
      <AppText variant="body" weight={700} color={warn ? warningColors.bannerText : colors.textSecondary} style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

// Empty / error state: big illustration tile, title, body, actions (spec §5)
export function EmptyState({ illustration, tileBg = colors.primaryTint, title, body, info, primary, secondary }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyTile, { backgroundColor: tileBg }]}>{illustration}</View>
      <AppText variant="h1" align="center">{title}</AppText>
      {body ? <AppText variant="bodyLarge" weight={500} color={colors.textSecondary} align="center">{body}</AppText> : null}
      {info ? <View style={styles.emptyInfo}>{info}</View> : null}
      <View style={styles.spacer} />
      <View style={styles.emptyActions}>
        {primary ? <Button {...primary} /> : null}
        {secondary ? <Button variant="outline" {...secondary} /> : null}
      </View>
    </View>
  );
}

// Expandable section with a leading icon; chevron turns when open
export function Accordion({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={styles.accordion}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((o) => !o)}
        style={styles.accordionHeader}
      >
        {Icon ? <Icon size={24} color={colors.primary} strokeWidth={2.4} /> : null}
        <AppText variant="cardTitle" weight={800} style={styles.flex}>{title}</AppText>
        <ChevronDown size={24} color={colors.iconMuted} style={{ transform: [{ rotate: open ? "180deg" : "0deg" }] }} />
      </Pressable>
      {open ? <View style={styles.accordionBody}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  fill: { flex: 1 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.screen, paddingVertical: spacing.lg, flexGrow: 1 },
  footer: { paddingHorizontal: spacing.screen, paddingBottom: spacing.lg, paddingTop: spacing.sm },
  back: { width: touch.min, height: touch.min, borderRadius: radii.icon, alignItems: "center", justifyContent: "center" },
  backLight: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
  backDark: { backgroundColor: colors.cameraControl },
  header: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: spacing.lg },
  headerText: { flex: 1 },
  card: { backgroundColor: colors.surface, borderRadius: radii.card, borderWidth: 2, borderColor: colors.borderSoft },
  cardPad: { padding: 16 },
  banner: { borderRadius: radii.button, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  empty: { flex: 1, alignItems: "center", gap: 14, paddingTop: 40 },
  emptyTile: { width: 150, height: 150, borderRadius: 44, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyInfo: { alignSelf: "stretch" },
  spacer: { flex: 1, minHeight: 24 },
  emptyActions: { alignSelf: "stretch", gap: 12 },
  accordion: { backgroundColor: colors.surface, borderRadius: 18, borderWidth: 2, borderColor: colors.borderSoft },
  accordionHeader: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16 },
  accordionBody: { paddingHorizontal: 16, paddingBottom: 16, gap: 8 }
});

// Two-button confirm dialog in the app's style (RN's Alert does nothing on web)
export function ConfirmDialog({ visible, title, body, confirmLabel, cancelLabel, onConfirm, onCancel, destructive = false }) {
  if (!visible) return null;
  return (
    <View style={dialogStyles.backdrop} accessibilityViewIsModal>
      <View style={dialogStyles.box} accessibilityRole="alert">
        <AppText variant="title">{title}</AppText>
        {body ? <AppText variant="body" color={colors.textSecondary}>{body}</AppText> : null}
        <View style={dialogStyles.actions}>
          <Button title={cancelLabel} variant="outline" size="normal" onPress={onCancel} style={dialogStyles.btn} />
          <Button title={confirmLabel} variant={destructive ? "dark" : "primary"} size="normal" onPress={onConfirm} style={dialogStyles.btn} />
        </View>
      </View>
    </View>
  );
}

const dialogStyles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: "rgba(16,21,15,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 50
  },
  box: { alignSelf: "stretch", backgroundColor: colors.surface, borderRadius: 24, padding: 22, gap: 10 },
  actions: { flexDirection: "row", gap: 10, marginTop: 10 },
  btn: { flex: 1 }
});
