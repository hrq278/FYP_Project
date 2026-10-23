import { Link } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "../hooks/useAuth";
import { registerUser } from "../services/api";
import BackgroundWrapper from "../assets/bgwrapper/bgwrapper";

export default function RegisterScreen() {
  const { saveSession } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }

    try {
      setIsLoading(true);
      const data = await registerUser({ name, email, password });
      await saveSession(data.token);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Unable to register. Please try again.";
      Alert.alert("Registration Failed", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join CattleEval</Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Name"
          style={styles.input}
        />

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          style={styles.input}
        />

        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed
          ]}
          onPress={handleRegister}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Registering..." : "Register"}
          </Text>
        </Pressable>

        <Text style={styles.footerText}>
          Already have an account?{" "}
          <Link href="/login" style={styles.link}>
            Login
          </Link>
        </Text>
      </View>
    </BackgroundWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    gap: 14,
    zIndex: 1
  },

  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#0f172a"
  },

  subtitle: {
    marginBottom: 8,
    color: "#475569"
  },

  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.9)"
  },

  button: {
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    alignItems: "center"
  },

  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16
  },

  buttonPressed: {
    opacity: 0.7
  },

  footerText: {
    marginTop: 10,
    color: "#334155"
  },

  link: {
    color: "#16a34a",
    fontWeight: "700"
  }
});