import * as SecureStore from "expo-secure-store";

// Accounts remembered on this device for one-tap switching.
// Stored in the OS keychain/keystore via SecureStore (encrypted). Each value stays small:
//   acct_index        JSON [uid, ...]
//   acct_meta_<uid>   JSON { uid, email, name, type }
//   acct_pw_<uid>     password
const INDEX = "acct_index";
const metaKey = (uid) => `acct_meta_${uid}`;
const pwKey = (uid) => `acct_pw_${uid}`;

const readJson = async (key, fallback) => {
  try {
    const v = await SecureStore.getItemAsync(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};

export async function listSavedAccounts() {
  const uids = await readJson(INDEX, []);
  const metas = await Promise.all(uids.map((uid) => readJson(metaKey(uid), null)));
  return metas.filter(Boolean);
}

export async function saveAccount({ uid, email, password }) {
  if (!uid || !email || !password) return;
  try {
    const uids = await readJson(INDEX, []);
    const prev = await readJson(metaKey(uid), {});
    await SecureStore.setItemAsync(metaKey(uid), JSON.stringify({ ...prev, uid, email }));
    await SecureStore.setItemAsync(pwKey(uid), password);
    if (!uids.includes(uid)) await SecureStore.setItemAsync(INDEX, JSON.stringify([...uids, uid]));
  } catch (e) {
    console.warn("Couldn't remember account:", e.message);
  }
}

// Keeps the name/type shown in the switcher up to date. Only touches accounts already saved.
export async function updateSavedAccountInfo(uid, info) {
  const prev = await readJson(metaKey(uid), null);
  if (!prev || (prev.name === info.name && prev.type === info.type)) return;
  try {
    await SecureStore.setItemAsync(metaKey(uid), JSON.stringify({ ...prev, ...info }));
  } catch {}
}

export async function getSavedCredentials(uid) {
  const meta = await readJson(metaKey(uid), null);
  const password = await SecureStore.getItemAsync(pwKey(uid)).catch(() => null);
  return meta && password ? { email: meta.email, password } : null;
}

export async function forgetAccount(uid) {
  const uids = await readJson(INDEX, []);
  await SecureStore.setItemAsync(INDEX, JSON.stringify(uids.filter((u) => u !== uid)));
  await SecureStore.deleteItemAsync(metaKey(uid)).catch(() => {});
  await SecureStore.deleteItemAsync(pwKey(uid)).catch(() => {});
}
