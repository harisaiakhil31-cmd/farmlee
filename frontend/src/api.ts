import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL + "/api";

export const api = axios.create({ baseURL: BASE, timeout: 20000 });

api.interceptors.request.use(async (cfg) => {
  const t = await AsyncStorage.getItem("hm_token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export const TOKEN_KEY = "hm_token";
export const USER_KEY = "hm_user";

export async function setSession(token: string, user: any) {
  await AsyncStorage.setItem(TOKEN_KEY, token);
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
}
export async function clearSession() {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem(USER_KEY);
}
export async function getUser() {
  const u = await AsyncStorage.getItem(USER_KEY);
  return u ? JSON.parse(u) : null;
}
export async function getToken() {
  return AsyncStorage.getItem(TOKEN_KEY);
}
