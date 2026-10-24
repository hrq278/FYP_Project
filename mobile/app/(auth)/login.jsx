import { Link, useRouter } from "expo-router";
import { LogIn } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, StyleSheet, View } from "react-native";
import AppText from "../../src/components/AppText";
import { BrandRow, GuestLink, OrDivider, ServerLink, TermsNote } from "../../src/components/AuthShared";
import Button from "../../src/components/Button";
import { InfoBanner, Screen } from "../../src/components/Layout";
import TextField from "../../src/components/TextField";
import { useSession } from "../../src/context/SessionContext";
import { colors } from "../../src/theme";
import { errorKey, loginUser } from "../../services/api";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Spec §4.4 layout with email + password (decision 1); phone OTP and Google come later (Module 10)
export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { signIn, signInAsGuest } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(null); // "login" | "guest"

  const submit = async () => {
    const next = {};
    if (!EMAIL.test(email.trim())) next.email = t("auth.errors.email");
    if (password.length < 6) next.password = t("auth.errors.password");
    setErrors(next);
    setFormError(null);
    if (Object.keys(next).length) return;
    try {
      setBusy("login");
      const { token } = await loginUser({ email: email.trim().toLowerCase(), password });
      await signIn(token);
      router.replace("/home");
    } catch (error) {
      const message = error.response?.data?.message;
      setFormError(error.response?.status === 401 && message ? message : t(`auth.errors.${errorKey(error)}`));
    } finally {
      setBusy(null);
    }
  };

  const asGuest = async () => {
    try {
      setBusy("guest");
      await signInAsGuest();
      router.replace("/home");
    } catch (error) {
      setFormError(t(`auth.errors.${errorKey(error)}`));
    } finally {
      setBusy(null);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <BrandRow />
        <AppText variant="h1">{t("auth.loginTitle")}</AppText>
        <AppText variant="bodyLarge" weight={500} color={colors.textSecondary} style={styles.body}>
          {t("auth.loginBody")}
        </AppText>

        <View style={styles.form}>
          <TextField
            label={t("auth.email")}
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            ltr
            error={errors.email}
          />
          <TextField
            label={t("auth.password")}
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChangeText={setPassword}
            secure
            autoComplete="password"
            textContentType="password"
            error={errors.password}
            onSubmitEditing={submit}
          />
          {formError ? <InfoBanner variant="warning" text={formError} /> : null}
          <Button title={t("auth.login")} icon={LogIn} onPress={submit} loading={busy === "login"} disabled={busy === "guest"} />
        </View>

        <View style={styles.switchRow}>
          <AppText variant="body" color={colors.textMuted}>{t("auth.noAccount")} </AppText>
          <Link href="/register" replace accessibilityRole="link">
            <AppText variant="bodyStrong" color={colors.primary} style={styles.link}>{t("auth.createAccount")}</AppText>
          </Link>
        </View>

        <OrDivider />
        <GuestLink onPress={asGuest} disabled={Boolean(busy)} />
        <View style={styles.spacer} />
        <TermsNote />
        <ServerLink />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  body: { marginTop: 6, marginBottom: 24 },
  form: { gap: 18 },
  switchRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", flexWrap: "wrap", marginTop: 18, minHeight: 48 },
  link: { textDecorationLine: "underline" },
  spacer: { flex: 1, minHeight: 24 }
});
