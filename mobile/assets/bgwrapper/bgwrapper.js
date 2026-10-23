import { View, StyleSheet } from "react-native";

export default function BackgroundWrapper({ children }) {
  return (
    <View style={styles.container}>
      <View style={styles.backgroundBlobOne} />
      <View style={styles.backgroundBlobTwo} />
      <View style={styles.backgroundGlow} />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7faf8",
  },

  backgroundBlobOne: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "#bbf7d0",
    opacity: 0.45,
  },

  backgroundBlobTwo: {
    position: "absolute",
    bottom: 80,
    left: -70,
    width: 240,
    height: 240,
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    opacity: 0.75,
  },

  backgroundGlow: {
    position: "absolute",
    top: 180,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 999,
    backgroundColor: "#16a34a",
    opacity: 0.1,
  },
});