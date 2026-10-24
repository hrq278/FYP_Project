import { Server, UserRound } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { getServerUrl } from "../../services/api";
import { colors } from "../theme";
import AppText from "./AppText";
import { CattleHeadIcon } from "./Illustrations";

// Small logo tile + wordmark used at the top of the auth screens
export function BrandRow() {
  return (
    <View style={styles.brand}>
      <View style={styles.logo}>
        <CattleHeadIcon size={40} color={colors.white} strokeWidth={3.4} />
      </View>
      <AppText variant="title" latin>
        Maweshi<AppText variant="title" color={colors.accentText} latin>AI</AppText>
      </AppText>
    </View>
  );
}

// "or" divider
export function OrDivider() {
  const { t } = useTranslation();
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <AppText variant="caption" color={colors.textMuted}>{t("common.or")}</AppText>
      <View style={styles.line} />
    </View>
  );
}

export function GuestLink({ onPress, disabled }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" style={styles.guest} hitSlop={6}>
      <UserRound size={22} color={colors.primary} strokeWidth={2.4} />
      <AppText variant="bodyLarge" weight={700} color={colors.primary} style={styles.underline}>
        {t("auth.guest")}
      </AppText>
    </Pressable>
  );
}

export function TermsNote() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push("/legal")} accessibilityRole="link" hitSlop={6}>
      <AppText variant="caption" weight={500} color={colors.textMuted} align="center" style={styles.underline}>
        {t("auth.terms", { terms: t("auth.termsLink"), privacy: t("auth.privacyLink") })}
      </AppText>
    </Pressable>
  );
}

// "Server: 192.168.43.12:3000 · Change" under the login form, for the installed app on a new network
export function ServerLink() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Pressable onPress={() => router.push("/server")} accessibilityRole="link" style={styles.server} hitSlop={6}>
      <Server size={16} color={colors.textMuted} strokeWidth={2.4} />
      <AppText variant="small" weight={500} color={colors.textMuted} latin>
        {getServerUrl().replace(/^http:\/\//, "")}
      </AppText>
      <AppText variant="small" color={colors.primary} style={styles.underline}>{t("server.change")}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  server: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 40, marginTop: 4 },
  brand: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 28 },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  divider: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  line: { flex: 1, height: 2, backgroundColor: colors.borderSoft },
  guest: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48 },
  underline: { textDecorationLine: "underline" }
});
