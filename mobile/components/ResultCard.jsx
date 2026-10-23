import React from "react";
import { StyleSheet, Text, View } from "react-native";

const speciesEmoji = {
  Cow: "🐄",
  Buffalo: "🐃"
};

export default function ResultCard({ species, confidence, createdAt }) {
  const parsedConfidence = Number(confidence || 0).toFixed(2);
  const dateText = createdAt ? new Date(createdAt).toLocaleString() : new Date().toLocaleString();

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Evaluation Result</Text>
      <Text style={styles.row}>Species: {speciesEmoji[species] || "🐾"} {species || "Unknown"}</Text>
      <Text style={styles.row}>Confidence: {parsedConfidence}%</Text>
      <Text style={styles.row}>Date: {dateText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 14,
    backgroundColor: "#ecfeff",
    borderWidth: 1,
    borderColor: "#99f6e4",
    padding: 16,
    gap: 10
  },
  heading: {
    fontSize: 18,
    fontWeight: "700",
    color: "#134e4a"
  },
  row: {
    fontSize: 16,
    color: "#0f172a"
  }
});
