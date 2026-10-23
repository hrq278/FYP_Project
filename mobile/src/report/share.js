import * as Sharing from "expo-sharing";
import { Linking, Platform } from "react-native";

export async function sharePdf(uri, title) {
  if (!uri || !(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: title });
  return true;
}

/**
 * WhatsApp with a short summary + link (spec §6). Falls back to the share sheet with the PDF when WhatsApp
 * isn't installed. `makePdf` is only called for the fallback.
 */
export async function shareOnWhatsApp({ text, makePdf, title }) {
  const encoded = encodeURIComponent(text);
  if (Platform.OS === "web") {
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
    return "web";
  }
  try {
    await Linking.openURL(`whatsapp://send?text=${encoded}`);
    return "whatsapp";
  } catch {
    const uri = await makePdf();
    return (await sharePdf(uri, title)) ? "sheet" : "none";
  }
}
