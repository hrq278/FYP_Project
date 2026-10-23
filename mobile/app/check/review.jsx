import { useRouter } from "expo-router";
import { CircleCheck, RotateCcw, Sparkles, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, StyleSheet, View } from "react-native";
import AppText from "../../src/components/AppText";
import Button from "../../src/components/Button";
import { ConfirmDialog, InfoBanner, Screen, ScreenHeader } from "../../src/components/Layout";
import { useCheckFlow, VIEWS } from "../../src/context/CheckFlowContext";
import { colors, verdictColors, warningColors } from "../../src/theme";

// A photo needs a retake when its quality check found issues (unchecked photos count as fine)
const issuesOf = (photo) => (photo?.quality && photo.quality.ok === false ? photo.quality.issues || [] : []);

function PhotoTile({ view, photo, wide, onPress }) {
  const { t } = useTranslation();
  const issues = issuesOf(photo);
  const warn = issues.length > 0;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${t(`check.views.${view}`)}: ${warn ? t(`check.issues.${issues[0]}`, { defaultValue: issues[0] }) : t("check.good")}`}
      style={[styles.tile, wide && styles.tileWide, warn && styles.tileWarn]}
    >
      <View style={[styles.photoBox, wide && styles.photoWide]}>
        {photo?.uri ? <Image source={{ uri: photo.uri }} style={[styles.photo, warn && styles.photoBlur]} blurRadius={warn ? 6 : 0} /> : null}
        {warn ? (
          <View style={styles.warnLabel}>
            <TriangleAlert size={18} color={warningColors.border} strokeWidth={2.6} />
            <AppText variant="small" color={warningColors.text} style={styles.flex}>
              {t(`check.issues.${issues[0]}`, { defaultValue: issues[0] })}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={[styles.footer, wide && styles.footerWide]}>
        <AppText variant="bodyStrong">{t(`check.views.${view}`)}</AppText>
        {warn ? (
          <View style={styles.retakePill}>
            <RotateCcw size={16} color={colors.white} strokeWidth={2.6} />
            <AppText variant="small" color={colors.white}>{t("check.retake")}</AppText>
          </View>
        ) : (
          <View style={styles.good}>
            <CircleCheck size={20} color={verdictColors.recommended.fill} strokeWidth={2.6} />
            <AppText variant="caption" weight={700} color={verdictColors.recommended.text}>{t("check.good")}</AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

// Spec §4.10
export default function Review() {
  const router = useRouter();
  const { t } = useTranslation();
  const flow = useCheckFlow();
  const [confirm, setConfirm] = useState(false);
  const weak = VIEWS.filter((v) => issuesOf(flow.photos[v]).length > 0);
  const missing = VIEWS.filter((v) => !flow.photos[v]?.uri);

  const retake = (view) => {
    flow.update({ retakeView: view });
    router.push(`/check/capture/${view}`);
  };

  const analyze = () => {
    if (missing.length) {
      router.replace(`/check/capture/${missing[0]}`);
      return;
    }
    if (weak.length) setConfirm(true);
    else router.replace("/check/processing");
  };

  return (
    <View style={styles.flex}>
      <Screen footer={<Button title={t("check.analyze")} icon={Sparkles} onPress={analyze} />}>
        <ScreenHeader title={t("check.reviewTitle")} subtitle={t("check.reviewSub")} onBack={() => router.replace("/check/capture/teeth")} />
        <View style={styles.grid}>
          {VIEWS.filter((v) => v !== "teeth").map((v) => (
            <PhotoTile key={v} view={v} photo={flow.photos[v]} onPress={() => retake(v)} />
          ))}
          <PhotoTile view="teeth" photo={flow.photos.teeth} wide onPress={() => retake("teeth")} />
        </View>
        {weak.length ? (
          <View style={styles.banner}>
            <InfoBanner variant="warning" text={t("check.retakeBanner", { count: weak.length })} />
          </View>
        ) : null}
      </Screen>
      <ConfirmDialog
        visible={confirm}
        title={t("check.analyzeAnywayTitle")}
        body={t("check.analyzeAnywayBody")}
        confirmLabel={t("check.analyzeAnyway")}
        cancelLabel={t("check.retake")}
        onCancel={() => {
          setConfirm(false);
          retake(weak[0]);
        }}
        onConfirm={() => {
          setConfirm(false);
          router.replace("/check/processing");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: { width: "48.4%", backgroundColor: colors.surface, borderRadius: 18, borderWidth: 2, borderColor: colors.borderSoft, overflow: "hidden" },
  tileWide: { width: "100%", flexDirection: "row" },
  tileWarn: { borderWidth: 3, borderColor: warningColors.border, backgroundColor: "#FFF8F1" },
  photoBox: { height: 112, backgroundColor: "#9DB08F" },
  photoWide: { width: "45%", height: 110 },
  photo: { width: "100%", height: "100%" },
  photoBlur: { opacity: 0.85 },
  warnLabel: {
    position: "absolute",
    top: 8,
    start: 8,
    end: 8,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 10,
    padding: 6,
    flexDirection: "row",
    gap: 6,
    alignItems: "center"
  },
  footer: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, gap: 6 },
  footerWide: { flex: 1, flexDirection: "column", alignItems: "flex-start", justifyContent: "center", gap: 6 },
  good: { flexDirection: "row", alignItems: "center", gap: 4 },
  retakePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: warningColors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  banner: { marginTop: 16 }
});
