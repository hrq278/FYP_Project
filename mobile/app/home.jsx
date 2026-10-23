import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import AppSidebar from "../components/AppSidebar";
import ImagePicker from "../components/ImagePicker";
import { useAuth } from "../hooks/useAuth";
import { evaluateAnimal } from "../services/api";

export default function HomeScreen() {
  const router = useRouter();
  const { logout } = useAuth();
  const [imageUri, setImageUri] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const handleLogout = async () => {
    setSidebarVisible(false);
    await logout();
  };

  const handleAnalyze = async () => {
    if (!imageUri) {
      Alert.alert("Image Required", "Please select a body image before analyzing.");
      return;
    }

    try {
      setIsAnalyzing(true);
      const data = await evaluateAnimal(imageUri);
      router.push({
        pathname: "/result",
        params: {
          species: String(data.species),
          confidence: String(data.confidence),
          createdAt: String(data.createdAt || new Date().toISOString())
        }
      });
    } catch (error) {
      const message = error.response?.data?.message || "Failed to analyze this image.";
      Alert.alert("Analysis Failed", message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>CattleEval</Text>
        <Pressable style={styles.menuButton} onPress={() => setSidebarVisible(true)}>
          <Text style={styles.menuButtonText}>Menu</Text>
        </Pressable>
      </View>
      <Text style={styles.subtitle}>Upload a full side body image for species detection.</Text>

      <ImagePicker label="Body Image" imageUri={imageUri} onImageSelected={setImageUri} />

      <Pressable style={styles.button} onPress={handleAnalyze} disabled={isAnalyzing}>
        <Text style={styles.buttonText}>Analyze</Text>
      </Pressable>

      {isAnalyzing && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#0f766e" />
          <Text style={styles.loadingText}>Analyzing animal...</Text>
        </View>
      )}

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
    paddingTop: 64,
    paddingHorizontal: 20,
    backgroundColor: "#f8fafc",
    gap: 14
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
    borderRadius: 10,
    backgroundColor: "#0f766e",
    paddingVertical: 8,
    paddingHorizontal: 12
  },
  menuButtonText: {
    color: "#fff",
    fontWeight: "700"
  },
  subtitle: {
    color: "#475569",
    marginBottom: 8
  },
  button: {
    marginTop: 4,
    borderRadius: 10,
    backgroundColor: "#0f766e",
    paddingVertical: 14,
    alignItems: "center"
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700"
  },
  loadingWrap: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  loadingText: {
    color: "#0f172a"
  }
});
