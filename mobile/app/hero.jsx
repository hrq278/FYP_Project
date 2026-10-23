import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
  Dimensions
} from "react-native";

const { width } = Dimensions.get("window");

export default function HeroScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Background */}
        <View style={styles.backgroundBlobOne} />
        <View style={styles.backgroundBlobTwo} />
        <View style={styles.backgroundGlow} />

        
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.logoWrap}>
            <Text style={styles.logoText}>LES</Text>
          </View>
          <View style={styles.badgeWrap}>
            <Text style={styles.badgeText}>
              AI-Powered Livestock Analysis
            </Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>
          Smart Livestock Insights in Seconds
        </Text>

        <Text style={styles.description}>
          Identify species, breed, detect disease, and estimate age using AI —
          all from a single image.
        </Text>

        {/* Illustration */}
        <View style={styles.topIllustration}>
          <Image
            source={require("../assets/images/Farm_house.png")} // ⚠️ use PNG/JPG, NOT .svg
            style={styles.illustrationImage}
            resizeMode="contain"
          />
        </View>

        {/* Action Panel */}
        <View style={styles.actionPanel}>
          <Text style={styles.actionTitle}>
            Ready to evaluate your livestock?
          </Text>
          <Text style={styles.actionText}>
            Start your first AI analysis or explore the team building LES.
          </Text>

          <View style={styles.buttonRow}>
            <Link href="/login" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed
                ]}
              >
                <View style={styles.badgeWrap}>
                <Text style={styles.secondaryButtonText}>Get Started</Text>
                </View>
              </Pressable>
            </Link>

            <Link href="/about" asChild>
              <Pressable
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.buttonPressed
                ]}
              >
                <View style={styles.badgeWrap}>
                <Text style={styles.secondaryButtonText}>Meet Team</Text>
                </View>
              </Pressable>
            </Link>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4</Text>
            <Text style={styles.statLabel}>AI Models</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>~95%</Text>
            <Text style={styles.statLabel}>Accuracy</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>~10s</Text>
            <Text style={styles.statLabel}>Avg Analysis</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>24/7</Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
        </View>

        

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f7faf8"
  },

  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 44
  },

  backgroundBlobOne: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "#bbf7d0",
    opacity: 0.45
  },

  backgroundBlobTwo: {
    position: "absolute",
    bottom: 80,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    opacity: 0.75
  },

  backgroundGlow: {
    position: "absolute",
    top: 180,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "#16a34a",
    opacity: 0.1
  },

  topBar: {
    gap: 10
  },

  logoWrap: {
    flexDirection: "row",
    alignItems: "center"
  },

  logoText: {
    fontSize: 24,
    color: "#0f172a",
    fontWeight: "700"
  },

  badgeWrap: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
    paddingVertical: 6,
    paddingHorizontal: 12
  },

  badgeText: {
    color: "#15803d",
    fontSize: 12,
    fontWeight: "700"
  },

  title: {
    color: "#0f172a",
    fontSize: 34,
    lineHeight: 40,
    textAlign: "center",
    fontWeight: "800"
  },

  description: {
    color: "#475569",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  },

  actionPanel: {
    borderRadius: 20,
    backgroundColor: "#ffffff",
    padding: 16,
    borderWidth: 1,
    borderColor: "#dcfce7",
    gap: 10,
    elevation: 3
  },

  actionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0f172a"
  },

  actionText: {
    fontSize: 14,
    color: "#64748b"
  },

  buttonRow: {
    flexDirection: "row",
    gap: 30,
    marginTop: 12,
    marginHorizontal: 30
  },

  primaryButton: {
    flex: 1,
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },

  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center"
  },

  secondaryButtonText: {
    color: "#16a34a",
    fontWeight: "700",
    fontSize: 20
  },

  buttonPressed: {
    opacity: 0.7
  },

  statsCard: {
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between"
  },

  statItem: {
    flex: 1,
    alignItems: "center"
  },

  statValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f172a"
  },

  statLabel: {
    fontSize: 12,
    color: "#64748b"
  },

  topIllustration: {
    alignItems: "center",
    marginTop: 10
  },

  illustrationImage: {
    width: width * 0.75,
    height: width * 0.75
  }
});