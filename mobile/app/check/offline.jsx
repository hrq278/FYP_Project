import { useLocalSearchParams, useRouter } from "expo-router";
import { CircleCheck, Clock, RotateCcw, WifiOff } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import AppText from "../../src/components/AppText";
import { EmptyState, Screen } from "../../src/components/Layout";
import { useCheckFlow } from "../../src/context/CheckFlowContext";
import { colors, verdictColors } from "../../src/theme";

/**
 * Spec §5.1: the upload (or the progress check after it) failed for lack of internet.
 * `sent=1` means the photos already reached the server and the check carries on there;
 * otherwise they're queued on the phone (src/offline) and sent automatically when back online.
 */
export default function Offline() {
  const router = useRouter();
  const { t } = useTranslation();
  const { sent } = useLocalSearchParams();
  const flow = useCheckFlow();
  const uploaded = sent === "1";

  const later = () => {
    flow.reset();
    // Back to the tabs already underneath the check flow (replace would stack a second copy)
    router.dismissTo(uploaded ? "/history" : "/home");
  };

  return (
    <Screen fixed>
      <EmptyState
        tileBg={colors.surfaceMuted}
        illustration={<WifiOff size={76} color={verdictColors.not_recommended.fill} strokeWidth={2} />}
        title={t("offline.title")}
        body={uploaded ? t("offline.sentBody") : t("offline.body")}
        info={
          <View style={styles.info} accessibilityRole="text">
            <CircleCheck size={24} color={verdictColors.recommended.fill} strokeWidth={2.6} />
            <AppText variant="bodyStrong" style={styles.flex}>{uploaded ? t("offline.sentInfo") : t("offline.saved", { count: 5 })}</AppText>
          </View>
        }
        primary={{ title: t("common.retry"), icon: RotateCcw, onPress: () => router.replace("/check/processing") }}
        secondary={{ title: t("offline.later"), icon: Clock, onPress: later }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  info: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.borderSoft,
    padding: 14
  }
});
