import { useLocalSearchParams, useRouter } from "expo-router";
import { Camera, CircleHelp, Sun, X } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import AppText from "../../src/components/AppText";
import { EmptyState, Screen } from "../../src/components/Layout";
import { useCheckFlow } from "../../src/context/CheckFlowContext";
import { useDirection } from "../../src/hooks/useDirection";
import { colors, verdictColors } from "../../src/theme";
import { CattleHeadIcon } from "../../src/components/Illustrations";

// Spec §5.2: the species check says the photo isn't a cow or buffalo
export default function WrongImage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { view = "front" } = useLocalSearchParams();
  const flow = useCheckFlow();
  const { rtl } = useDirection();

  const retake = () => {
    flow.update({ evaluationId: null, retakeView: flow.photos.teeth ? view : null });
    router.replace(`/check/capture/${view}`);
  };

  return (
    <Screen fixed>
      <EmptyState
        tileBg={verdictColors.not_recommended.bg}
        illustration={
          <View>
            <CattleHeadIcon size={92} color={verdictColors.not_recommended.fill} strokeWidth={3} />
            <View style={[styles.badge, rtl ? { left: -18 } : { right: -18 }]}>
              <X size={22} color={colors.white} strokeWidth={3} />
            </View>
          </View>
        }
        title={t("check.wrongTitle")}
        body={t("check.wrongBody")}
        info={
          <View style={styles.info}>
            <Sun size={22} color={colors.accentText} strokeWidth={2.4} />
            <AppText variant="body" weight={700} style={styles.flex}>{t("check.wrongTip")}</AppText>
          </View>
        }
        primary={{ title: t("check.retakePhoto"), icon: Camera, onPress: retake }}
        secondary={{ title: t("check.seeTips"), icon: CircleHelp, onPress: () => router.push("/onboarding") }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  badge: {
    position: "absolute",
    bottom: -14,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: verdictColors.not_recommended.fill,
    borderWidth: 3,
    borderColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
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
