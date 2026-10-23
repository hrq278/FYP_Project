import { useRouter } from "expo-router";
import { ArrowUp, CircleEllipsis, Heart, Milk, MoonStar, Scale, Star, Tractor } from "lucide-react-native";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, View } from "react-native";
import AppText from "../../src/components/AppText";
import Button from "../../src/components/Button";
import { BackButton, Screen } from "../../src/components/Layout";
import { IconTile, SegmentedToggle, SelectCard } from "../../src/components/Selection";
import TextField from "../../src/components/TextField";
import { formatPkr, useCheckFlow } from "../../src/context/CheckFlowContext";
import { useDirection } from "../../src/hooks/useDirection";
import { colors, radii } from "../../src/theme";

const PURPOSES = [
  ["milk", Milk],
  ["breeding", Heart],
  ["qurbani", MoonStar],
  ["meat", Scale],
  ["farm_work", Tractor],
  ["other", CircleEllipsis]
];

// Spec §4.7: purpose (required), budget and seller's price (optional), buyer experience
export default function Purpose() {
  const router = useRouter();
  const { t } = useTranslation();
  const { ForwardArrow } = useDirection();
  const flow = useCheckFlow();

  // A new check starts clean every time this screen opens from Home
  useEffect(() => {
    flow.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Screen
      footer={<Button title={t("check.nextPhotos")} trailingIcon={ForwardArrow} onPress={() => router.push("/check/capture/front")} />}
    >
      <View style={styles.top}>
        <BackButton onPress={() => router.back()} />
        <View style={styles.pill}>
          <AppText variant="caption" weight={800} color={colors.primary}>{t("check.newCheck")}</AppText>
        </View>
      </View>
      <AppText variant="h1" style={styles.title}>{t("check.purposeTitle")}</AppText>

      <View style={styles.grid} accessibilityRole="radiogroup">
        {PURPOSES.map(([key, Icon]) => (
          <SelectCard
            key={key}
            selected={flow.purpose === key}
            onPress={() => flow.update({ purpose: key })}
            accessibilityLabel={t(`purpose.${key}`)}
            style={styles.card}
          >
            <IconTile icon={Icon} size={44} />
            <AppText variant="bodyLarge" weight={800} numberOfLines={2} style={styles.cardLabel}>
              {t(`purpose.${key}`)}
            </AppText>
          </SelectCard>
        ))}
      </View>

      <View style={styles.sectionRow}>
        <AppText variant="section">{t("check.moreDetails")}</AppText>
        <AppText variant="caption" weight={500} color={colors.textMuted}>{t("check.optional")}</AppText>
      </View>
      <View style={styles.prices}>
        <TextField
          label={t("check.budget")}
          prefix="PKR"
          value={formatPkr(flow.budget)}
          onChangeText={(v) => flow.update({ budget: v.replace(/\D/g, "").slice(0, 9) })}
          keyboardType="number-pad"
          placeholder="2,50,000"
          ltr
          style={styles.price}
        />
        <TextField
          label={t("check.sellerPrice")}
          prefix="PKR"
          value={formatPkr(flow.sellerPrice)}
          onChangeText={(v) => flow.update({ sellerPrice: v.replace(/\D/g, "").slice(0, 9) })}
          keyboardType="number-pad"
          placeholder="3,00,000"
          ltr
          style={styles.price}
        />
      </View>

      <AppText variant="bodyStrong" style={styles.expLabel}>{t("check.experience")}</AppText>
      <SegmentedToggle
        value={flow.experience}
        onChange={(experience) => flow.update({ experience })}
        options={[
          { value: "first_time", label: t("check.firstTime"), icon: ArrowUp },
          { value: "experienced", label: t("check.experienced"), icon: Star }
        ]}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  pill: { backgroundColor: colors.primaryTint, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 8 },
  title: { marginBottom: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  card: { width: "48.4%", minHeight: 108, padding: 14, gap: 10, justifyContent: "space-between" },
  cardLabel: { paddingEnd: 8 },
  sectionRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginTop: 24, marginBottom: 12 },
  prices: { flexDirection: "row", gap: 10 },
  price: { flex: 1 },
  expLabel: { marginTop: 18, marginBottom: 8 }
});
