import { Tabs } from "expo-router";
import { History, House, UserRound } from "lucide-react-native";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppText from "../../src/components/AppText";
import { colors, radii } from "../../src/theme";

const ICONS = { home: House, history: History, profile: UserRound };

// Spec §2 BottomNav: white bar, 3 items, active item on a tinted pill
function BottomNav({ state, navigation }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]} accessibilityRole="tablist">
      {state.routes.map((route, i) => {
        const active = state.index === i;
        const Icon = ICONS[route.name] || House;
        const color = active ? colors.primary : colors.iconMuted;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(`nav.${route.name}`)}
            onPress={() => {
              const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
              if (!active && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={[styles.item, active && styles.itemActive]}
          >
            <Icon size={26} color={color} strokeWidth={active ? 2.6 : 2.2} />
            <AppText variant="caption" weight={active ? 800 : 600} color={color}>
              {t(`nav.${route.name}`)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BottomNav {...props} />}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 2,
    borderTopColor: colors.borderSoft,
    paddingTop: 8,
    paddingHorizontal: 12,
    gap: 8
  },
  item: { flex: 1, minHeight: 64, borderRadius: radii.button, alignItems: "center", justifyContent: "center", gap: 2 },
  itemActive: { backgroundColor: colors.primaryTint }
});
