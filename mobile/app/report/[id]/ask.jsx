import { useLocalSearchParams, useRouter } from "expo-router";
import * as Speech from "expo-speech";
import { Send, Sparkles, Square, Volume2 } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../../../src/components/AppText";
import { CattleHeadIcon } from "../../../src/components/Illustrations";
import { BackButton, InfoBanner } from "../../../src/components/Layout";
import { Chip } from "../../../src/components/Selection";
import { colors, fonts, radii, verdictColors } from "../../../src/theme";
import { askQuestion, getEvaluation } from "../../../services/api";

// Spec §4.13: questions about this one animal, answered from its report
export default function Ask() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const ur = i18n.language === "ur";
  const [e, setE] = useState(null);
  const [messages, setMessages] = useState([]);
  const [suggestions, setSuggestions] = useState(() => t("ask.defaults", { returnObjects: true }));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [speaking, setSpeaking] = useState(null); // index of the message being read aloud
  const scroll = useRef(null);

  useEffect(() => {
    getEvaluation(id)
      .then((ev) => {
        setE(ev);
        setMessages(ev.chat || []);
        const last = [...(ev.chat || [])].reverse().find((m) => m.role === "assistant" && m.suggestions?.length);
        if (last) setSuggestions(last.suggestions);
      })
      .catch(() => setNotice(t("ask.error")));
    return () => {
      Speech.stop();
    };
  }, [id, t]);

  const send = async (question) => {
    const q = (question ?? text).trim();
    if (!q || busy) return;
    setText("");
    setNotice(null);
    setMessages((m) => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const res = await askQuestion(id, q);
      setMessages(res.chat);
      if (res.suggestions?.length) setSuggestions(res.suggestions);
    } catch (error) {
      setMessages((m) => m.slice(0, -1)); // the question wasn't answered or saved
      setText(q);
      if (error.response?.status === 503) {
        setNotice(t("ask.unavailable"));
        if (error.response.data?.suggestions?.length) setSuggestions(error.response.data.suggestions);
      } else {
        setNotice(t("ask.error"));
      }
    } finally {
      setBusy(false);
    }
  };

  const listen = (index, content) => {
    Speech.stop();
    if (speaking === index) {
      setSpeaking(null);
      return;
    }
    setSpeaking(index);
    Speech.speak(content, { language: ur ? "ur-PK" : "en-US", onDone: () => setSpeaking(null), onStopped: () => setSpeaking(null), onError: () => setSpeaking(null) });
  };

  const vc = e?.verdict ? verdictColors[e.verdict] : null;

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.header}>
          <View style={styles.headRow}>
            <BackButton onPress={() => router.back()} />
            <AppText variant="title" style={styles.flex}>{t("ask.title")}</AppText>
          </View>
          {e ? (
            <Pressable onPress={() => router.back()} accessibilityRole="button" style={styles.linked}>
              <View style={styles.thumb}><CattleHeadIcon size={30} /></View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {e.results?.breed?.final?.label || t(`species.${e.results?.species?.species || "cow"}`)} · {t(`purpose.${e.purpose}`)}
                </AppText>
                {vc ? (
                  <AppText variant="small" color={vc.text}>
                    {t(`verdict.${e.verdict}`)} · <AppText variant="small" color={vc.text} latin>{e.score}/100</AppText>
                  </AppText>
                ) : null}
              </View>
              <AppText variant="caption" weight={700} color={colors.primary}>{t("ask.viewReport")}</AppText>
            </Pressable>
          ) : null}
        </View>

        <ScrollView ref={scroll} style={styles.flex} contentContainerStyle={styles.messages} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })}>
          {messages.map((m, i) =>
            m.role === "user" ? (
              <View key={i} style={styles.userBubble}>
                <AppText variant="bodyLarge" weight={600} color={colors.white}>{m.content}</AppText>
              </View>
            ) : (
              <View key={i} style={styles.aiBubble}>
                <View style={styles.aiHead}>
                  <Sparkles size={16} color={colors.primary} strokeWidth={2.6} />
                  <AppText variant="small" color={colors.primary} latin>MaweshiAI</AppText>
                </View>
                <AppText variant="bodyLarge" weight={500}>{m.content}</AppText>
                <Pressable onPress={() => listen(i, m.content)} accessibilityRole="button" style={styles.listen}>
                  {speaking === i ? <Square size={18} color={colors.primary} strokeWidth={2.6} /> : <Volume2 size={18} color={colors.primary} strokeWidth={2.6} />}
                  <AppText variant="caption" weight={700} color={colors.primary}>{speaking === i ? t("ask.stop") : t("ask.listen")}</AppText>
                </Pressable>
              </View>
            )
          )}
          {busy ? (
            <View style={[styles.aiBubble, styles.thinking]}>
              <ActivityIndicator color={colors.primary} />
              <AppText variant="body" color={colors.textMuted}>{t("ask.thinking")}</AppText>
            </View>
          ) : null}
          {notice ? <InfoBanner variant="warning" text={notice} /> : null}
        </ScrollView>

        <View style={styles.composer}>
          <AppText variant="caption" color={colors.textMuted}>{t("ask.suggested")}</AppText>
          <View style={styles.chips}>
            {suggestions.slice(0, 3).map((s) => (
              <Chip key={s} label={s} variant="suggestion" onPress={() => send(s)} />
            ))}
          </View>
          <View style={styles.inputRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t("ask.placeholder")}
              placeholderTextColor={colors.iconMuted}
              style={[styles.input, ur && styles.inputUrdu]}
              onSubmitEditing={() => send()}
              returnKeyType="send"
              maxLength={500}
              accessibilityLabel={t("ask.placeholder")}
            />
            <Pressable
              onPress={() => send()}
              disabled={!text.trim() || busy}
              accessibilityRole="button"
              accessibilityLabel={t("ask.send")}
              style={[styles.send, (!text.trim() || busy) && { opacity: 0.5 }]}
            >
              <Send size={22} color={colors.textPrimary} strokeWidth={2.4} />
              <AppText variant="bodyStrong">{t("ask.send")}</AppText>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: { backgroundColor: colors.surface, paddingHorizontal: 20, paddingVertical: 12, gap: 12, borderBottomWidth: 2, borderBottomColor: colors.borderSoft },
  headRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  linked: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: colors.primaryTintSoft, borderWidth: 2, borderColor: colors.primaryTintBorder, borderRadius: 18, padding: 10 },
  thumb: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#EDE3D2", alignItems: "center", justifyContent: "center" },
  messages: { padding: 20, gap: 14 },
  userBubble: { alignSelf: "flex-end", maxWidth: "85%", backgroundColor: colors.primary, borderRadius: 20, borderBottomEndRadius: 6, paddingHorizontal: 16, paddingVertical: 12 },
  aiBubble: { alignSelf: "flex-start", maxWidth: "90%", backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.borderSoft, borderRadius: 20, borderBottomStartRadius: 6, padding: 14, gap: 8 },
  aiHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  listen: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", minHeight: 40, paddingHorizontal: 12, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.border },
  thinking: { flexDirection: "row", alignItems: "center" },
  composer: { backgroundColor: colors.surface, borderTopWidth: 2, borderTopColor: colors.borderSoft, padding: 16, gap: 10 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8, minWidth: 0 },
  inputRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  input: { flex: 1, minWidth: 0, minHeight: 56, borderRadius: radii.button, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.background, paddingHorizontal: 16, fontSize: 17, fontFamily: fonts.latin[500], color: colors.textPrimary },
  inputUrdu: { fontFamily: fonts.urdu[500], fontSize: 16 },
  send: { minHeight: 56, borderRadius: radii.button, backgroundColor: colors.accent, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16 }
});
