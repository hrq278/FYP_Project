import { useRouter } from "expo-router";
import { Globe } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import AppText from "../../src/components/AppText";
import Button from "../../src/components/Button";
import { Screen } from "../../src/components/Layout";
import { IconTile, SelectCard } from "../../src/components/Selection";
import { useDirection } from "../../src/hooks/useDirection";
import { setLanguage } from "../../src/i18n";
import { colors, fonts } from "../../src/theme";

// Spec §4.2. Picking Urdu switches the app to right-to-left, which needs one restart
export default function LanguageScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [choice, setChoice] = useState(i18n.language === "ur" ? "ur" : "en");
  const [saving, setSaving] = useState(false);
  const { ForwardArrow: Arrow } = useDirection();

  const onContinue = async () => {
    setSaving(true);
    const reloading = await setLanguage(choice);
    if (!reloading) router.replace("/onboarding");
  };

  return (
    <Screen
      fixed
      footer={
        <View style={styles.footer}>
          <AppText variant="body" weight={500} color={colors.textMuted} align="center">
            {t("language.note")}
          </AppText>
          <Button title={t("common.continue")} trailingIcon={Arrow} onPress={onContinue} loading={saving} />
        </View>
      }
    >
      <IconTile icon={Globe} size={64} style={styles.globe} />
      <AppText variant="h1">{t("language.title")}</AppText>
      <AppText variant="title" weight={500} color={colors.textSecondary} style={[styles.urduSub, i18n.language === "ur" ? null : styles.urduFont]}>
        {t("language.subtitleUrdu")}
      </AppText>

      <View style={styles.cards} accessibilityRole="radiogroup">
        <SelectCard selected={choice === "en"} onPress={() => setChoice("en")} accessibilityLabel="English" style={styles.card}>
          <View style={styles.cardRow}>
            <IconTile size={60}>
              <AppText variant="title" color={colors.primary} latin>Aa</AppText>
            </IconTile>
            <View>
              <AppText variant="title" latin>English</AppText>
              <AppText variant="body" color={colors.textMuted}>{t("language.englishHint")}</AppText>
            </View>
          </View>
        </SelectCard>
        <SelectCard selected={choice === "ur"} onPress={() => setChoice("ur")} accessibilityLabel="Urdu" style={styles.card}>
          <View style={styles.cardRow}>
            <IconTile size={60}>
              <AppText style={styles.urduGlyph} color={colors.primary}>اب</AppText>
            </IconTile>
            <View>
              <AppText style={styles.urduName}>اردو</AppText>
              <AppText variant="body" color={colors.textMuted}>{t("language.urduHint")}</AppText>
            </View>
          </View>
        </SelectCard>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  globe: { marginTop: 16, marginBottom: 20 },
  urduSub: { marginTop: 4, marginBottom: 28 },
  urduFont: { fontFamily: fonts.urdu[500], fontSize: 20, lineHeight: 40, textAlign: "left" },
  cards: { gap: 16 },
  card: { minHeight: 104, justifyContent: "center" },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingEnd: 40 },
  urduGlyph: { fontFamily: fonts.urdu[700], fontSize: 26, lineHeight: 50 },
  urduName: { fontFamily: fonts.urdu[700], fontSize: 22, lineHeight: 44 },
  footer: { gap: 16 }
});
