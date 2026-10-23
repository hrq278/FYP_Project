import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Camera } from "lucide-react-native";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../../src/components/AppText";
import { CattleSide } from "../../src/components/Illustrations";
import { EmptyState } from "../../src/components/Layout";
import { ReportListItem } from "../../src/components/Report";
import { colors, spacing } from "../../src/theme";
import { listEvaluations } from "../../services/api";

// History list. Search, filters, select mode and compare come in Module 7.
export default function History() {
  const router = useRouter();
  const { t } = useTranslation();
  const [items, setItems] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems((await listEvaluations({ page: 1 })).items);
    } catch {
      setItems([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.screen} edges={["top"]}>
      <AppText variant="h1" style={styles.title}>{t("nav.history")}</AppText>
      {items === null ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
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
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          renderItem={({ item }) => <ReportListItem item={item} onPress={() => router.push(`/report/${item.id}`)} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  title: { paddingHorizontal: spacing.screen, paddingTop: spacing.lg, paddingBottom: spacing.md },
  loading: { marginTop: 40 },
  empty: { flex: 1, paddingHorizontal: spacing.screen, paddingBottom: spacing.lg },
  list: { padding: spacing.screen, gap: 12 }
});
