import { useTranslation } from "react-i18next";
import { Image, StyleSheet, View } from "react-native";
import AppText from "../src/components/AppText";
import { CattleHeadIcon } from "../src/components/Illustrations";
import { Card, Screen, ScreenHeader } from "../src/components/Layout";
import { colors } from "../src/theme";

const TEAM = [
  { name: "Haroon Rasheed", rollNo: "22CS070", image: require("../assets/images/hrq.jpg") },
  { name: "Abdul Mutali", rollNo: "22CS114", image: require("../assets/images/mutali.jpg") },
  { name: "Syed Eiman Ali Shah", rollNo: "22CS006", image: require("../assets/images/eimans.jpg") }
];

// Reached from Profile
export default function About() {
  const { t } = useTranslation();
  return (
    <Screen>
      <ScreenHeader title={t("about.title")} />
      <View style={styles.logo}>
        <CattleHeadIcon size={64} color={colors.white} />
      </View>
      <AppText variant="bodyLarge" weight={500} color={colors.textSecondary} style={styles.body}>
        {t("about.body")}
      </AppText>

      <AppText variant="section" style={styles.section}>{t("about.team")}</AppText>
      <Card style={styles.team}>
        {TEAM.map((m) => (
          <View key={m.rollNo} style={styles.member}>
            <Image source={m.image} style={styles.avatar} accessibilityIgnoresInvertColors />
            <View>
              <AppText variant="cardTitle" latin>{m.name}</AppText>
              <AppText variant="caption" color={colors.textMuted} latin>{m.rollNo}</AppText>
            </View>
          </View>
        ))}
      </Card>
      <AppText variant="body" weight={700} style={styles.footer}>{t("about.supervisor")}</AppText>
      <AppText variant="caption" color={colors.textMuted}>{t("about.university")}</AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { width: 96, height: 96, borderRadius: 28, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  body: { marginBottom: 8 },
  section: { marginTop: 20, marginBottom: 12 },
  team: { gap: 14 },
  member: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  footer: { marginTop: 20 }
});
