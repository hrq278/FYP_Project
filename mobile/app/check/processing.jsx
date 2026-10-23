import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { CircleCheck, CircleDashed, CircleX, Clock, LoaderCircle, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Easing, StyleSheet, View } from "react-native";
import AppText from "../../src/components/AppText";
import Button from "../../src/components/Button";
import { CattleSide } from "../../src/components/Illustrations";
import { Card, Screen } from "../../src/components/Layout";
import { ErrorState } from "../../src/components/States";
import { useCheckFlow, VIEWS, parsePkr } from "../../src/context/CheckFlowContext";
import { colors, verdictColors } from "../../src/theme";
import { addPending } from "../../src/offline/pending";
import { usePending } from "../../src/offline/PendingContext";
import { createEvaluation, errorKind, getEvaluation } from "../../services/api";

const POLL_MS = 1500;
const STEP_KEYS = ["species", "breed", "age", "health", "report"];
const waitingSteps = () => STEP_KEYS.map((key) => ({ key, status: "waiting" }));

function Spinner() {
  const spin = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [spin]);
  return (
    <Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] }) }] }}>
      <LoaderCircle size={30} color={colors.accent} strokeWidth={2.6} />
    </Animated.View>
  );
}

const STATE_ICON = {
  done: <CircleCheck size={30} color={verdictColors.recommended.fill} strokeWidth={2.4} />,
  failed: <CircleX size={30} color={verdictColors.not_recommended.fill} strokeWidth={2.4} />,
  skipped: <CircleDashed size={30} color={colors.iconInactive} strokeWidth={2.2} />,
  waiting: <CircleDashed size={30} color={colors.iconInactive} strokeWidth={2.2} />
};

