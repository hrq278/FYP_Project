import axios from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const TOKEN_KEY = "token";

const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 20000
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  // A queued offline check sends the token it was saved with (see src/offline/pending.js)
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Turns axios errors into one message key the screens can translate
export const errorKey = (error) => {
  if (!error?.response) return "network";
  return "failed";
};

// Which error screen to show: no internet, the ML service is down (503), or anything else
export const errorKind = (error) => {
  if (!error?.response) return "network";
  if (error.response.status === 503) return "ml";
  return "server";
};

export const registerUser = async (payload) => (await api.post("/api/auth/register", payload)).data;

export const loginUser = async (payload) => (await api.post("/api/auth/login", payload)).data;

export const guestLogin = async () => (await api.post("/api/auth/guest")).data;

export const fetchProfile = async () => (await api.get("/api/auth/profile")).data;

export const saveSettings = async (payload) => (await api.put("/api/auth/settings", payload)).data;

export const logoutUser = async () => (await api.post("/api/auth/logout")).data;

export const listEvaluations = async (params = {}) => (await api.get("/api/evaluations", { params })).data;

// Phones upload a file by uri; the browser (used for layout checks) needs a Blob
const appendImage = async (form, field, uri) => {
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    form.append(field, blob, `${field}.jpg`);
  } else {
    form.append(field, { uri, name: `${field}.jpg`, type: "image/jpeg" });
  }
};

// Quality check (+ species pre-check for the front photo) for one capture screen
export const checkPhoto = async (uri, view) => {
  const form = new FormData();
  await appendImage(form, "image", uri);
  form.append("view", view);
  return (await api.post("/api/evaluations/quality", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 30000 })).data;
};

/**
 * Starts an evaluation: 5 photos + purpose form. Returns { id, reportId, status }.
 * @param {object} p { photos: { front, back, left, right, teeth } (uris), purpose, budget, sellerPrice, experience, language, quality }
 * @param {string} [token] send as this user instead of the signed-in one (queued offline checks)
 */
export const createEvaluation = async ({ photos, purpose, budget, sellerPrice, experience, language, quality }, token) => {
  const form = new FormData();
  for (const view of ["front", "back", "left", "right", "teeth"]) {
    await appendImage(form, view, photos[view]);
  }
  form.append("purpose", purpose);
  form.append("experience", experience);
  form.append("language", language);
  if (budget) form.append("budget", String(budget));
  if (sellerPrice) form.append("sellerPrice", String(sellerPrice));
  if (quality) form.append("quality", JSON.stringify(quality));
  const headers = { "Content-Type": "multipart/form-data", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  return (await api.post("/api/evaluations", form, { headers, timeout: 60000 })).data;
};

export const getEvaluation = async (id) => (await api.get(`/api/evaluations/${id}`)).data.evaluation;

export default api;

// Q&A about one evaluation. Throws axios errors; a 503 body carries default suggestions.
export const askQuestion = async (id, message) => (await api.post(`/api/evaluations/${id}/chat`, { message }, { timeout: 60000 })).data;

export const compareEvaluations = async (ids) => (await api.post("/api/evaluations/compare", { ids }, { timeout: 60000 })).data;

export const deleteAccount = async () => (await api.delete("/api/auth/account")).data;

export const deleteEvaluation = async (id) => (await api.delete(`/api/evaluations/${id}`)).data;
