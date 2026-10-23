import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  Camera,
  CameraOff,
  Check,
  Eye,
  Hand,
  ImageIcon,
  RotateCcw,
  Settings,
  Sun,
  TriangleAlert,
  X,
  Zap,
  ZapOff
} from "lucide-react-native";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../../../src/components/AppText";
import Button from "../../../src/components/Button";
import { CaptureOverlay, CornerBrackets, MouthOverlay, TeethIllustration } from "../../../src/components/Illustrations";
import { BackButton, ConfirmDialog } from "../../../src/components/Layout";
import { Stepper } from "../../../src/components/Report";
import { useCheckFlow, VIEWS } from "../../../src/context/CheckFlowContext";
import { colors, radii, warningColors } from "../../../src/theme";
import { captureTap, photoWarning } from "../../../src/utils/haptics";
import { compressPhoto } from "../../../src/utils/photo";
import { checkPhoto, errorKind } from "../../../services/api";

const FLASH_CYCLE = ["off", "auto", "on"];

// Spec §4.8 (body views) and §4.9 (teeth). One screen per step; good photos move on automatically.
export default function Capture() {
  const { view } = useLocalSearchParams();
  const router = useRouter();
  const { t } = useTranslation();
  const flow = useCheckFlow();
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const teeth = view === "teeth";
  const index = VIEWS.indexOf(view);
  const [flash, setFlash] = useState(teeth ? "on" : "off");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState(null); // { photo, issues: [], error: false | "network" | "server" }
  const [frame, setFrame] = useState({ width: 0, height: 0 });
  const [confirmClose, setConfirmClose] = useState(false);

  const goNext = () => {
    if (flow.retakeView) {
      flow.update({ retakeView: null });
      router.replace("/check/review");
    } else if (index < VIEWS.length - 1) {
      router.replace(`/check/capture/${VIEWS[index + 1]}`);
    } else {
      router.replace("/check/review");
    }
  };

  const accept = (photo) => {
    flow.setPhoto(view, photo);
    setProblem(null);
    goNext();
  };

  // Compress, then check quality (and species on the front photo) before moving on
  const handlePhoto = async (raw) => {
    setBusy(true);
    setProblem(null);
    try {
      const small = await compressPhoto(raw);
      let result;
      try {
        result = await checkPhoto(small.uri, view);
      } catch (error) {
        // Offline the photo can still be used; the full check runs (or is queued) after Analyze
        photoWarning();
        setProblem({ photo: { uri: small.uri, quality: null, species: null }, issues: [], error: errorKind(error) === "network" ? "network" : "server" });
        return;
      }
      const photo = { uri: small.uri, quality: result.quality, species: result.species };
      if (result.species && result.species.isCattle === false) {
        flow.setPhoto(view, photo);
        router.replace({ pathname: "/check/wrong-image", params: { view } });
        return;
      }
      if (result.quality?.ok) accept(photo);
      else {
        photoWarning();
        setProblem({ photo, issues: result.quality?.issues || [], error: false });
      }
    } finally {
      setBusy(false);
    }
  };

  const capture = async () => {
    if (!cameraRef.current || busy) return;
    captureTap();
    const shot = await cameraRef.current.takePictureAsync({ quality: 0.9 });
    if (shot?.uri) await handlePhoto(shot);
  };

  const pickFromGallery = async () => {
    if (busy) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 1 });
    if (!res.canceled && res.assets?.length) await handlePhoto(res.assets[0]);
  };

  const close = () => {
    if (teeth || flow.retakeView) {
      router.back();
      return;
    }
    setConfirmClose(true);
  };

  const FlashIcon = flash === "off" ? ZapOff : Zap;
  const granted = permission?.granted;

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />

      {/* Top bar */}
      <View style={styles.topBar}>
        {teeth ? (
          <BackButton dark onPress={close} />
        ) : (
          <Pressable onPress={close} accessibilityRole="button" accessibilityLabel={t("check.close")} style={styles.closeBtn}>
            <X size={26} color={colors.white} strokeWidth={2.6} />
          </Pressable>
        )}
        <View style={styles.flex}>
          <AppText variant="caption" weight={700} color="#C9D1C6">{t("check.step", { current: index + 1, total: VIEWS.length })}</AppText>
          <AppText variant="title" color={colors.white}>{t(`check.viewTitles.${view}`)}</AppText>
        </View>
      </View>
      <View style={styles.stepper}>
        <Stepper steps={VIEWS.map((v) => t(`check.views.${v}`))} current={index} />
      </View>

      {/* Teeth guide card */}
      {teeth ? (
        <View style={styles.guide}>
          <View style={styles.guideArt}>
            <TeethIllustration width={110} />
            <AppText variant="small" color={colors.primary}>{t("check.teethGuide")}</AppText>
          </View>
          <View style={styles.guideTips}>
            {[[Hand, "teethTip1"], [Eye, "teethTip2"], [Zap, "teethTip3"]].map(([Icon, key]) => (
              <View key={key} style={styles.guideTip}>
                <Icon size={20} color={key === "teethTip3" ? colors.accentText : colors.primary} strokeWidth={2.4} />
                <AppText variant="body" weight={600} style={styles.flex}>{t(`check.${key}`)}</AppText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Viewfinder */}
      <View style={styles.viewfinder} onLayout={(e) => setFrame(e.nativeEvent.layout)}>
        {granted ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" flash={flash} animateShutter />
        ) : (
          <View style={styles.noCamera}>
            <CameraOff size={48} color={colors.white} strokeWidth={2} />
            <AppText variant="title" color={colors.white} align="center">{t("check.permissionTitle")}</AppText>
            <AppText variant="body" color="#C9D1C6" align="center">{t("check.permissionBody")}</AppText>
            {permission && !permission.granted && !permission.canAskAgain ? (
              <Button title={t("check.permissionSettings")} icon={Settings} size="normal" onPress={() => Linking.openSettings()} />
            ) : (
              <Button title={t("check.permissionAllow")} icon={Camera} size="normal" onPress={requestPermission} />
            )}
          </View>
        )}
        {granted ? (
          <View style={styles.overlay} pointerEvents="none">
            {teeth ? <MouthOverlay width={Math.min(frame.width * 0.86, 320)} /> : <CaptureOverlay view={view} size={Math.min(frame.width * 0.8, frame.height * 0.75, 320)} />}
          </View>
        ) : null}
        {granted && frame.width ? <CornerBrackets width={frame.width - 32} height={frame.height - 32} /> : null}
        {teeth && granted ? (
          <View style={styles.hint} pointerEvents="none">
            <AppText variant="body" weight={700} color={colors.white}>{t("check.teethHint")}</AppText>
          </View>
        ) : null}

        {/* Tip card (body views) */}
        {!teeth && !problem && !busy ? (
          <View style={styles.tipCard}>
            <View style={styles.example}>
              <CaptureOverlayExample view={view} />
              <AppText style={styles.exampleLabel} color={colors.primary}>{t("check.example")}</AppText>
            </View>
            <View style={styles.flex}>
              <View style={styles.tipHead}>
                <Sun size={18} color={colors.accentText} strokeWidth={2.4} />
                <AppText variant="bodyStrong">{t("check.tip")}</AppText>
              </View>
              <AppText variant="body" weight={600} color={colors.textSecondary}>{t(`check.tips.${view}`)}</AppText>
            </View>
          </View>
        ) : null}

        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.white} size="large" />
            <AppText variant="bodyStrong" color={colors.white}>{t("check.checking")}</AppText>
          </View>
        ) : null}

        {/* Inline retake prompt */}
        {problem ? (
          <View style={styles.problem}>
            <View style={styles.problemHead}>
              <TriangleAlert size={22} color={warningColors.border} strokeWidth={2.6} />
              <AppText variant="bodyStrong" color={warningColors.bannerText} style={styles.flex}>
                {problem.error === "network" ? t("check.qualityOffline") : problem.error ? t("check.qualityError") : problem.issues.map((i) => t(`check.issues.${i}`, { defaultValue: i })).join(" · ")}
              </AppText>
            </View>
            <View style={styles.problemActions}>
              <Button title={t("check.retake")} icon={RotateCcw} size="normal" onPress={() => setProblem(null)} style={styles.flex} />
              <Button title={t("check.useAnyway")} icon={Check} variant="outline" size="normal" onPress={() => accept(problem.photo)} style={styles.flex} />
            </View>
          </View>
        ) : null}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable onPress={pickFromGallery} accessibilityRole="button" style={styles.sideBtn} disabled={busy}>
          <ImageIcon size={26} color={colors.white} strokeWidth={2.2} />
          <AppText variant="small" color={colors.white}>{t("check.gallery")}</AppText>
        </Pressable>
        <Pressable
          onPress={capture}
          accessibilityRole="button"
          accessibilityLabel={t("check.capture")}
          disabled={!granted || busy}
          style={({ pressed }) => [styles.shutterWrap, (!granted || busy) && { opacity: 0.5 }, pressed && { transform: [{ scale: 0.96 }] }]}
        >
          <View style={styles.shutterRing}>
            <View style={styles.shutter}>
              <Camera size={28} color={colors.textPrimary} strokeWidth={2.4} />
            </View>
          </View>
          <AppText variant="small" color={colors.white}>{t("check.capture")}</AppText>
        </Pressable>
        <Pressable
          onPress={() => setFlash(FLASH_CYCLE[(FLASH_CYCLE.indexOf(flash) + 1) % FLASH_CYCLE.length])}
          accessibilityRole="button"
          style={[styles.sideBtn, flash === "on" && styles.flashOn]}
        >
          <FlashIcon size={24} color={flash === "on" ? colors.textPrimary : colors.white} strokeWidth={2.4} />
          <AppText variant="small" color={flash === "on" ? colors.textPrimary : colors.white}>{t(`check.flash.${flash}`)}</AppText>
        </Pressable>
      </View>

      <ConfirmDialog
        visible={confirmClose}
        title={t("check.discardTitle")}
        body={t("check.discardBody")}
        confirmLabel={t("check.discard")}
        cancelLabel={t("check.keep")}
        destructive
        onCancel={() => setConfirmClose(false)}
        onConfirm={() => {
          setConfirmClose(false);
          flow.update({ photos: {}, retakeView: null });
          router.replace("/check/purpose");
        }}
      />
    </SafeAreaView>
  );
}

