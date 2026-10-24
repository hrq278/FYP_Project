import { useRouter } from "expo-router";
import { CircleCheck, PlugZap, RotateCcw, Save, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import AppText from "../src/components/AppText";
import Button from "../src/components/Button";
import { InfoBanner, Screen, ScreenHeader } from "../src/components/Layout";
import TextField from "../src/components/TextField";
import { colors, verdictColors } from "../src/theme";
import { DEFAULT_SERVER, getServerUrl, normalizeServerUrl, saveServerUrl, testServer } from "../services/api";

const shown = (url) => url.replace(/^http:\/\//, "");

// Where the app finds the backend. Needed for the installed app (APK): the laptop's address changes with the network.
export default function ServerSettings() {
  const router = useRouter();
  const { t } = useTranslation();
  const [text, setText] = useState(shown(getServerUrl()));
  const [status, setStatus] = useState(null); // { ok, text }
  const [busy, setBusy] = useState(null); // "test" | "save"

  const check = async () => {
    const url = normalizeServerUrl(text);
    if (!url) {
      setStatus({ ok: false, text: t("server.invalid") });
      return null;
    }
    const ok = await testServer(url);
    setStatus({ ok, text: ok ? t("server.ok") : t("server.fail") });
    return { url, ok };
  };

  const test = async () => {
    setBusy("test");
    await check();
    setBusy(null);
  };

  const save = async () => {
    setBusy("save");
    const result = await check();
    if (result) {
      await saveServerUrl(result.url);
      setText(shown(result.url));
      // Saved either way (the laptop may not be started yet); leave the screen only when it answered
      if (result.ok && router.canGoBack()) router.back();
      else if (result.ok) router.replace("/");
    }
    setBusy(null);
  };

  const reset = () => {
    setText(shown(DEFAULT_SERVER));
    setStatus(null);
  };

  return (
    <Screen>
      <ScreenHeader title={t("server.title")} />
      <AppText variant="bodyLarge" weight={500} color={colors.textSecondary} style={styles.intro}>{t("server.intro")}</AppText>
      <TextField
        label={t("server.label")}
        value={text}
        onChangeText={(v) => {
          setText(v);
          setStatus(null);
        }}
        placeholder="192.168.43.12:3000"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        ltr
      />
      {status ? (
        <View style={styles.status} accessibilityLiveRegion="polite">
          {status.ok ? (
            <CircleCheck size={22} color={verdictColors.recommended.fill} strokeWidth={2.6} />
          ) : (
            <TriangleAlert size={22} color={verdictColors.not_recommended.fill} strokeWidth={2.6} />
          )}
          <AppText variant="bodyStrong" color={status.ok ? verdictColors.recommended.text : verdictColors.not_recommended.text} style={styles.flex}>
            {status.text}
          </AppText>
        </View>
      ) : null}
      <View style={styles.actions}>
        <Button title={t("server.save")} icon={Save} onPress={save} loading={busy === "save"} disabled={Boolean(busy)} />
        <Button title={t("server.test")} icon={PlugZap} variant="outline" onPress={test} loading={busy === "test"} disabled={Boolean(busy)} />
        <Button title={t("server.reset")} icon={RotateCcw} variant="neutral" size="normal" onPress={reset} disabled={Boolean(busy)} />
      </View>
      <View style={styles.help}>
        <InfoBanner text={t("server.help")} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  intro: { marginBottom: 16 },
  status: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14 },
  actions: { gap: 12, marginTop: 24 },
  help: { marginTop: 20 }
});
