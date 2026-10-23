import { useRouter } from "expo-router";
import { Info, LogOut, UserPlus } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import AppText from "../../src/components/AppText";
import Button from "../../src/components/Button";
import { Card, Screen } from "../../src/components/Layout";
import { SelectCard } from "../../src/components/Selection";
import { useSession } from "../../src/context/SessionContext";
import { useDirection } from "../../src/hooks/useDirection";
import { setLanguage } from "../../src/i18n";
import { colors, fonts } from "../../src/theme";
import { saveSettings } from "../../services/api";

// Basic profile: account, language switch, about, log out. Module 7 adds delete account and the full design.
export default function Profile() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, isGuest, signOut } = useSession();
  const [switching, setSwitching] = useState(false);
  const { ForwardChevron: Chevron } = useDirection();

  const pickLanguage = async (lang) => {
    if (lang === i18n.language || switching) return;
    setSwitching(true);
    if (!isGuest) saveSettings({ preferredLanguage: lang }).catch(() => {});
    const reloading = await setLanguage(lang);
    if (!reloading) setSwitching(false);
  };

  const logout = async () => {
    await signOut();
    router.replace("/login");
  };

  return (
    <Screen edges={["top"]}>
      <AppText variant="h1" style={styles.title}>{t("profile.title")}</AppText>

      <Card style={styles.account}>
        <View style={styles.avatar}>
          <AppText variant="h1" color={colors.white} latin>{(user?.name || "G").charAt(0).toUpperCase()}</AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="cardTitle">{user?.name || t("profile.guest")}</AppText>
          {user?.email ? <AppText variant="caption" weight={500} color={colors.textMuted} latin>{user.email}</AppText> : null}
        </View>
      </Card>
      {isGuest ? <Button title={t("profile.signUp")} icon={UserPlus} onPress={() => router.push("/register")} style={styles.gap} /> : null}

      <AppText variant="section" style={styles.section}>{t("profile.language")}</AppText>
      <View style={styles.langRow} accessibilityRole="radiogroup">
        <SelectCard selected={i18n.language === "en"} onPress={() => pickLanguage("en")} style={styles.langCard} accessibilityLabel="English">
          <AppText variant="cardTitle" latin>English</AppText>
        </SelectCard>
        <SelectCard selected={i18n.language === "ur"} onPress={() => pickLanguage("ur")} style={styles.langCard} accessibilityLabel="Urdu">
          <AppText style={styles.urdu}>اردو</AppText>
        </SelectCard>
      </View>

      <Pressable onPress={() => router.push("/about")} accessibilityRole="button" style={styles.row}>
        <Info size={24} color={colors.primary} strokeWidth={2.4} />
        <AppText variant="bodyLarge" weight={700} style={styles.flex}>{t("profile.about")}</AppText>
        <Chevron size={22} color={colors.iconMuted} />
      </Pressable>

      <View style={styles.spacer} />
      <Button title={t("profile.logout")} icon={LogOut} variant="outline" onPress={logout} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { marginBottom: 16 },
  account: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  gap: { marginTop: 12 },
  section: { marginTop: 28, marginBottom: 12 },
  langRow: { flexDirection: "row", gap: 12 },
  langCard: { flex: 1, minHeight: 72, justifyContent: "center", paddingEnd: 52 },
  urdu: { fontFamily: fonts.urdu[700], fontSize: 20, lineHeight: 40 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    marginTop: 20,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderSoft
  },
  spacer: { flex: 1, minHeight: 32 }
});
