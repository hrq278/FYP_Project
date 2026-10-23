import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Haptics are a nice extra: never let a missing vibration motor (or the browser) break a screen
const safe = (fn) => {
  if (Platform.OS === "web") return;
  fn().catch(() => {});
};

// Shutter press
export const captureTap = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));

// Photo needs a retake
export const photoWarning = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));

const VERDICT_FEEDBACK = {
  recommended: Haptics.NotificationFeedbackType.Success,
  caution: Haptics.NotificationFeedbackType.Warning,
  not_recommended: Haptics.NotificationFeedbackType.Error
};

// When a fresh report opens: success / warning / error by verdict
export const verdictHaptic = (verdict) => safe(() => Haptics.notificationAsync(VERDICT_FEEDBACK[verdict] || Haptics.NotificationFeedbackType.Success));
