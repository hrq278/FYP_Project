import { CircleX, Clock, LoaderCircle, RotateCcw, ServerCrash, Trash2, TriangleAlert, WifiOff } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AccessibilityInfo, Animated, Image, Pressable, StyleSheet, View } from "react-native";
import { colors, radii, touch, verdictColors, warningColors } from "../theme";
import AppText from "./AppText";
import { EmptyState } from "./Layout";

const ERROR_LOOK = {
  network: { icon: WifiOff, color: verdictColors.not_recommended.fill, bg: colors.surfaceMuted },
  ml: { icon: ServerCrash, color: verdictColors.caution.fill, bg: verdictColors.caution.bg },
  server: { icon: CircleX, color: verdictColors.not_recommended.fill, bg: verdictColors.not_recommended.bg }
};

/**
 * Full-screen error (spec §5 layout): no internet, checking service down (503) or a server error.
 * `kind` comes from errorKind() in services/api.js; title/body can be overridden per screen.
 */
export function ErrorState({ kind = "server", title, body, info, onRetry, secondary }) {
  const { t } = useTranslation();
  const look = ERROR_LOOK[kind] || ERROR_LOOK.server;
  const Icon = look.icon;
  return (
    <EmptyState
      tileBg={look.bg}
      illustration={<Icon size={72} color={look.color} strokeWidth={2} />}
      title={title || t(`states.${kind}Title`)}
      body={body || t(`states.${kind}Body`)}
      info={info}
      primary={onRetry ? { title: t("common.retry"), icon: RotateCcw, onPress: onRetry } : null}
      secondary={secondary}
    />
  );
}

// Grey placeholder block that gently pulses while content loads (still when the phone asks for reduced motion)
export function Skeleton({ width, height = 16, radius = 8, style }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const [still, setStill] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled?.().then(setStill).catch(() => {});
  }, []);
  useEffect(() => {
    if (still) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.45, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, still]);
  return <Animated.View style={[{ width, height, borderRadius: radius, backgroundColor: colors.surfaceMuted, opacity: pulse }, style]} />;
}

// Placeholder rows shaped like ReportListItem
export function ReportListSkeleton({ count = 3 }) {
  const { t } = useTranslation();
  return (
    <View style={styles.skeletonList} accessibilityLabel={t("states.loading")} accessibilityRole="progressbar">
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={64} height={64} radius={14} />
          <View style={styles.rowText}>
            <Skeleton width="55%" height={18} />
            <Skeleton width="75%" height={14} />
            <Skeleton width={110} height={26} radius={radii.pill} />
          </View>
        </View>
      ))}
    </View>
  );
}

const PENDING_LOOK = {
  waiting: { icon: Clock, color: warningColors.text, bg: verdictColors.caution.bg },
  sending: { icon: LoaderCircle, color: colors.primary, bg: colors.primaryTint },
  failed: { icon: TriangleAlert, color: verdictColors.not_recommended.text, bg: verdictColors.not_recommended.bg }
};

// A check saved on the phone because there was no internet (top of History)
export function PendingListItem({ item, onRetry, onDelete }) {
  const { t, i18n } = useTranslation();
  const look = PENDING_LOOK[item.state] || PENDING_LOOK.waiting;
  const Icon = look.icon;
  const date = new Date(item.createdAt).toLocaleDateString(i18n.language === "ur" ? "ur-PK" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const sending = item.state === "sending";
  return (
    <View style={[styles.row, styles.pending]}>
      <View style={styles.thumb}>
        {item.photos?.front ? <Image source={{ uri: item.photos.front }} style={styles.thumbImage} accessibilityIgnoresInvertColors /> : null}
      </View>
      <View style={styles.rowText}>
        <AppText variant="cardTitle" numberOfLines={1}>{t("pending.title")}</AppText>
        <AppText variant="caption" weight={500} color={colors.textMuted} numberOfLines={1}>
          {t(`purpose.${item.purpose}`, { defaultValue: item.purpose })} · {date}
        </AppText>
        <View style={[styles.pill, { backgroundColor: look.bg }]}>
          <Icon size={16} color={look.color} strokeWidth={2.6} />
          <AppText variant="small" color={look.color}>{t(`pending.${item.state}`)}</AppText>
        </View>
      </View>
      {sending ? null : (
        <View style={styles.actions}>
          <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel={t("pending.retryA11y")} style={styles.iconBtn}>
            <RotateCcw size={22} color={colors.primary} strokeWidth={2.4} />
          </Pressable>
          <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel={t("pending.deleteA11y")} style={styles.iconBtn}>
            <Trash2 size={22} color={verdictColors.not_recommended.fill} strokeWidth={2.4} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonList: { gap: 12 },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    borderWidth: 2,
    borderColor: colors.borderSoft,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  rowText: { flex: 1, gap: 6 },
  pending: { borderStyle: "dashed", borderColor: colors.border },
  thumb: { width: 64, height: 64, borderRadius: 14, backgroundColor: "#EDE3D2", overflow: "hidden" },
  thumbImage: { width: 64, height: 64 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 4 },
  actions: { gap: 4 },
  iconBtn: { width: touch.min, height: touch.min, borderRadius: radii.icon, alignItems: "center", justifyContent: "center" }
});
