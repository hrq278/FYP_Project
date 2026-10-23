import { CircleAlert } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import AppText from "../src/components/AppText";
import { Card, InfoBanner, Screen, ScreenHeader } from "../src/components/Layout";
import { colors } from "../src/theme";

// Plain-language data use (linked from Profile and the auth screens' terms note)
export default function Legal() {
  const { t } = useTranslation();
  const items = t("legal.items", { returnObjects: true });
  return (
    <Screen>
      <ScreenHeader title={t("legal.title")} />
      <AppText variant="bodyLarge" weight={500} color={colors.textSecondary} style={styles.intro}>{t("legal.intro")}</AppText>
      <Card style={styles.card}>
        {items.map((x, i) => (
          <View key={i} style={styles.item}>
            <AppText variant="bodyStrong" color={colors.primary} latin>{i + 1}.</AppText>
            <AppText variant="body" weight={500} color={colors.textSecondary} style={styles.flex}>{x}</AppText>
          </View>
        ))}
      </Card>
      <View style={styles.advice}>
        <InfoBanner variant="warning" icon={CircleAlert} text={t("legal.advice")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { marginBottom: 14 },
  card: { gap: 12 },
  item: { flexDirection: "row", gap: 10 },
  advice: { marginTop: 16 }
});
