import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { deleteAccount as deleteAccountApi, fetchProfile, guestLogin, logoutUser, saveSettings, TOKEN_KEY } from "../../services/api";
import i18n from "../i18n";

const GUEST_KEY = "guest";
const ONBOARDING_KEY = "onboardingDone";

const SessionContext = createContext(null);

/**
 * App-wide session: token, user profile (null for guests), guest flag and whether onboarding was seen.
 * `ready` turns true once storage has been read, so the splash screen knows where to go.
 */
export function SessionProvider({ children }) {
  const [state, setState] = useState({ ready: false, token: null, isGuest: false, user: null, onboardingDone: false });

  const loadProfile = useCallback(async () => {
    try {
      const { user } = await fetchProfile();
      setState((s) => ({ ...s, user }));
      return user;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      const [[, token], [, guest], [, onboarding]] = await AsyncStorage.multiGet([TOKEN_KEY, GUEST_KEY, ONBOARDING_KEY]);
      setState({ ready: true, token, isGuest: guest === "1", user: null, onboardingDone: onboarding === "1" });
      if (token && guest !== "1") loadProfile();
    })();
  }, [loadProfile]);

  const signIn = useCallback(
    async (token) => {
      await AsyncStorage.multiSet([[TOKEN_KEY, token], [GUEST_KEY, "0"]]);
      setState((s) => ({ ...s, token, isGuest: false }));
      const user = await loadProfile();
      // Keep the server's language setting in step with the app's
      if (user && user.settings?.preferredLanguage !== i18n.language) {
        saveSettings({ preferredLanguage: i18n.language }).catch(() => {});
      }
    },
    [loadProfile]
  );

  const signInAsGuest = useCallback(async () => {
    const { token } = await guestLogin();
    await AsyncStorage.multiSet([[TOKEN_KEY, token], [GUEST_KEY, "1"]]);
    setState((s) => ({ ...s, token, isGuest: true, user: null }));
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logoutUser();
    } catch {
      // Logging out locally is enough if the server can't be reached
    }
    await AsyncStorage.multiRemove([TOKEN_KEY, GUEST_KEY]);
    setState((s) => ({ ...s, token: null, isGuest: false, user: null }));
  }, []);

  // Deletes the account on the server, then clears the session on this phone
  const deleteAccount = useCallback(async () => {
    await deleteAccountApi();
    await AsyncStorage.multiRemove([TOKEN_KEY, GUEST_KEY]);
    setState((s) => ({ ...s, token: null, isGuest: false, user: null }));
  }, []);

  const finishOnboarding = useCallback(async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    setState((s) => ({ ...s, onboardingDone: true }));
  }, []);

  const value = useMemo(
    () => ({ ...state, signIn, signInAsGuest, signOut, deleteAccount, finishOnboarding, refreshProfile: loadProfile }),
    [state, signIn, signInAsGuest, signOut, deleteAccount, finishOnboarding, loadProfile]
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
};
