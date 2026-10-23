import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const TOKEN_KEY = "token";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 20000
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Turns axios errors into one message key the screens can translate
export const errorKey = (error) => {
  if (!error?.response) return "network";
  return "failed";
};

export const registerUser = async (payload) => (await api.post("/api/auth/register", payload)).data;

export const loginUser = async (payload) => (await api.post("/api/auth/login", payload)).data;

export const guestLogin = async () => (await api.post("/api/auth/guest")).data;

export const fetchProfile = async () => (await api.get("/api/auth/profile")).data;

export const saveSettings = async (payload) => (await api.put("/api/auth/settings", payload)).data;

export const logoutUser = async () => (await api.post("/api/auth/logout")).data;

export const listEvaluations = async (params = {}) => (await api.get("/api/evaluations", { params })).data;

export default api;
