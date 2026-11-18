import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";

// Profile photos are stored in two sizes, both as JPEG data URIs in Firestore (no Firebase Storage needed):
//   users/{uid}.photo              512×512 (~50–90 KB)  — shown everywhere (profile, lists)
//   users/{uid}/photo/full .data   1080×1080 (~150–250 KB) — loaded only when someone opens the full-screen view
// Both stay well under Firestore's 1 MB document limit.
const SMALL = 512;
const LARGE = 1080;

const render = async (uri, size, compress) => {
  const img = await ImageManipulator.manipulate(uri).resize({ width: size, height: size }).renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
  if (!out.base64) throw new Error("Couldn't process the photo.");
  return `data:image/jpeg;base64,${out.base64}`;
};

// Lets the user pick a square photo. Returns { small, large } data URIs, or null if they cancel.
export async function pickProfilePhoto() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error("Allow access to your photos to set a profile picture.");

  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  });
  if (res.canceled || !res.assets?.length) return null;

  const uri = res.assets[0].uri;
  // If the picked photo is smaller than LARGE, it's simply upscaled to the same square size.
  const [small, large] = await Promise.all([render(uri, SMALL, 0.7), render(uri, LARGE, 0.75)]);
  return { small, large };
}

const fullRef = (uid) => doc(db, "users", uid, "photo", "full");

export const saveFullPhoto = (uid, data) => setDoc(fullRef(uid), { data });
export const deleteFullPhoto = (uid) => deleteDoc(fullRef(uid)).catch(() => {});

// The large version, or null if this person only has a small one (photos set before this existed).
export async function loadFullPhoto(uid) {
  try {
    const snap = await getDoc(fullRef(uid));
    return snap.exists() ? snap.data().data : null;
  } catch {
    return null;
  }
}
