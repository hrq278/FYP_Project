import React, { useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import * as ExpoImagePicker from "expo-image-picker";

export default function ImagePicker({ label = "Body Image", imageUri, onImageSelected }) {
  const [isRequesting, setIsRequesting] = useState(false);

  const requestPermissions = async () => {
    setIsRequesting(true);
    const cameraPermission = await ExpoImagePicker.requestCameraPermissionsAsync();
    const mediaPermission = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    setIsRequesting(false);

    if (!cameraPermission.granted || !mediaPermission.granted) {
      Alert.alert("Permission Required", "Camera and media permissions are needed to select images.");
      return false;
    }

    return true;
  };

  const pickFromLibrary = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      return;
    }

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 1,
      aspect: [4, 3]
    });

    if (!result.canceled && result.assets?.length) {
      onImageSelected(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const hasPermissions = await requestPermissions();
    if (!hasPermissions) {
      return;
    }

    const result = await ExpoImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 1,
      aspect: [4, 3]
    });

    if (!result.canceled && result.assets?.length) {
      onImageSelected(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.previewBox}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.image} />
        ) : (
          <Text style={styles.placeholder}>No image selected</Text>
        )}
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.secondaryButton} onPress={pickFromLibrary} disabled={isRequesting}>
          <Text style={styles.secondaryButtonText}>Choose Photo</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={takePhoto} disabled={isRequesting}>
          <Text style={styles.secondaryButtonText}>Use Camera</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937"
  },
  previewBox: {
    height: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden"
  },
  placeholder: {
    color: "#6b7280"
  },
  image: {
    width: "100%",
    height: "100%"
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    backgroundColor: "#0f766e",
    paddingVertical: 12,
    alignItems: "center"
  },
  secondaryButtonText: {
    color: "white",
    fontWeight: "600"
  }
});
