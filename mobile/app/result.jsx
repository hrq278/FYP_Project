import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import AppSidebar from "../components/AppSidebar";
import ResultCard from "../components/ResultCard";
import { useAuth } from "../hooks/useAuth";

export default function ResultScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const { species, confidence, createdAt } = useLocalSearchParams();
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleLogout = async () => {
    setSidebarVisible(false);
    await logout();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Result</Text>
        <Pressable style={styles.menuButton} onPress={() => setSidebarVisible(true)}>
          <Text style={styles.menuText}>Menu</Text>
        </Pressable>
      </View>

      <ResultCard
        species={typeof species === "string" ? species : "Unknown"}
        confidence={typeof confidence === "string" ? confidence : "0"}
        createdAt={typeof createdAt === "string" ? createdAt : new Date().toISOString()}
      />

      <Pressable style={styles.button} onPress={() => router.replace("/home")}>
        <Text style={styles.buttonText}>New Evaluation</Text>
      </Pressable>

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
    paddingHorizontal: 20,
    paddingTop: 64,
    backgroundColor: "#f8fafc",
    gap: 20
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  title: {
    fontSize: 30,
    color: "#0f172a",
    fontWeight: "800"
  },
  menuButton: {
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  menuText: {
    color: "#ffffff",
    fontWeight: "700"
  },
  button: {
    borderRadius: 10,
    backgroundColor: "#0f766e",
    paddingVertical: 14,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  }
});
