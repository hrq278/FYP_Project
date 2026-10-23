import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Image, Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useDirection } from "../hooks/useDirection";
import { colors, radii, verdictColors } from "../theme";
import AppText from "./AppText";
import { CattleHeadIcon } from "./Illustrations";

const VERDICT_ICON = { recommended: CheckCircle2, caution: AlertTriangle, not_recommended: XCircle };

// Verdict pill: icon + label, never colour alone. `large` = solid badge on the Result screen
export function VerdictBadge({ verdict, large = false }) {
  const { t } = useTranslation();
  const c = verdictColors[verdict];
  if (!c) return null;
  const Icon = VERDICT_ICON[verdict];
  return (
    <View style={[styles.badge, large ? { backgroundColor: c.fill, paddingVertical: 10, paddingHorizontal: 16 } : { backgroundColor: c.bg }]}>
      <Icon size={large ? 24 : 18} color={large ? colors.white : c.fill} strokeWidth={2.6} />
      <AppText variant={large ? "title" : "small"} weight={800} color={large ? colors.white : c.text}>
        {t(`verdict.${verdict}`)}
      </AppText>
    </View>
  );
}

// 88dp ring, 9dp stroke, starts at 12 o'clock; colour follows the verdict
export function ScoreRing({ score, verdict, size = 88 }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const value = Math.max(0, Math.min(100, score || 0));
  const color = verdictColors[verdict]?.fill || colors.primary;
  return (
    <View style={{ width: size, height: size }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: value }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.primaryTint} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(circumference * value) / 100} ${circumference}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.ringCenter}>
        <AppText variant="title" weight={800} latin style={{ fontSize: 26, lineHeight: 30 }}>{value}</AppText>
        <AppText variant="overline" color={colors.textMuted} latin style={{ textTransform: "none" }}>/100</AppText>
      </View>
    </View>
  );
}

// 6dp bar with a % label
export function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100);
  return (
    <View style={styles.confRow}>
      <View style={styles.confTrack}>
        <View style={[styles.confFill, { width: `${pct}%` }]} />
      </View>
      <AppText variant="small" weight={800} color={colors.primary} latin>{pct}%</AppText>
    </View>
  );
}

// Result info tile: icon + label, value, then evidence (confidence bar or note)
export function InfoTile({ icon: Icon, label, value, children }) {
  return (
    <View style={styles.tile}>
      <View style={styles.tileHead}>
        {Icon ? <Icon size={18} color={colors.primary} strokeWidth={2.4} /> : null}
        <AppText variant="caption" color={colors.textMuted}>{label}</AppText>
      </View>
      <AppText variant="cardTitle">{value}</AppText>
      {children}
    </View>
  );
}

// Camera progress: 5 segments with labels; done green, current amber, upcoming dark
export function Stepper({ steps, current }) {
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: steps.length, now: current + 1 }}>
      <View style={styles.stepRow}>
        {steps.map((s, i) => (
          <View
            key={s}
            style={[styles.stepSeg, { backgroundColor: i < current ? colors.stepDone : i === current ? colors.accentBright : colors.cameraTrack }]}
          />
        ))}
      </View>
      <View style={styles.stepRow}>
        {steps.map((s, i) => (
          <AppText key={s} variant="small" color={i === current ? colors.accentBright : "#C9D1C6"} align="center" style={styles.stepLabel}>
            {s}
          </AppText>
        ))}
      </View>
    </View>
  );
}

// History / recent report row: thumbnail, breed, "Purpose · Date", verdict badge, chevron
export function ReportListItem({ item, onPress, selectMode = false, selected = false, onLongPress }) {
  const { t, i18n } = useTranslation();
  const { ForwardChevron: Chevron } = useDirection();
  const date = new Date(item.createdAt).toLocaleDateString(i18n.language === "ur" ? "ur-PK" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const speciesLabel = item.species && item.species !== "unknown" ? t(`species.${item.species}`) : null;
  const title = item.breed || speciesLabel || t(`status.${item.status}`, { defaultValue: "—" });
  const showStatus = !item.verdict && item.status !== "done" && (item.breed || speciesLabel);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityState={selectMode ? { selected } : undefined}
      style={({ pressed }) => [styles.item, selected && styles.itemSelected, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.thumb}>
        {item.thumbnail ? (
          <Image source={{ uri: item.thumbnail }} style={styles.thumbImage} accessibilityIgnoresInvertColors />
        ) : (
          <CattleHeadIcon size={34} color={colors.primary} />
        )}
      </View>
      <View style={styles.itemText}>
        <AppText variant="cardTitle" numberOfLines={1}>{title}</AppText>
        <AppText variant="caption" weight={500} color={colors.textMuted} numberOfLines={1}>
          {t(`purpose.${item.purpose}`, { defaultValue: item.purpose })} · {date}
        </AppText>
        {item.verdict ? (
          <View style={styles.itemBadge}><VerdictBadge verdict={item.verdict} /></View>
        ) : showStatus ? (
          <AppText variant="small" color={colors.textMuted}>{t(`status.${item.status}`, { defaultValue: "" })}</AppText>
        ) : null}
      </View>
      <Chevron size={24} color={colors.iconMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: radii.pill, paddingVertical: 4, paddingHorizontal: 12, alignSelf: "flex-start" },
  ringCenter: { position: "absolute", top: 0, bottom: 0, start: 0, end: 0, alignItems: "center", justifyContent: "center" },
  confRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  confTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.borderSoft, overflow: "hidden" },
  confFill: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  tile: { flex: 1, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 2, borderColor: colors.borderSoft, padding: 14, gap: 6 },
  tileHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  stepRow: { flexDirection: "row", gap: 6 },
  stepSeg: { flex: 1, height: 8, borderRadius: 4 },
  stepLabel: { flex: 1, marginTop: 6 },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.borderSoft,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  itemSelected: { borderWidth: 3, borderColor: colors.primary, backgroundColor: colors.primaryTintSoft },
  thumb: { width: 64, height: 64, borderRadius: 14, backgroundColor: "#EDE3D2", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  thumbImage: { width: 64, height: 64 },
  itemText: { flex: 1, gap: 2 },
  itemBadge: { marginTop: 4 }
});
