import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Camera, CloudUpload, RotateCcw, Sparkles } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../../src/components/AppText";
import Button from "../../src/components/Button";
import { CattleSide } from "../../src/components/Illustrations";
import { EmptyState, InfoBanner } from "../../src/components/Layout";
import { ReportListItem } from "../../src/components/Report";
import { ReportListSkeleton } from "../../src/components/States";
import { useSession } from "../../src/context/SessionContext";
import { useDirection } from "../../src/hooks/useDirection";
import { usePending } from "../../src/offline/PendingContext";
import { colors, radii, spacing } from "../../src/theme";
import { errorKind, listEvaluations } from "../../services/api";

// Spec §4.6
export default function Home() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isGuest } = useSession();
  const [reports, setReports] = useState(null); // null = loading
  const [error, setError] = useState(null); // errorKind() of the last failed load
  const pending = usePending();
  const [refreshing, setRefreshing] = useState(false);
  const { ForwardChevron: Chevron } = useDirection();
  const name = user?.name?.split(" ")[0] || t("home.guestName");

  const load = useCallback(async () => {
    try {
      const { items } = await listEvaluations({ page: 1 });
      setReports(items.slice(0, 3));
      setError(null);
    } catch (err) {
      setError(errorKind(err));
      setReports((r) => r || []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Queued offline checks just reached the server: show them
  useEffect(() => {
    if (pending.sentCount) load();
  }, [pending.sentCount, load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const startCheck = () => router.push("/check/purpose");

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <AppText variant="body" weight={600} color={colors.textMuted}>{t("home.greeting")}</AppText>
            <AppText variant="h1" latin={!isGuest && /^[\x00-\x7F]*$/.test(name)}>{name}</AppText>
          </View>
          <Pressable
            onPress={() => router.push("/profile")}
            accessibilityRole="button"
            accessibilityLabel={t("home.profileA11y")}
            style={styles.avatar}
          >
            <AppText variant="title" color={colors.white} latin>{(user?.name || "G").charAt(0).toUpperCase()}</AppText>
          </Pressable>
        </View>

        {isGuest ? <View style={styles.banner}><InfoBanner text={t("home.guestBanner")} /></View> : null}
        {pending.items.length ? (
          <Pressable onPress={() => router.push("/history")} accessibilityRole="link" style={styles.banner}>
            <InfoBanner variant="warning" icon={CloudUpload} text={t("pending.homeBanner", { count: pending.items.length })} />
          </Pressable>
        ) : null}

        <Pressable onPress={startCheck} accessibilityRole="button" accessibilityLabel={t("home.heroTitle")} style={({ pressed }) => [styles.hero, pressed && { opacity: 0.95 }]}>
          <View style={styles.heroTop}>
            <View style={styles.flex}>
              <View style={styles.aiPill}>
                <Sparkles size={16} color={colors.primary} strokeWidth={2.6} />
                <AppText variant="small" color={colors.primary}>{t("home.aiCheck")}</AppText>
              </View>
              <AppText variant="h1" color={colors.white} style={styles.heroTitle}>{t("home.heroTitle")}</AppText>
              <AppText variant="body" color={colors.primaryTint}>{t("home.heroBody")}</AppText>
            </View>
            <View style={styles.heroArt}>
              <CattleSide width={130} color={colors.background} ground={colors.accentBright} />
            </View>
          </View>
          <View style={styles.heroCta}>
            <Camera size={24} color={colors.textPrimary} strokeWidth={2.4} />
            <AppText variant="button" weight={800}>{t("home.heroCta")}</AppText>
          </View>
        </Pressable>

        <View style={styles.sectionRow}>
          <AppText variant="section">{t("home.recent")}</AppText>
          <Pressable onPress={() => router.push("/history")} accessibilityRole="link" style={styles.seeAll} hitSlop={8}>
            <AppText variant="bodyStrong" color={colors.primary}>{t("common.seeAll")}</AppText>
            <Chevron size={20} color={colors.primary} strokeWidth={2.6} />
          </Pressable>
        </View>

        {reports === null ? (
          <ReportListSkeleton count={2} />
        ) : error && reports.length === 0 ? (
          <View style={styles.error}>
            <InfoBanner variant="warning" text={t(`states.${error}Short`)} />
            <Button title={t("common.retry")} icon={RotateCcw} variant="outline" size="normal" onPress={load} />
          </View>
        ) : reports.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              illustration={<CattleSide width={110} />}
              title={t("empty.historyTitle")}
              body={t("empty.historyBody")}
            />
          </View>
        ) : (
          <View style={styles.list}>
            {reports.map((item) => (
              <ReportListItem key={item.id} item={item} onPress={() => router.push(`/report/${item.id}`)} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.screen, paddingBottom: 32 },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  banner: { marginBottom: 16 },
  hero: { backgroundColor: colors.primary, borderRadius: radii.hero, padding: 20, gap: 18 },
  heroTop: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  aiPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.primaryTint,
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10
  },
  heroTitle: { marginBottom: 6 },
  heroArt: { marginBottom: 6 },
  heroCta: {
    minHeight: 60,
    borderRadius: radii.button,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10
  },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 28, marginBottom: 14 },
  seeAll: { flexDirection: "row", alignItems: "center", gap: 2, minHeight: 48 },
  error: { gap: 12 },
  emptyWrap: { minHeight: 320 },
  list: { gap: 12 }
});
