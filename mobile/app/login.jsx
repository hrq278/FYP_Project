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
import { loginUser } from "../services/api";
import BackgroundWrapper from "../assets/bgwrapper/bgwrapper";

export default function LoginScreen() {
  const { saveSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing Fields", "Please provide email and password.");
      return;
    }

    try {
      setIsLoading(true);
      const data = await loginUser({ email, password });
      await saveSession(data.token);
    } catch (error) {
      const message =
        error.response?.data?.message ||
        "Unable to login. Please try again.";
      Alert.alert("Login Failed", message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BackgroundWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>CattleEval</Text>
        <Text style={styles.subtitle}>Login to continue</Text>

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
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Logging in..." : "Login"}
          </Text>
        </Pressable>

        <Text style={styles.footerText}>
          Don't have an account?{" "}
          <Link href="/register" style={styles.link}>
            Register
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
    fontSize: 34,
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