import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import AppSidebar from "../components/AppSidebar";
import { useAuth, useProfile } from "../hooks/useAuth";
import { saveSettings } from "../services/api";

export default function SettingsScreen() {
  const { logout } = useAuth();
  const { profile } = useProfile();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [preferredLanguage, setPreferredLanguage] = useState("en");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const settings = profile?.settings;
    if (!settings) {
      return;
    }
    setPreferredLanguage(settings.preferredLanguage || "en");
    setAlertsEnabled(typeof settings.alertsEnabled === "boolean" ? settings.alertsEnabled : true);
  }, [profile]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await saveSettings({ preferredLanguage, alertsEnabled });
      Alert.alert("Success", "Settings updated successfully.");
    } catch (error) {
      const message = error.response?.data?.message || "Unable to save settings.";
      Alert.alert("Save Failed", message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setSidebarVisible(false);
    await logout();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Pressable style={styles.menuButton} onPress={() => setSidebarVisible(true)}>
          <Text style={styles.menuText}>Menu</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Preferred Language</Text>
        <TextInput
          value={preferredLanguage}
          onChangeText={setPreferredLanguage}
          style={styles.input}
          placeholder="en"
          autoCapitalize="none"
        />

        <View style={styles.switchRow}>
          <Text style={styles.label}>Alerts Enabled</Text>
          <Switch value={alertsEnabled} onValueChange={setAlertsEnabled} />
        </View>

        <Pressable style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
          <Text style={styles.saveText}>{isSaving ? "Saving..." : "Save Settings"}</Text>
        </Pressable>
      </View>

      <AppSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        onLogout={handleLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingTop: 64,
    paddingHorizontal: 20,
    gap: 16
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a"
  },
  menuButton: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  menuText: {
    color: "#fff",
    fontWeight: "700"
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dbe7f2",
    backgroundColor: "#fff",
    padding: 16,
    gap: 12
  },
  label: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600"
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff"
  },
  switchRow: {
    marginTop: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#0f766e",
    alignItems: "center",
    paddingVertical: 13
  },
  saveText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  }
});
