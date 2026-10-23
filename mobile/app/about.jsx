import { Link } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView
} from "react-native";
import BackgroundWrapper from "../assets/bgwrapper/bgwrapper";

const TEAM_MEMBERS = [
  {
    name: "Haroon Rasheed",
    rollNo: "22CS070",
    image: require("../assets/images/hrq.jpg")
  },
  {
    name: "Abdul Mutali",
    rollNo: "22CS114",
    image: require("../assets/images/mutali.jpg")
  },
  {
    name: "Syed Eiman Ali Shah",
    rollNo: "22CS006",
    image: require("../assets/images/eimans.jpg")
  }
];

export default function AboutScreen() {
  return (
    <BackgroundWrapper>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>

          {/* HEADER */}
          <Text style={styles.title}>About LES</Text>
          <Text style={styles.subtitle}>
            AI-powered livestock evaluation system designed to assist farmers
            and veterinarians with fast, accurate insights.
          </Text>

          {/* APP INFO */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>What We Do</Text>
            <Text style={styles.cardText}>
              LES uses advanced deep learning models to analyze livestock images
              and provide insights including species identification, breed
              classification, disease detection (FMD), and age estimation using
              dentition.
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Our Mission</Text>
            <Text style={styles.cardText}>
              To empower farmers with accessible AI tools that improve livestock
              health monitoring and productivity.
            </Text>
          </View>

          {/* TEAM SECTION */}
          <Text style={styles.sectionTitle}>Meet the Team</Text>

          <View style={styles.membersCard}>
            {TEAM_MEMBERS.map((member) => (
              <View key={member.rollNo} style={styles.memberRow}>
                <Image source={member.image} style={styles.avatar} />

                <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.name}</Text>
                    <Text style={styles.memberRoll}>{member.rollNo}</Text>
                </View>
                </View>
            ))}
          </View>

          {/* CTA */}
          <Link href="/hero" asChild>
            <Pressable
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.buttonPressed
              ]}
            >
              <Text style={styles.backButtonText}>Back to Home</Text>
            </Pressable>
          </Link>

        </ScrollView>
      </SafeAreaView>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },

  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
    zIndex: 1
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0f172a"
  },

  subtitle: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 22
  },

  sectionTitle: {
    marginTop: 10,
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a"
  },

  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#dcfce7"
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#16a34a",
    marginBottom: 4
  },

  cardText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20
  },

  membersCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 10
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#e2e8f0"
  },

  memberInfo: {
    flex: 1
  },

  memberName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a"
  },

  memberRoll: {
    fontSize: 13,
    color: "#64748b"
  },

  backButton: {
    marginTop: 20,
    backgroundColor: "#16a34a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center"
  },

  backButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },

  buttonPressed: {
    opacity: 0.7
  },
  memberRow: {
  alignItems: "center",
  backgroundColor: "#f8fafc",
  borderRadius: 18,
  paddingVertical: 20,
  paddingHorizontal: 16
},

avatar: {
  width: 90,
  height: 90,
  borderRadius: 45,
  marginBottom: 14,
  backgroundColor: "#e2e8f0"
},

memberInfo: {
  alignItems: "center"
},

memberName: {
  fontSize: 18,
  fontWeight: "800",
  color: "#0f172a",
  marginBottom: 4
},

memberRoll: {
  fontSize: 14,
  color: "#64748b",
  fontWeight: "500"
}

});