import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Alert } from 'react-native';

export type Picked = { uri: string; width: number; height: number };

/** Camera (one photo) or library (up to 20 photos, US-1.2). Returns [] when cancelled. */
export async function pickPhotos(
  source: 'camera' | 'library',
  { multiple = true }: { multiple?: boolean } = {},
): Promise<Picked[]> {
  const perm =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert(
      source === 'camera' ? 'Camera access needed' : 'Photo access needed',
      'You can allow it in Settings → Hanger.',
    );
    return [];
  }
  const opts: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    quality: 1,
    allowsMultipleSelection: source === 'library' && multiple,
    selectionLimit: multiple ? 20 : 1,
  };
  const res =
    source === 'camera'
      ? await ImagePicker.launchCameraAsync(opts)
      : await ImagePicker.launchImageLibraryAsync(opts);
  if (res.canceled) return [];
  return res.assets.map((a) => ({ uri: a.uri, width: a.width, height: a.height }));
}

/** Opens camera or library, then the add-item flow with the picked photos. */
export async function startAddItem(source: 'camera' | 'library') {
  const photos = await pickPhotos(source);
  if (photos.length) {
    router.push({ pathname: '/add-item', params: { photos: JSON.stringify(photos) } });
  }
}
