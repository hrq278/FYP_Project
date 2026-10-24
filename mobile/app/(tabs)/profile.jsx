import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { Info, LogOut, Server, ShieldCheck, Trash2, UserPlus } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import AppText from "../../src/components/AppText";
import Button from "../../src/components/Button";
import { Card, ConfirmDialog, InfoBanner, Screen } from "../../src/components/Layout";
import { SelectCard } from "../../src/components/Selection";
import { useSession } from "../../src/context/SessionContext";
import { useDirection } from "../../src/hooks/useDirection";
import { setLanguage } from "../../src/i18n";
import { colors, fonts, verdictColors } from "../../src/theme";
import { saveSettings } from "../../services/api";

function Row({ icon: Icon, label, onPress }) {
  const { ForwardChevron: Chevron } = useDirection();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
      <Icon size={24} color={colors.primary} strokeWidth={2.4} />
      <AppText variant="bodyLarge" weight={700} style={styles.flex}>{label}</AppText>
      <Chevron size={22} color={colors.iconMuted} />
    </Pressable>
  );
}

// Profile (not in the design; built from the design system, decision 8)
export default function Profile() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, isGuest, signOut, deleteAccount } = useSession();
  const [switching, setSwitching] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

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

  const removeAccount = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
      setConfirmDelete(false);
      router.replace("/login");
    } catch {
      setError(t("profileFull.deleteError"));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={styles.flex}>
      <Screen edges={["top"]}>
        <AppText variant="h1" style={styles.title}>{t("profile.title")}</AppText>

        <Card style={styles.account}>
          <View style={styles.avatar}>
            <AppText variant="h1" color={colors.white} latin>{(user?.name || "G").charAt(0).toUpperCase()}</AppText>
          </View>
          <View style={styles.flex}>
            <AppText variant="cardTitle">{user?.name || t("profile.guest")}</AppText>
            {user?.email ? <AppText variant="caption" weight={500} color={colors.textMuted} latin numberOfLines={1}>{user.email}</AppText> : null}
          </View>
        </Card>
        {isGuest ? (
          <View style={styles.guest}>
            <InfoBanner text={t("profileFull.guestBody")} />
            <Button title={t("profile.signUp")} icon={UserPlus} onPress={() => router.push("/register")} />
          </View>
        ) : null}

        <AppText variant="section" style={styles.section}>{t("profile.language")}</AppText>
        <View style={styles.langRow} accessibilityRole="radiogroup">
          <SelectCard selected={i18n.language === "en"} onPress={() => pickLanguage("en")} style={styles.langCard} accessibilityLabel="English">
            <AppText variant="cardTitle" latin>English</AppText>
          </SelectCard>
          <SelectCard selected={i18n.language === "ur"} onPress={() => pickLanguage("ur")} style={styles.langCard} accessibilityLabel="Urdu">
            <AppText style={styles.urdu}>اردو</AppText>
          </SelectCard>
        </View>
        {switching ? <AppText variant="caption" color={colors.textMuted} style={styles.switching}>{t("profileFull.switching")}</AppText> : null}

        <View style={styles.rows}>
          <Row icon={Info} label={t("profile.about")} onPress={() => router.push("/about")} />
          <Row icon={ShieldCheck} label={t("profileFull.privacy")} onPress={() => router.push("/legal")} />
          <Row icon={Server} label={t("server.title")} onPress={() => router.push("/server")} />
        </View>

        {error ? <View style={styles.gap}><InfoBanner variant="warning" text={error} /></View> : null}

        <View style={styles.spacer} />
        <Button title={t("profile.logout")} icon={LogOut} variant="outline" onPress={logout} />
        {!isGuest ? (
          <Pressable onPress={() => setConfirmDelete(true)} accessibilityRole="button" style={styles.delete}>
            <Trash2 size={20} color={verdictColors.not_recommended.fill} strokeWidth={2.4} />
            <AppText variant="bodyStrong" color={verdictColors.not_recommended.fill}>{t("profileFull.deleteAccount")}</AppText>
          </Pressable>
        ) : null}
        <AppText variant="small" weight={500} color={colors.textMuted} align="center" style={styles.version}>
          {t("profileFull.version", { version: Constants.expoConfig?.version || "1.0.0" })}
        </AppText>
      </Screen>
      <ConfirmDialog
        visible={confirmDelete}
        title={t("profileFull.deleteTitle")}
        body={t("profileFull.deleteBody")}
        confirmLabel={deleting ? "…" : t("profileFull.deleteConfirm")}
        cancelLabel={t("common.cancel")}
        destructive
        onCancel={() => setConfirmDelete(false)}
        onConfirm={removeAccount}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { marginBottom: 16 },
  account: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  guest: { gap: 10, marginTop: 12 },
  section: { marginTop: 28, marginBottom: 12 },
  langRow: { flexDirection: "row", gap: 12 },
  langCard: { flex: 1, minHeight: 72, justifyContent: "center", paddingEnd: 52 },
  urdu: { fontFamily: fonts.urdu[700], fontSize: 20, lineHeight: 40 },
  switching: { marginTop: 8 },
  rows: { gap: 10, marginTop: 20 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.borderSoft
  },
  gap: { marginTop: 12 },
  spacer: { flex: 1, minHeight: 32 },
  delete: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 52, marginTop: 8 },
  version: { marginTop: 4 }
});