// Spec §4.11: uploads the check, then polls GET /api/evaluations/:id and shows each step live
export default function Processing() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const flow = useCheckFlow();
  const pending = usePending();
  const [steps, setSteps] = useState(waitingSteps);
  const [phase, setPhase] = useState("uploading"); // uploading | polling | failed
  const [failKind, setFailKind] = useState("server"); // server | ml
  const cancelled = useRef(false);
  const progress = useRef(new Animated.Value(0)).current;

  const doneCount = steps.filter((s) => s.status === "done").length;
  useEffect(() => {
    Animated.timing(progress, { toValue: phase === "uploading" ? 0.05 : doneCount / STEP_KEYS.length, duration: 400, useNativeDriver: false }).start();
  }, [doneCount, phase, progress]);

  const run = useCallback(async () => {
    cancelled.current = false;
    setPhase("uploading");
    setSteps(waitingSteps());
    let id = flow.evaluationId;
    try {
      if (!id && flow.pendingId) {
        // Already saved on the phone after an earlier upload failed: send that copy
        id = await pending.retry(flow.pendingId);
        flow.update({ evaluationId: id, pendingId: null });
      } else if (!id) {
        const check = {
          photos: Object.fromEntries(VIEWS.map((v) => [v, flow.photos[v].uri])),
          quality: Object.fromEntries(VIEWS.map((v) => [v, flow.photos[v].quality || null])),
          purpose: flow.purpose,
          budget: parsePkr(flow.budget),
          sellerPrice: parsePkr(flow.sellerPrice),
          experience: flow.experience,
          language: i18n.language === "ur" ? "ur" : "en"
        };
        try {
          ({ id } = await createEvaluation(check));
        } catch (error) {
          if (errorKind(error) !== "network") throw error;
          // No internet: keep the check on the phone; it is sent automatically when back online
          const item = await addPending(check);
          flow.update({ pendingId: item.id });
          if (!cancelled.current) router.replace("/check/offline");
          return;
        }
        flow.update({ evaluationId: id });
      }
      setPhase("polling");
      while (!cancelled.current) {
        const e = await getEvaluation(id);
        setSteps(e.steps?.length ? e.steps : waitingSteps());
        if (e.status === "done") {
          router.replace({ pathname: `/report/${id}`, params: { fresh: "1" } });
          return;
        }
        if (e.status === "rejected") {
          router.replace({ pathname: "/check/wrong-image", params: { view: "front" } });
          return;
        }
        if (e.status === "failed") {
          setFailKind(e.reason === "ml_unavailable" ? "ml" : "server");
          setPhase("failed");
          flow.update({ evaluationId: null }); // a retry creates a new evaluation
          return;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
    } catch (error) {
      if (cancelled.current) return;
      const kind = errorKind(error);
      if (kind === "network") {
        // Lost the connection: either the queued copy is still waiting, or the check was sent and runs on the server
        router.replace({ pathname: "/check/offline", params: id ? { sent: "1" } : {} });
        return;
      }
      setFailKind(kind === "ml" ? "ml" : "server");
      setPhase("failed");
    }
  }, [flow, i18n.language, router, pending]);

  useFocusEffect(
    useCallback(() => {
      run();
      return () => {
        cancelled.current = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const cancel = () => {
    cancelled.current = true;
    flow.update({ evaluationId: null }); // analyzing again uploads the current photos as a new check
    router.replace("/check/review");
  };

  if (phase === "failed") {
    return (
      <Screen fixed>
        <ErrorState
          kind={failKind}
          title={failKind === "server" ? t("check.failedTitle") : undefined}
          body={failKind === "server" ? t("check.failedBody") : t("check.mlBody")}
          onRetry={run}
          secondary={{ title: t("common.cancel"), icon: X, onPress: cancel }}
        />
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <AppText variant="body" weight={500} color={colors.textMuted} align="center">{t("check.keepOpen")}</AppText>
          <Button title={t("common.cancel")} icon={X} variant="outline" onPress={cancel} />
        </View>
      }
    >
      <View style={styles.art}>
        <CattleSide width={190} />
      </View>
      <AppText variant="h1" align="center">{t("check.processingTitle")}</AppText>
      <View style={styles.time}>
        <Clock size={18} color={colors.textMuted} strokeWidth={2.4} />
        <AppText variant="body" weight={500} color={colors.textMuted}>
          {phase === "uploading" ? t("check.uploading") : t("check.processingTime")}
        </AppText>
      </View>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: STEP_KEYS.length, now: doneCount }}>
        <Animated.View style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }]} />
      </View>

      <Card padded={false} style={styles.list}>
        {steps.map((s, i) => {
          const working = s.status === "working";
          const hint =
            s.status === "done" && s.summary
              ? s.summary
              : s.key === "report"
                ? t("check.stepHints.report", { purpose: t(`purpose.${flow.purpose}`) })
                : working && s.summary
                  ? s.summary
                  : t(`check.stepHints.${s.key}`);
          return (
            <View key={s.key} style={[styles.row, i > 0 && styles.rowBorder, working && styles.rowWorking]} accessibilityLabel={`${t(`check.steps.${s.key}`)}: ${t(`check.stepState.${s.status}`)}`}>
              {working ? <Spinner /> : STATE_ICON[s.status] || STATE_ICON.waiting}
              <View style={styles.flex}>
                <AppText variant="bodyLarge" weight={800} color={s.status === "waiting" ? colors.textDisabled : colors.textPrimary}>
                  {t(`check.steps.${s.key}`)}
                </AppText>
                <AppText variant="caption" weight={500} color={working ? colors.accentText : colors.textMuted} numberOfLines={1}>
                  {hint}
                </AppText>
              </View>
              <AppText variant="caption" weight={700} color={working ? colors.accentText : s.status === "done" ? colors.primary : colors.textDisabled}>
                {t(`check.stepState.${s.status}`)}
              </AppText>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  art: { alignSelf: "center", width: 230, height: 170, borderRadius: 28, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  time: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6, marginBottom: 14 },
  track: { height: 10, borderRadius: 5, backgroundColor: colors.borderSoft, overflow: "hidden", marginBottom: 16 },
  fill: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
  list: { overflow: "hidden" },
  row: { minHeight: 64, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.divider },
  rowWorking: { backgroundColor: "#FDF4DF" },
  footer: { gap: 12 }
});
