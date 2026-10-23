import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { fetchProfile, logoutUser } from "../services/api";

export function useAuth() {
  const router = useRouter();

  const saveSession = useCallback(
    async (token) => {
      await AsyncStorage.setItem("token", token);
      router.replace("/home");
    },
    [router]
  );

  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (error) {
      // Even if API logout fails, we clear local session to complete logout UX.
    } finally {
      await AsyncStorage.removeItem("token");
      router.replace("/hero");
    }
  }, [router]);

  return { saveSession, logout };
}

// Loads the signed-in user's profile each time the screen gains focus.
export function useProfile() {
  const [profile, setProfile] = useState(null);

  const reload = useCallback(async () => {
    try {
      const data = await fetchProfile();
      setProfile(data.user);
      return data.user;
    } catch (error) {
      const message = error.response?.data?.message || "Failed to load profile.";
      Alert.alert("Profile Error", message);
      return null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  return { profile, reload };
}
