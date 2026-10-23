import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { createEvaluation, errorKind, TOKEN_KEY } from "../../services/api";

/**
 * Checks that couldn't be uploaded (no internet) wait here until they can be sent.
 * Each item: { id, createdAt, state: "waiting" | "sending" | "failed", token, photos: { view: uri },
 * purpose, budget, sellerPrice, experience, language, quality }.
 * Photos are copied to the app's document folder (data URLs on web) so they outlive the camera cache.
 */
const KEY = "pendingChecks";
const VIEWS = ["front", "back", "left", "right", "teeth"];

let items = null; // in-memory copy of the stored list
const listeners = new Set();
const inflight = new Map(); // pending id -> upload promise, so two retries never send the same check twice
const sent = new Map(); // pending id -> evaluation id, for retries that arrive after the upload finished

const load = async () => {
  if (!items) {
    try {
      items = JSON.parse(await AsyncStorage.getItem(KEY)) || [];
    } catch {
      items = [];
    }
    // An upload cut off when the app closed is just waiting again
    items = items.map((x) => (x.state === "sending" ? { ...x, state: "waiting" } : x));
  }
  return items;
};

const save = async (next) => {
  items = next;
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((fn) => fn(next));
};

const setState = async (id, state) => save((await load()).map((x) => (x.id === id ? { ...x, state } : x)));

export const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

export const listPending = async () => [...(await load())];

const toDataUrl = async (uri) => {
  const blob = await (await fetch(uri)).blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const keepPhotos = async (id, photos) => {
  if (Platform.OS === "web") {
    return Object.fromEntries(await Promise.all(VIEWS.map(async (v) => [v, await toDataUrl(photos[v])])));
  }
  const dir = new Directory(Paths.document, "pending", id);
  dir.create({ intermediates: true, idempotent: true });
  const kept = {};
  for (const v of VIEWS) {
    const dest = new File(dir, `${v}.jpg`);
    new File(photos[v]).copy(dest);
    kept[v] = dest.uri;
  }
  return kept;
};

const dropPhotos = (id) => {
  if (Platform.OS === "web") return;
  try {
    const dir = new Directory(Paths.document, "pending", id);
    if (dir.exists) dir.delete();
  } catch {
    // Leftover files are harmless
  }
};

/** Saves a check for later. `check` has the same fields createEvaluation takes. */
export async function addPending(check) {
  const id = `p${Date.now()}`;
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const photos = await keepPhotos(id, check.photos);
  const item = { ...check, photos, id, token, createdAt: new Date().toISOString(), state: "waiting" };
  await save([item, ...(await load())]);
  return item;
}

export async function removePending(id) {
  dropPhotos(id);
  await save((await load()).filter((x) => x.id !== id));
}

// A guest who signs up keeps their reports (the server moves them); queued checks follow the same way
export async function retagPending(oldToken, newToken) {
  const list = await load();
  if (list.some((x) => x.token === oldToken)) await save(list.map((x) => (x.token === oldToken ? { ...x, token: newToken } : x)));
}

/**
 * Uploads one queued check and resolves with the new evaluation id; the item leaves the queue.
 * No internet leaves it "waiting"; a server error marks it "failed" (the user can retry or delete it).
 */
export function submitPending(id) {
  if (sent.has(id)) return Promise.resolve(sent.get(id));
  if (inflight.has(id)) return inflight.get(id);
  const job = (async () => {
    const item = (await load()).find((x) => x.id === id);
    if (!item) throw new Error("not_found");
    await setState(id, "sending");
    try {
      const { photos, purpose, budget, sellerPrice, experience, language, quality } = item;
      const res = await createEvaluation({ photos, purpose, budget, sellerPrice, experience, language, quality }, item.token);
      sent.set(id, res.id);
      await removePending(id);
      return res.id;
    } catch (error) {
      await setState(id, errorKind(error) === "network" ? "waiting" : "failed");
      throw error;
    }
  })().finally(() => inflight.delete(id));
  inflight.set(id, job);
  return job;
}

/** Sends every waiting check, oldest first; stops at the first network error. Resolves with how many were sent. */
export async function flushPending() {
  const waiting = (await load()).filter((x) => x.state === "waiting").reverse();
  let count = 0;
  for (const item of waiting) {
    try {
      await submitPending(item.id);
      count += 1;
    } catch (error) {
      if (errorKind(error) === "network") break;
    }
  }
  return count;
}
