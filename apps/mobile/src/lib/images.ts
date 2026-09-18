import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const acceptedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

function readWebImage(): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = acceptedMimeTypes.join(',');
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(undefined); return; }
      if (!acceptedMimeTypes.includes(file.type)) {
        reject(new Error('JPG·PNG·WebP 이미지를 선택해주세요.'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('이미지를 읽지 못했어요. 다른 파일을 선택해주세요.'));
      reader.onload = () => {
        const value = typeof reader.result === 'string' ? reader.result : '';
        if (!value) { reject(new Error('이미지를 읽지 못했어요. 다른 파일을 선택해주세요.')); return; }
        // Keep the request body below the API limit on iPhone Safari, where the
        // browser file picker does not apply Expo's native quality setting.
        if (file.size <= 1_800_000) { resolve(value); return; }
        const image = document.createElement('img');
        image.onload = () => {
          const maxSide = 1600;
          const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.78));
        };
        image.onerror = () => reject(new Error('사진을 변환하지 못했어요. JPG·PNG·WebP 사진으로 다시 시도해주세요.'));
        image.src = value;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  });
}

export async function pickImage(options?: { quality?: number; allowsEditing?: boolean }): Promise<string | undefined> {
  if (Platform.OS === 'web') return readWebImage();
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('사진을 선택하려면 사진 접근을 허용해주세요.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: options?.quality ?? 0.45,
    allowsEditing: options?.allowsEditing ?? false,
    ...(options?.allowsEditing ? { aspect: [1, 1] as [number, number] } : {}),
    base64: true,
    allowsMultipleSelection: false,
  });
  if (result.canceled) return;
  const asset = result.assets[0];
  if (!asset.base64) throw new Error('이미지를 읽지 못했어요. 다른 파일을 선택해주세요.');
  if (asset.base64.length > 2_700_000)
    throw new Error('사진은 2MB 이하의 JPG·PNG·WebP로 선택해주세요.');
  const mime = asset.mimeType || 'image/jpeg';
  if (!acceptedMimeTypes.includes(mime))
    throw new Error('JPG·PNG·WebP 이미지를 선택해주세요.');
  return `data:${mime};base64,${asset.base64}`;
}
