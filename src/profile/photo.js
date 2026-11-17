import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

// Lets the user pick a square photo and returns it as a small JPEG data URI (~20–40 KB),
// small enough to store directly on users/{uid}.photo (no Firebase Storage needed).
// Returns null if the user cancels; throws with a readable message on failure.
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

  const rendered = await ImageManipulator.manipulate(res.assets[0].uri).resize({ width: 256, height: 256 }).renderAsync();
  const out = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!out.base64) throw new Error("Couldn't process the photo.");
  return `data:image/jpeg;base64,${out.base64}`;
}