// Tiny green version of the overlay for the tip card's "Example" thumbnail
function CaptureOverlayExample({ view }) {
  return (
    <View style={styles.exampleArt}>
      <CaptureOverlay view={view} size={46} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cameraBg },
  flex: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20, paddingTop: 8 },
  closeBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.cameraControl, alignItems: "center", justifyContent: "center" },
  stepper: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  guide: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  guideArt: { backgroundColor: colors.primaryTint, borderRadius: 16, padding: 8, alignItems: "center", gap: 4 },
  guideTips: { flex: 1, gap: 8 },
  guideTip: { flexDirection: "row", alignItems: "center", gap: 8 },
  viewfinder: { flex: 1, backgroundColor: "#3D4A3A", overflow: "hidden", alignItems: "center", justifyContent: "center", padding: 16 },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  noCamera: { alignItems: "center", gap: 12, paddingHorizontal: 24 },
  hint: { position: "absolute", top: 24, backgroundColor: "rgba(16,21,15,0.75)", borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 8 },
  tipCard: {
    position: "absolute",
    bottom: 16,
    start: 16,
    end: 16,
    backgroundColor: "rgba(250,247,240,0.96)",
    borderRadius: 18,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  example: { alignItems: "center", gap: 2 },
  exampleArt: { width: 64, height: 56, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  exampleLabel: { fontSize: 11, lineHeight: 14, fontWeight: "700" },
  tipHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  busy: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(16,21,15,0.6)", alignItems: "center", justifyContent: "center", gap: 12 },
  problem: {
    position: "absolute",
    bottom: 16,
    start: 16,
    end: 16,
    backgroundColor: warningColors.bannerBg,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: warningColors.border,
    padding: 14,
    gap: 12
  },
  problemHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  problemActions: { flexDirection: "row", gap: 10 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14 },
  sideBtn: { width: 88, minHeight: 72, borderRadius: 16, backgroundColor: colors.cameraControl, alignItems: "center", justifyContent: "center", gap: 4 },
  flashOn: { backgroundColor: colors.accentBright },
  shutterWrap: { alignItems: "center", gap: 6 },
  shutterRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: colors.white, alignItems: "center", justifyContent: "center" },
  shutter: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" }
});
