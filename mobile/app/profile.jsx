import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AppSidebar from "../components/AppSidebar";
import { useAuth, useProfile } from "../hooks/useAuth";

export default function ProfileScreen() {
  const { logout } = useAuth();
  const { profile } = useProfile();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleLogout = async () => {
    setSidebarVisible(false);
    await logout();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <Pressable style={styles.menuButton} onPress={() => setSidebarVisible(true)}>
          <Text style={styles.menuText}>Menu</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{profile?.name || "-"}</Text>

        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{profile?.email || "-"}</Text>

        <Text style={styles.label}>Member Since</Text>
        <Text style={styles.value}>
          {profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : "-"}
        </Text>
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
    gap: 8
  },
  label: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "600"
  },
  value: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8
  }
});
