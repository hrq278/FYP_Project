import { useLocalSearchParams, useRouter } from "expo-router";
import {
  CalendarDays,
  CircleCheck,
  CircleHelp,
  Download,
  Dna,
  HeartPulse,
  ImageOff,
  Info,
  ListChecks,
  MessageCircle,
  MessageSquareText,
  ShieldCheck,
  Target,
  TriangleAlert
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from "react-native";
import AppText from "../../../src/components/AppText";
import Button from "../../../src/components/Button";
import { CattleHeadIcon } from "../../../src/components/Illustrations";
import { Accordion, EmptyState, InfoBanner, Screen, ScreenHeader } from "../../../src/components/Layout";
import { ConfidenceBar, InfoTile, ScoreRing, VerdictBadge } from "../../../src/components/Report";
import { useSession } from "../../../src/context/SessionContext";
import { createReportPdf, reportLink } from "../../../src/report/pdf";
import { sharePdf, shareOnWhatsApp } from "../../../src/report/share";
import { colors, verdictColors } from "../../../src/theme";
import { getEvaluation } from "../../../services/api";

const WHATSAPP_GREEN = "#1E7A3E";

const Bullets = ({ items }) =>
  (items || []).map((x, i) => (
    <View key={i} style={styles.bullet}>
      <AppText variant="body" color={colors.textSecondary}>•</AppText>
      <AppText variant="body" weight={500} color={colors.textSecondary} style={styles.flex}>{x}</AppText>
    </View>
  ));

// Spec §4.12
export default function Result() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user } = useSession();
  const [e, setE] = useState(null);
  const [error, setError] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const timer = useRef(null);

  const load = useCallback(async () => {
    try {
      const ev = await getEvaluation(id);
      setE(ev);
      setError(false);
      // Opened while still processing (e.g. from History): keep checking
      if (ev.status === "processing") timer.current = setTimeout(load, 2000);
    } catch {
      setError(true);
    }
  }, [id]);

  useEffect(() => {
    load();
    return () => clearTimeout(timer.current);
  }, [load]);

  const goHome = () => router.replace("/home");
  const lang = i18n.language === "ur" ? "ur" : "en";

  const makePdf = () => createReportPdf({ e, t, lang, preparedFor: user?.name });

  const downloadPdf = async () => {
    setPdfBusy(true);
    setNotice(null);
    try {
      const uri = await makePdf();
      if (uri) await sharePdf(uri, `MaweshiAI ${e.reportId}`);
    } catch {
      setNotice(t("report.pdfError"));
    } finally {
      setPdfBusy(false);
    }
  };

  const whatsapp = async () => {
    const link = reportLink(e);
    const text = `${t("report.shareText", { id: e.reportId, verdict: t(`verdict.${e.verdict}`), score: e.score, summary: e.report?.summary })}${link ? `\n${link}` : ""}`;
    try {
      await shareOnWhatsApp({ text, makePdf, title: `MaweshiAI ${e.reportId}` });
    } catch {
      setNotice(t("report.pdfError"));
    }
  };

  if (error || !e) {
    return (
      <Screen fixed>
        <ScreenHeader title={t("report.title")} onBack={goHome} />
        {error ? (
          <EmptyState illustration={<CircleHelp size={64} color={colors.primary} />} title={t("report.loadError")} primary={{ title: t("common.retry"), onPress: load }} />
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <AppText variant="body" color={colors.textMuted}>{t("report.loading")}</AppText>
          </View>
        )}
      </Screen>
    );
  }

  if (e.status !== "done") {
    const message = e.status === "processing" ? t("report.processing") : e.status === "rejected" ? t("report.rejected") : t("report.failed");
    return (
      <Screen fixed>
        <ScreenHeader title={t("report.title")} onBack={goHome} />
        <View style={styles.center}>
          {e.status === "processing" ? <ActivityIndicator color={colors.primary} size="large" /> : <TriangleAlert size={56} color={verdictColors.caution.fill} />}
          <AppText variant="bodyLarge" align="center">{message}</AppText>
        </View>
      </Screen>
    );
  }

  const date = new Date(e.createdAt).toLocaleDateString(lang === "ur" ? "ur-PK" : "en-GB", { day: "numeric", month: "short", year: "numeric" });
  const purpose = t(`purpose.${e.purpose}`);
  const vc = verdictColors[e.verdict] || verdictColors.caution;
  const species = e.results?.species;
  const breed = e.results?.breed?.final;
  const age = e.results?.age;
  const healthKey = e.results?.health?.condition || "uncertain";
  const fit = e.report?.purposeFitLevel || "unknown";

  return (
    <Screen
      footer={
        <View>
          {notice ? <View style={styles.notice}><InfoBanner variant="warning" text={notice} /></View> : null}
          <View style={styles.bar}>
            <Pressable onPress={downloadPdf} disabled={pdfBusy} accessibilityRole="button" style={styles.barSide}>
              {pdfBusy ? <ActivityIndicator color={colors.primary} /> : <Download size={26} color={colors.primary} strokeWidth={2.4} />}
              <AppText variant="small" align="center">{pdfBusy ? t("report.makingPdf") : t("report.downloadPdf")}</AppText>
            </Pressable>
            <Pressable onPress={whatsapp} accessibilityRole="button" style={({ pressed }) => [styles.whatsapp, pressed && { opacity: 0.9 }]}>
              <MessageCircle size={28} color={colors.white} strokeWidth={2.4} />
              <AppText variant="bodyLarge" weight={800} color={colors.white} align="center" style={styles.flexShrink}>{t("report.whatsapp")}</AppText>
            </Pressable>
            <Pressable onPress={() => router.push(`/report/${id}/ask`)} accessibilityRole="button" style={styles.barSide}>
              <MessageSquareText size={26} color={colors.primary} strokeWidth={2.4} />
              <AppText variant="small" align="center">{t("report.ask")}</AppText>
            </Pressable>
          </View>
        </View>
      }
    >
      <ScreenHeader title={t("report.title")} subtitle={`${date} · ${t("report.forPurpose", { purpose })}`} onBack={goHome} />

      <View style={[styles.verdictCard, { borderColor: vc.fill }]}>
        <View style={styles.verdictRow}>
          <View style={styles.flex}>
            <AppText variant="overline" color={colors.textMuted}>{t("report.verdictLabel")}</AppText>
            <View style={styles.badgeWrap}><VerdictBadge verdict={e.verdict} large /></View>
          </View>
          <ScoreRing score={e.score} verdict={e.verdict} />
        </View>
        <AppText variant="bodyLarge" weight={700}>{e.report?.summary}</AppText>
      </View>

      <View style={styles.tiles}>
        <View style={styles.tileRow}>
          <InfoTile icon={CattleHeadIconSmall} label={t("report.species")} value={species?.species ? t(`species.${species.species}`) : "—"}>
            <ConfidenceBar value={species?.confidence} />
          </InfoTile>
          <InfoTile icon={Dna} label={t("report.breed")} value={breed?.label || "—"}>
            <ConfidenceBar value={breed?.confidence} />
            {breed?.possibly ? <AppText variant="small" weight={600} color={colors.textMuted}>{t("report.possibly", { breed: breed.possibly })}</AppText> : null}
            {breed?.source === "ai_vision" ? <AppText variant="small" weight={600} color={colors.textMuted}>{t("report.aiVision")}</AppText> : null}
          </InfoTile>
        </View>
        <View style={styles.tileRow}>
          <InfoTile icon={CalendarDays} label={t("report.age")} value={age?.age_years != null ? t("report.years", { count: age.age_years }) : "—"}>
            {age?.permanent_incisors_estimate != null ? <AppText variant="caption" weight={600} color={colors.textMuted}>{t("report.teeth", { count: age.permanent_incisors_estimate })}</AppText> : null}
            {age?.uncertain ? <AppText variant="small" color={verdictColors.caution.text}>{t("report.uncertain")}</AppText> : null}
          </InfoTile>
          <InfoTile icon={ShieldCheck} label={t("report.health")} value={t(`report.healthValue.${healthKey}`)}>
            <View style={styles.healthNote}>
              {healthKey === "healthy" ? <CircleCheck size={16} color={verdictColors.recommended.fill} strokeWidth={2.6} /> : <TriangleAlert size={16} color={healthKey === "uncertain" ? verdictColors.caution.fill : verdictColors.not_recommended.fill} strokeWidth={2.6} />}
              <AppText variant="small" weight={700} color={healthKey === "healthy" ? verdictColors.recommended.text : healthKey === "uncertain" ? verdictColors.caution.text : verdictColors.not_recommended.text} style={styles.flex}>
                {t(`report.healthNote.${healthKey}`)}
              </AppText>
            </View>
          </InfoTile>
        </View>
      </View>

      <View style={styles.photoCard}>
        {e.images?.front?.url ? (
          <Image source={{ uri: e.images.front.url }} style={styles.photo} accessibilityLabel={t("report.photo")} />
        ) : (
          <View style={[styles.photo, styles.noPhoto]}>
            <ImageOff size={36} color={colors.iconMuted} />
            <AppText variant="caption" color={colors.textMuted}>{t("report.noPhoto")}</AppText>
          </View>
        )}
      </View>

      <View style={styles.accordions}>
        <Accordion title={t("report.why")} icon={CircleCheck} defaultOpen>
          <Bullets items={e.report?.reasons} />
        </Accordion>
        <Accordion title={t("report.risks")} icon={TriangleAlert}>
          <Bullets items={e.report?.risks} />
        </Accordion>
        <Accordion title={t("report.fit", { purpose })} icon={Target}>
          <AppText variant="bodyStrong">{t(`report.fitLevel.${fit}`)}</AppText>
          <AppText variant="body" weight={500} color={colors.textSecondary}>{e.report?.purposeFit}</AppText>
        </Accordion>
        {e.report?.tips?.length ? (
          <Accordion title={t("report.checks")} icon={ListChecks}>
            <Bullets items={e.report.tips} />
          </Accordion>
        ) : null}
      </View>

      <View style={styles.disclaimer}>
        <Info size={20} color={colors.textMuted} strokeWidth={2.4} />
        <View style={styles.flex}>
          <AppText variant="caption" weight={600} color={colors.textMuted}>{t("report.disclaimer")}</AppText>
          <AppText variant="small" weight={500} color={colors.textMuted} style={styles.source}>
            {e.report?.source === "llm" ? t("report.aiWritten") : t("report.ruleWritten")} · {e.reportId}
          </AppText>
        </View>
      </View>
    </Screen>
  );
}

