import { Check } from "lucide-react-native";
import { Pressable, StyleSheet, View } from "react-native";
import { useDirection } from "../hooks/useDirection";
import { borders, colors, radii, shadows, touch } from "../theme";
import AppText from "./AppText";

// Rounded tile holding an icon (spec: icon tiles 14-20 radius, primaryTint background)
export function IconTile({ icon: Icon, size = 56, bg = colors.primaryTint, color = colors.primary, children, style }) {
  return (
    <View style={[styles.iconTile, { width: size, height: size, backgroundColor: bg, borderRadius: size > 60 ? 20 : radii.icon }, style]}>
      {Icon ? <Icon size={Math.round(size * 0.5)} color={color} strokeWidth={2.2} /> : children}
    </View>
  );
}

// Radio-style card: 3dp green border, tinted background, shadow and a check badge when selected
export function SelectCard({ selected, onPress, children, style, accessibilityLabel }) {
  // Physical side chosen by language: RN on phones never swaps left/right, and RN-web doesn't flip start/end
  const { rtl } = useDirection();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[
        styles.selectCard,
        selected ? styles.selectCardOn : styles.selectCardOff,
        selected && shadows.selected,
        style
      ]}
    >
      {children}
      <View style={[styles.badgeSlot, rtl ? { left: 12 } : { right: 12 }]} pointerEvents="none">
        {selected ? (
          <View style={styles.checkBadge}>
            <Check size={18} color={colors.white} strokeWidth={3} />
          </View>
        ) : (
          <View style={styles.emptyRing} />
        )}
      </View>
    </Pressable>
  );
}

// Filter chip / suggestion chip / small info chip
export function Chip({ label, icon: Icon, iconColor, active = false, variant = "filter", onPress, style }) {
  const suggestion = variant === "suggestion";
  const bg = active ? colors.primary : suggestion ? colors.primaryTintSoft : colors.surface;
  const border = active ? colors.primary : suggestion ? colors.primaryTintBorder : colors.border;
  const text = active ? colors.white : suggestion ? "#14532D" : colors.textPrimary;
  const Wrapper = onPress ? Pressable : View;
  return (
    <Wrapper
      onPress={onPress}
      accessibilityRole={onPress ? "button" : undefined}
      accessibilityState={onPress ? { selected: active } : undefined}
      style={[styles.chip, { backgroundColor: bg, borderColor: border }, style]}
    >
      {Icon ? <Icon size={18} color={active ? colors.white : iconColor || colors.primary} strokeWidth={2.4} /> : null}
      <AppText variant="caption" weight={700} color={text}>
        {label}
      </AppText>
    </Wrapper>
  );
}

// Carousel position: active = 28x10 pill, inactive = 10x10 dot
export function PageDots({ count, index }) {
  return (
    <View style={styles.dots} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: count, now: index + 1 }}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dot, i === index ? styles.dotOn : styles.dotOff]} />
      ))}
    </View>
  );
}

// Two-option toggle (e.g. First-time buyer / Experienced)
export function SegmentedToggle({ options, value, onChange }) {
  return (
    <View style={styles.segTrack} accessibilityRole="radiogroup">
      {options.map((o) => {
        const on = o.value === value;
        const Icon = o.icon;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segOption, on && styles.segOn]}
          >
            {Icon ? <Icon size={20} color={on ? colors.white : colors.textPrimary} strokeWidth={2.4} /> : null}
            <AppText variant="body" weight={700} color={on ? colors.white : colors.textPrimary}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// On/off switch: 56x32 track, 26 knob (spec §2)
export function Switch({ value, onValueChange, label }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => onValueChange(!value)}
      style={styles.switchRow}
      hitSlop={8}
    >
      {label ? <AppText variant="body" weight={700} style={styles.switchLabel}>{label}</AppText> : null}
      <View style={[styles.track, { backgroundColor: value ? colors.primary : colors.iconInactive }]}>
        <View style={[styles.knob, value ? styles.knobOn : styles.knobOff]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  iconTile: { alignItems: "center", justifyContent: "center" },
  selectCard: { backgroundColor: colors.surface, borderRadius: radii.card, padding: 16 },
  selectCardOff: { borderWidth: borders.default, borderColor: colors.border },
  selectCardOn: { borderWidth: borders.selected, borderColor: colors.primary, backgroundColor: colors.primaryTintSoft },
  badgeSlot: { position: "absolute", top: 12 },
  checkBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  emptyRing: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: colors.iconInactive },
  chip: {
    minHeight: 44,
    borderRadius: radii.pill,
    borderWidth: 2,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  dots: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center" },
  dot: { height: 10, borderRadius: 5 },
  dotOn: { width: 28, backgroundColor: colors.primary },
  dotOff: { width: 10, backgroundColor: colors.iconInactive },
  segTrack: { flexDirection: "row", backgroundColor: colors.surfaceMuted, borderRadius: radii.button, padding: 4, gap: 4 },
  segOption: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  segOn: { backgroundColor: colors.primary },
  switchRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: touch.min },
  switchLabel: { flex: 1 },
  track: { width: 56, height: 32, borderRadius: 16, justifyContent: "center", paddingHorizontal: 3 },
  knob: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.white },
  knobOn: { alignSelf: "flex-end" },
  knobOff: { alignSelf: "flex-start" }
});
