import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 20000
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const registerUser = async (payload) => {
  const response = await api.post("/api/auth/register", payload);
  return response.data;
};

export const loginUser = async (payload) => {
  const response = await api.post("/api/auth/login", payload);
  return response.data;
};

export const evaluateAnimal = async (imageUri) => {
  const formData = new FormData();
  formData.append("bodyImage", {
    uri: imageUri,
    name: "body-image.jpg",
    type: "image/jpeg"
  });

  const response = await api.post("/api/evaluate", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });

  return response.data;
};

export const fetchProfile = async () => {
  const response = await api.get("/api/auth/profile");
  return response.data;
};

export const saveSettings = async (payload) => {
  const response = await api.put("/api/auth/settings", payload);
  return response.data;
};

export const logoutUser = async () => {
  const response = await api.post("/api/auth/logout");
  return response.data;
};

export default api;