// lucide has no cattle icon; reuse the logo head at icon size
function CattleHeadIconSmall({ size = 18, color }) {
  return <CattleHeadIcon size={size + 4} color={color} strokeWidth={4} />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 20 },
  verdictCard: { backgroundColor: colors.surface, borderWidth: 3, borderRadius: 22, padding: 18, gap: 12 },
  verdictRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  badgeWrap: { marginTop: 8 },
  tiles: { gap: 10, marginTop: 14 },
  tileRow: { flexDirection: "row", gap: 10 },
  healthNote: { flexDirection: "row", alignItems: "center", gap: 4 },
  photoCard: { marginTop: 14, borderRadius: 20, overflow: "hidden", borderWidth: 2, borderColor: colors.borderSoft, backgroundColor: colors.surface },
  photo: { width: "100%", height: 200 },
  noPhoto: { alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: colors.surfaceMuted },
  accordions: { gap: 10, marginTop: 14 },
  bullet: { flexDirection: "row", gap: 8 },
  disclaimer: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 8 },
  source: { marginTop: 4 },
  notice: { marginBottom: 8 },
  bar: { flexDirection: "row", gap: 10, alignItems: "stretch" },
  barSide: {
    width: 84,
    minHeight: 76,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 4
  },
  whatsapp: {
    flex: 1,
    minHeight: 76,
    borderRadius: 16,
    backgroundColor: WHATSAPP_GREEN,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 10
  }
});
