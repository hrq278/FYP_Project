import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Updates from "expo-updates";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { DevSettings, I18nManager, Platform } from "react-native";
import en from "./locales/en.json";
import ur from "./locales/ur.json";

export const LANGUAGE_KEY = "language";
export const SUPPORTED = ["en", "ur"];

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ur: { translation: ur } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false
});

export const isRTL = (lang = i18n.language) => lang === "ur";

// Reads the saved language (null on first launch) and applies it
export const loadLanguage = async () => {
  let saved = null;
  try {
    saved = await AsyncStorage.getItem(LANGUAGE_KEY);
  } catch {
    saved = null;
  }
  if (SUPPORTED.includes(saved)) {
    await i18n.changeLanguage(saved);
    if (Platform.OS === "web" && typeof document !== "undefined") document.documentElement.dir = isRTL(saved) ? "rtl" : "ltr";
  }
  return saved;
};

/**
 * Saves the language and switches layout direction. React Native only applies a new direction after a reload,
 * so switching between English and Urdu restarts the JS app once (spec §8).
 */
export const setLanguage = async (lang) => {
  await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  await i18n.changeLanguage(lang);
  const wantRTL = isRTL(lang);
  if (Platform.OS === "web") {
    if (typeof document !== "undefined") document.documentElement.dir = wantRTL ? "rtl" : "ltr";
    return false;
  }
  if (I18nManager.isRTL !== wantRTL) {
    I18nManager.allowRTL(wantRTL);
    I18nManager.forceRTL(wantRTL);
    try {
      await Updates.reloadAsync();
    } catch {
      DevSettings.reload();
    }
    return true;
  }
  return false;
};

export default i18n;
