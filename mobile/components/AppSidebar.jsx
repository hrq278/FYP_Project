import { Link } from "expo-router";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

export default function AppSidebar({ visible, onClose, onLogout }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.wrapper}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.panel}>
          <Text style={styles.title}>Menu</Text>

          <Link href="/profile" asChild>
            <Pressable style={styles.linkButton} onPress={onClose}>
              <Text style={styles.linkText}>Profile</Text>
            </Pressable>
          </Link>

          <Link href="/settings" asChild>
            <Pressable style={styles.linkButton} onPress={onClose}>
              <Text style={styles.linkText}>Settings</Text>
            </Pressable>
          </Link>

          <Pressable style={styles.logoutButton} onPress={onLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    flexDirection: "row"
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)"
  },
  panel: {
    width: 250,
    backgroundColor: "#ffffff",
    paddingTop: 70,
    paddingHorizontal: 16,
    borderLeftWidth: 1,
    borderLeftColor: "#e2e8f0",
    gap: 10
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8
  },
  linkButton: {
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12
  },
  linkText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "700"
  },
  logoutButton: {
    marginTop: 8,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12
  },
  logoutText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  }
});
