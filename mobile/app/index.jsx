import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../src/components/AppText";
import { CattleHeadIcon, Hills } from "../src/components/Illustrations";
import { useSession } from "../src/context/SessionContext";
import { loadLanguage } from "../src/i18n";
import { colors } from "../src/theme";

const MIN_SPLASH_MS = 1200;

// Spec §4.1: green splash with logo, wordmark, tagline and an amber loading bar
export default function Splash() {
  const router = useRouter();
  const { t } = useTranslation();
  const session = useSession();
  const progress = useRef(new Animated.Value(0)).current;
  const [language, setLanguage] = useState(undefined); // undefined = not read yet, null = first launch

  useEffect(() => {
    loadLanguage().then(setLanguage);
    Animated.timing(progress, { toValue: 1, duration: MIN_SPLASH_MS, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [progress]);

  useEffect(() => {
    if (!session.ready || language === undefined) return undefined;
    const timer = setTimeout(() => {
      if (!language) router.replace("/language");
      else if (!session.onboardingDone) router.replace("/onboarding");
      else if (!session.token) router.replace("/login");
      else router.replace("/home");
    }, MIN_SPLASH_MS);
    return () => clearTimeout(timer);
  }, [session.ready, session.onboardingDone, session.token, language, router]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <View style={styles.halo}>
          <View style={styles.logoTile}>
            <CattleHeadIcon size={88} color={colors.primary} strokeWidth={3} />
          </View>
        </View>
        <AppText variant="display" color={colors.white} latin style={styles.wordmark}>
          Maweshi<AppText variant="display" color={colors.accentBright} latin>AI</AppText>
        </AppText>
        <AppText variant="bodyLarge" weight={500} color={colors.primaryTint} align="center">
          {t("app.tagline")}
        </AppText>
      </View>
      <View style={styles.bottom}>
        <View style={styles.track} accessibilityRole="progressbar">
          <Animated.View style={[styles.fill, { width: progress.interpolate({ inputRange: [0, 1], outputRange: ["8%", "100%"] }) }]} />
        </View>
        <AppText variant="body" weight={500} color={colors.primaryTint}>
          {t("app.loading")}
        </AppText>
        <Hills />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.primary },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 24 },
  halo: { padding: 12, borderRadius: 52, backgroundColor: "rgba(255,255,255,0.12)", marginBottom: 12 },
  logoTile: { width: 136, height: 136, borderRadius: 40, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  wordmark: { marginTop: 8 },
  bottom: { alignItems: "center", gap: 14, paddingBottom: 12 },
  track: { width: 160, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.25)", overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: colors.accentBright }
});
