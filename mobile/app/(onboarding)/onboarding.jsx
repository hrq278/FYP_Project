import { useRouter } from "expo-router";
import {
  Camera,
  Dna,
  FileText,
  HeartPulse,
  ScanFace,
  Share2,
  ShieldCheck,
  Smile,
  Sparkles
} from "lucide-react-native";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import AppText from "../../src/components/AppText";
import Button from "../../src/components/Button";
import { CattleHeadIcon, CattleSide, PhoneViewfinder } from "../../src/components/Illustrations";
import { Screen } from "../../src/components/Layout";
import { PageDots } from "../../src/components/Selection";
import { useSession } from "../../src/context/SessionContext";
import { useDirection } from "../../src/hooks/useDirection";
import { colors, radii, spacing } from "../../src/theme";

const PANEL_HEIGHT = 340;

// Step 2: the four checks around a cattle head; step 3: a report card with a verdict
function ChecksArt() {
  return (
    <View style={styles.artCenter}>
      <View style={styles.checkHead}>
        <CattleHeadIcon size={110} />
      </View>
      {[Sparkles, Dna, Smile, HeartPulse].map((Icon, i) => (
        <View key={i} style={[styles.orbit, [styles.o1, styles.o2, styles.o3, styles.o4][i]]}>
          <Icon size={26} color={colors.primary} strokeWidth={2.2} />
        </View>
      ))}
    </View>
  );
}

function ReportArt() {
  return (
    <View style={styles.artCenter}>
      <View style={styles.reportCard}>
        <CattleSide width={150} />
        <View style={styles.reportBadge}>
          <ShieldCheck size={22} color={colors.white} strokeWidth={2.6} />
          <View style={styles.reportBar} />
        </View>
        <View style={[styles.reportLine, { width: "80%" }]} />
        <View style={[styles.reportLine, { width: "60%" }]} />
      </View>
    </View>
  );
}

const STEPS = [
  { key: "s1", art: () => <PhoneViewfinder size={170} />, chips: [["s1ChipBody", Camera], ["s1ChipFace", ScanFace], ["s1ChipTeeth", Smile]] },
  { key: "s2", art: ChecksArt, chips: [["s2ChipSpecies", Sparkles], ["s2ChipBreed", Dna], ["s2ChipHealth", HeartPulse]] },
  { key: "s3", art: ReportArt, chips: [["s3ChipVerdict", ShieldCheck], ["s3ChipPdf", FileText], ["s3ChipShare", Share2]] }
];

// Spec §4.3: 3-step carousel, shown once
export default function Onboarding() {
  const router = useRouter();
  const { t } = useTranslation();
  const { finishOnboarding } = useSession();
  const { width } = useWindowDimensions();
  const pageWidth = width - spacing.screen * 2;
  const listRef = useRef(null);
  const [index, setIndex] = useState(0);
  const { ForwardArrow: Arrow } = useDirection();
  const last = index === STEPS.length - 1;

  const done = async () => {
    await finishOnboarding();
    router.replace("/login");
  };
  const next = () => {
    if (last) return done();
    listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    setIndex(index + 1);
    return undefined;
  };

  return (
    <Screen
      fixed
      footer={
        <View style={styles.footer}>
          <PageDots count={STEPS.length} index={index} />
          <View style={styles.buttons}>
            <Button title={t("common.skip")} variant="outline" onPress={done} style={styles.skipBtn} />
            <Button title={last ? t("common.getStarted") : t("common.next")} trailingIcon={Arrow} onPress={next} style={styles.nextBtn} />
          </View>
        </View>
      }
    >
      <View style={styles.topRow}>
        <View style={styles.stepPill}>
          <AppText variant="caption" weight={800} color={colors.primary}>
            {t("onboarding.step", { current: index + 1, total: STEPS.length })}
          </AppText>
        </View>
        <Pressable onPress={done} accessibilityRole="link" style={styles.skipLink} hitSlop={8}>
          <AppText variant="bodyStrong" color={colors.primary}>{t("common.skip")}</AppText>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={STEPS}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.key}
        getItemLayout={(_, i) => ({ length: pageWidth, offset: pageWidth * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / pageWidth))}
        renderItem={({ item }) => {
          const Art = item.art;
          return (
            <View style={{ width: pageWidth }}>
              <View style={styles.panel}>
                <Art />
              </View>
              <AppText variant="h1" style={styles.title}>{t(`onboarding.${item.key}Title`)}</AppText>
              <AppText variant="bodyLarge" weight={500} color={colors.textSecondary}>
                {t(`onboarding.${item.key}Body`)}
              </AppText>
              <View style={styles.chips}>
                {item.chips.map(([label, Icon]) => (
                  <View key={label} style={styles.miniChip}>
                    <Icon size={24} color={colors.primary} strokeWidth={2.2} />
                    <AppText variant="caption" weight={700}>{t(`onboarding.${label}`)}</AppText>
                  </View>
                ))}
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  stepPill: { backgroundColor: colors.primaryTint, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 6 },
  skipLink: { minHeight: 48, justifyContent: "center" },
  panel: { height: PANEL_HEIGHT, borderRadius: 28, backgroundColor: colors.primaryTint, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  title: { marginBottom: 8 },
  chips: { flexDirection: "row", gap: 10, marginTop: 20 },
  miniChip: {
    flex: 1,
    minHeight: 84,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  footer: { gap: 18 },
  buttons: { flexDirection: "row", gap: 12 },
  skipBtn: { flex: 1 },
  nextBtn: { flex: 2 },
  artCenter: { width: 260, height: 260, alignItems: "center", justifyContent: "center" },
  checkHead: { width: 150, height: 150, borderRadius: 75, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  orbit: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center"
  },
  o1: { top: 6, start: 22 },
  o2: { top: 6, end: 22 },
  o3: { bottom: 6, start: 22 },
  o4: { bottom: 6, end: 22 },
  reportCard: { width: 220, backgroundColor: colors.surface, borderRadius: 22, padding: 18, gap: 10, borderWidth: 2, borderColor: colors.borderSoft },
  reportBadge: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#1E7A3E", borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  reportBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.7)" },
  reportLine: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceMuted }
});
