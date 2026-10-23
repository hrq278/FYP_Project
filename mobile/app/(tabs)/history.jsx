import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { AlertTriangle, Camera, CheckCircle2, Columns2, ListChecks, Search, X, XCircle } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../../src/components/AppText";
import Button from "../../src/components/Button";
import { CattleSide } from "../../src/components/Illustrations";
import { EmptyState, InfoBanner } from "../../src/components/Layout";
import { ReportListItem } from "../../src/components/Report";
import { Chip } from "../../src/components/Selection";
import { useSession } from "../../src/context/SessionContext";
import { colors, fonts, radii, spacing, verdictColors } from "../../src/theme";
import { listEvaluations } from "../../services/api";

const FILTERS = [
  { key: null, icon: null },
  { key: "recommended", icon: CheckCircle2 },
  { key: "caution", icon: AlertTriangle },
  { key: "not_recommended", icon: XCircle }
];

// Spec §4.14
export default function History() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isGuest } = useSession();
  const [items, setItems] = useState(null); // null = first load
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState(""); // debounced query
  const [verdict, setVerdict] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState([]); // report items (keeps purpose/status for the checks)
  const [hint, setHint] = useState(null);
  const request = useRef(0);

  useEffect(() => {
    const id = setTimeout(() => setSearch(query.trim()), 400);
    return () => clearTimeout(id);
  }, [query]);

  const load = useCallback(
    async (nextPage = 1) => {
      const mine = ++request.current;
      try {
        const res = await listEvaluations({
          page: nextPage,
          ...(verdict ? { verdict } : {}),
          // tz lets "24 Oct" mean the phone's local day, matching the dates shown in the list
          ...(search ? { q: search, tz: new Date().getTimezoneOffset() } : {})
        });
        if (mine !== request.current) return; // a newer search replaced this one
        setItems((prev) => (nextPage === 1 || !prev ? res.items : [...prev, ...res.items]));
        setTotal(res.total);
        setPage(nextPage);
        setError(false);
      } catch {
        if (mine === request.current) setError(true);
      }
    },
    [verdict, search]
  );

  useFocusEffect(
    useCallback(() => {
      load(1);
    }, [load])
  );

  const loadMore = async () => {
    if (loadingMore || !items || items.length >= total) return;
    setLoadingMore(true);
    await load(page + 1);
    setLoadingMore(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    await load(1);
    setRefreshing(false);
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelected([]);
    setHint(null);
  };

  const toggle = (item) => {
    setHint(null);
    setSelected((s) => (s.some((x) => x.id === item.id) ? s.filter((x) => x.id !== item.id) : s.length >= 2 ? [s[1], item] : [...s, item]));
  };

  const compare = () => {
    const [a, b] = selected;
    if (a.status !== "done" || b.status !== "done") return setHint(t("history.pickDone"));
    if (a.purpose !== b.purpose) return setHint(t("history.samePurpose"));
    exitSelect();
    router.push(`/compare/${a.id}/${b.id}`);
    return undefined;
  };

  const filtered = Boolean(search || verdict);

  const header = (
    <View>
      {isGuest ? (
        <View style={styles.guest}>
          <InfoBanner text={t("history.guestBanner")} />
          <Pressable onPress={() => router.push("/register")} accessibilityRole="link" style={styles.guestLink}>
            <AppText variant="bodyStrong" color={colors.primary} style={styles.underline}>{t("history.signUp")}</AppText>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <View style={styles.top}>
        <View style={styles.titleRow}>
          <AppText variant="h1" style={styles.flex}>{t("history.title")}</AppText>
          {items?.length ? (
            <Button
              title={selectMode ? t("history.cancel") : t("history.select")}
              icon={selectMode ? X : ListChecks}
              variant="neutral"
              size="normal"
              onPress={() => (selectMode ? exitSelect() : setSelectMode(true))}
              style={styles.selectBtn}
            />
          ) : null}
        </View>
        <View style={styles.search}>
          <Search size={22} color={colors.iconMuted} strokeWidth={2.4} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("history.search")}
            placeholderTextColor={colors.iconMuted}
            style={[styles.searchInput, i18n.language === "ur" && styles.searchUrdu]}
            accessibilityLabel={t("history.a11ySearch")}
            returnKeyType="search"
          />
          {query ? (
            <Pressable onPress={() => setQuery("")} accessibilityRole="button" accessibilityLabel={t("common.close")} hitSlop={10}>
              <X size={20} color={colors.iconMuted} />
            </Pressable>
          ) : null}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {FILTERS.map((f) => (
            <Chip
              key={f.key || "all"}
              label={f.key ? t(`verdict.${f.key}`) : t("history.all")}
              icon={f.icon}
              iconColor={f.key ? verdictColors[f.key].fill : undefined}
              active={verdict === f.key}
              onPress={() => setVerdict(f.key)}
            />
          ))}
        </ScrollView>
        {selectMode ? (
          <AppText variant="bodyStrong" color={colors.primary} style={styles.selectLine}>{t("history.selected", { count: selected.length })}</AppText>
        ) : null}
      </View>

      {items === null && !error ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : error && !items ? (
        <View style={styles.emptyWrap}>
          <EmptyState illustration={<XCircle size={64} color={colors.primary} />} title={t("history.loadError")} primary={{ title: t("common.retry"), onPress: () => load(1) }} />
        </View>
      ) : items.length === 0 && !filtered ? (
        <View style={styles.emptyWrap}>
          {header}
          <EmptyState
            illustration={<CattleSide width={110} />}
            title={t("empty.historyTitle")}
            body={t("empty.historyBody")}
            primary={{ title: t("empty.checkNew"), icon: Camera, onPress: () => router.push("/check/purpose") }}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.noResults}>
              <AppText variant="bodyLarge" color={colors.textMuted} align="center">{t("history.noResults")}</AppText>
              <Button title={t("history.clearFilters")} variant="outline" size="normal" onPress={() => { setQuery(""); setVerdict(null); }} />
            </View>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.primary} style={styles.more} /> : null}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          refreshing={refreshing}
          onRefresh={refresh}
          renderItem={({ item }) => (
            <ReportListItem
              item={item}
              selectMode={selectMode}
              selected={selected.some((x) => x.id === item.id)}
              onPress={() => (selectMode ? toggle(item) : router.push(`/report/${item.id}`))}
              onLongPress={() => {
                if (!selectMode) setSelectMode(true);
                toggle(item);
              }}
            />
          )}
        />
      )}

      {selectMode ? (
        <View style={styles.compareBar}>
          {hint ? <View style={styles.hint}><InfoBanner variant="warning" text={hint} /></View> : null}
          <Button title={t("history.compare", { count: selected.length })} icon={Columns2} onPress={compare} disabled={selected.length !== 2} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  top: { paddingHorizontal: spacing.screen, paddingTop: spacing.lg, gap: 12 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  selectBtn: { paddingHorizontal: 14 },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 54,
    borderRadius: radii.button,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 14
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 17, fontFamily: fonts.latin[500], color: colors.textPrimary, paddingVertical: 10 },
  searchUrdu: { fontFamily: fonts.urdu[500], fontSize: 16 },
  chips: { gap: 8, paddingBottom: 6 },
  loading: { marginTop: 40 },
  emptyWrap: { flex: 1, paddingHorizontal: spacing.screen, paddingBottom: spacing.lg },
  list: { padding: spacing.screen, paddingTop: 10, gap: 12 },
  guest: { gap: 4, marginBottom: 8 },
  guestLink: { alignSelf: "flex-start", minHeight: 40, justifyContent: "center" },
  underline: { textDecorationLine: "underline" },
  selectLine: { marginBottom: 4 },
  noResults: { alignItems: "center", gap: 14, paddingTop: 40 },
  more: { marginVertical: 16 },
  compareBar: { paddingHorizontal: spacing.screen, paddingVertical: 10, backgroundColor: colors.background, borderTopWidth: 2, borderTopColor: colors.borderSoft, gap: 8 },
  hint: {}
});
