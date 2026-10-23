import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleCheck, CircleHelp, FileText, TriangleAlert, Trophy } from "lucide-react-native";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Image, StyleSheet, View } from "react-native";
import AppText from "../../../src/components/AppText";
import Button from "../../../src/components/Button";
import { CattleHeadIcon } from "../../../src/components/Illustrations";
import { EmptyState, Screen, ScreenHeader } from "../../../src/components/Layout";
import { VerdictBadge } from "../../../src/components/Report";
import { colors, verdictColors } from "../../../src/theme";
import { compareEvaluations } from "../../../services/api";

const FIT_BARS = { strong: [3, verdictColors.recommended.fill], fair: [2, verdictColors.caution.fill], weak: [1, verdictColors.not_recommended.fill], unknown: [0, colors.iconInactive] };

function FitBars({ level }) {
  const [n, color] = FIT_BARS[level] || FIT_BARS.unknown;
  return (
    <View style={styles.bars}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.barSeg, { backgroundColor: i < n ? color : colors.borderSoft }]} />
      ))}
    </View>
  );
}

function HealthValue({ value, t }) {
  const ok = value === "healthy";
  const Icon = ok ? CircleCheck : TriangleAlert;
  const color = ok ? verdictColors.recommended.fill : value === "uncertain" ? verdictColors.caution.fill : verdictColors.not_recommended.fill;
  return (
    <View style={styles.healthRow}>
      <Icon size={18} color={color} strokeWidth={2.6} />
      <AppText variant="body" weight={700} color={color} style={styles.flex}>{value ? t(`report.healthValue.${value}`) : "—"}</AppText>
    </View>
  );
}

// Spec §4.15
export default function Compare() {
  const { a, b } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    compareEvaluations([a, b])
      .then(setData)
      .catch((e) => setError(e.response?.data?.message || t("compare.error")));
  }, [a, b, t]);

  if (error || !data) {
    return (
      <Screen fixed>
        <ScreenHeader title={t("compare.title")} />
        {error ? (
          <EmptyState illustration={<CircleHelp size={64} color={colors.primary} />} title={t("compare.error")} body={error} />
        ) : (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        )}
      </Screen>
    );
  }

  const purpose = t(`purpose.${data.purpose}`);
  const [A, B] = data.animals;
  const winner = data.animals.find((x) => x.id === data.winnerId) || A;
  const rows = [
    { label: t("compare.breed"), render: (x) => <AppText variant="bodyLarge" weight={700}>{x.breed || "—"}</AppText> },
    { label: t("compare.age"), render: (x) => <AppText variant="bodyLarge" weight={700}>{x.ageYears != null ? t("report.years", { count: x.ageYears }) : "—"}</AppText> },
    { label: t("compare.health"), render: (x) => <HealthValue value={x.health} t={t} /> },
    {
      label: t("compare.fitFor", { purpose }),
      render: (x) => (
        <View style={styles.fit}>
          <AppText variant="bodyLarge" weight={800} color={(FIT_BARS[x.purposeFitLevel] || FIT_BARS.unknown)[1]}>{t(`report.fitLevel.${x.purposeFitLevel || "unknown"}`)}</AppText>
          <FitBars level={x.purposeFitLevel} />
        </View>
      )
    }
  ];

  return (
    <Screen footer={<Button title={t("compare.open", { letter: winner.letter })} icon={FileText} onPress={() => router.push(`/report/${winner.id}`)} />}>
      <ScreenHeader title={t("compare.title")} subtitle={t("compare.buyingFor", { purpose })} />

      <View style={styles.cards}>
        {[A, B].map((x) => {
          const win = x.id === data.winnerId;
          return (
            <View key={x.id} style={[styles.card, win && styles.cardWin]} accessibilityLabel={`${x.letter}: ${t(`verdict.${x.verdict}`)} ${x.score}/100`}>
              <View style={styles.photo}>
                {x.thumbnail ? <Image source={{ uri: x.thumbnail }} style={styles.photoImg} /> : <CattleHeadIcon size={44} />}
                <View style={styles.letter}><AppText variant="bodyStrong" color={colors.white} latin>{x.letter}</AppText></View>
              </View>
              <VerdictBadge verdict={x.verdict} />
              <AppText latin style={styles.score}>
                {x.score}
                <AppText variant="caption" color={colors.textMuted} latin> /100</AppText>
              </AppText>
            </View>
          );
        })}
      </View>

      <View style={styles.table}>
        {rows.map((r, i) => (
          <View key={r.label} style={[styles.row, i > 0 && styles.rowBorder]}>
            <AppText variant="overline" color={colors.textMuted}>{r.label}</AppText>
            <View style={styles.rowValues}>
              <View style={styles.col}>{r.render(A)}</View>
              <View style={styles.col}>{r.render(B)}</View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.winnerCard}>
        <View style={styles.trophy}><Trophy size={28} color={colors.textPrimary} strokeWidth={2.4} /></View>
        <View style={styles.flex}>
          <AppText variant="cardTitle" color={colors.white}>{t("compare.better", { purpose, letter: winner.letter })}</AppText>
          <AppText variant="body" color={colors.primaryTint} style={styles.reason}>{data.reason}</AppText>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { marginTop: 40 },
  cards: { flexDirection: "row", gap: 10 },
  card: { flex: 1, backgroundColor: colors.surface, borderRadius: 22, borderWidth: 2, borderColor: colors.borderSoft, padding: 10, gap: 8 },
  cardWin: { borderWidth: 3, borderColor: verdictColors.recommended.fill },
  photo: { height: 110, borderRadius: 16, backgroundColor: "#9DB08F", alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photoImg: { width: "100%", height: "100%" },
  letter: { position: "absolute", top: 8, left: 8, width: 32, height: 32, borderRadius: 10, backgroundColor: colors.textPrimary, alignItems: "center", justifyContent: "center" },
  score: { fontSize: 30, lineHeight: 36, fontWeight: "800", color: colors.textPrimary },
  table: { marginTop: 14, backgroundColor: colors.surface, borderRadius: 20, borderWidth: 2, borderColor: colors.borderSoft, paddingHorizontal: 16 },
  row: { paddingVertical: 12, gap: 6 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  rowValues: { flexDirection: "row", gap: 12 },
  col: { flex: 1 },
  healthRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fit: { gap: 6 },
  bars: { flexDirection: "row", gap: 4 },
  barSeg: { flex: 1, height: 8, borderRadius: 4 },
  winnerCard: { marginTop: 16, backgroundColor: colors.primary, borderRadius: 22, padding: 18, flexDirection: "row", gap: 14, alignItems: "flex-start" },
  trophy: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  reason: { marginTop: 6 }
});
