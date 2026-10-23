import { Stack } from "expo-router";
import { CheckFlowProvider } from "../../src/context/CheckFlowContext";
import { colors } from "../../src/theme";

// One provider for the whole Purpose -> Capture -> Review -> Processing flow
export default function CheckLayout() {
  return (
    <CheckFlowProvider>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background }, animation: "slide_from_right" }}>
        <Stack.Screen name="capture/[view]" options={{ contentStyle: { backgroundColor: colors.cameraBg }, animation: "fade" }} />
        <Stack.Screen name="processing" options={{ gestureEnabled: false }} />
      </Stack>
    </CheckFlowProvider>
  );
}
