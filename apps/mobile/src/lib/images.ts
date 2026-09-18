import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

const acceptedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
const imageExtensions = /\.(?:jpe?g|png|webp|heic|heif)$/i;

function extensionMime(name: string) {
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.webp$/i.test(name)) return 'image/webp';
  if (/\.heic$/i.test(name)) return 'image/heic';
  if (/\.heif$/i.test(name)) return 'image/heif';
  return 'image/jpeg';
}

function compressWebImage(file: File, value: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = document.createElement('img');
    image.onload = () => {
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new Error('사진을 변환하지 못했어요. 다른 사진으로 다시 시도해주세요.'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let output = canvas.toDataURL('image/jpeg', 0.78);
      // Keep the JSON request below the API's 2.8 MB image limit even for
      // detailed camera photos. Reduce dimensions before lowering quality so
      // text on a product package remains readable.
      for (let attempt = 0; output.length > 2_700_000 && attempt < 3; attempt += 1) {
        canvas.width = Math.max(1, Math.round(canvas.width * 0.8));
        canvas.height = Math.max(1, Math.round(canvas.height * 0.8));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        output = canvas.toDataURL('image/jpeg', 0.68);
      }
      if (output.length > 2_800_000) {
        reject(new Error('사진 용량이 너무 커요. 더 작은 사진으로 다시 시도해주세요.'));
        return;
      }
      resolve(output);
    };
    image.onerror = () => reject(new Error(
      /image\/(?:heic|heif)/i.test(file.type) || /\.(?:heic|heif)$/i.test(file.name)
        ? 'HEIC 사진을 읽지 못했어요. iPhone 사진 설정에서 호환성 높은 포맷(JPG)으로 바꾼 뒤 다시 시도해주세요.'
        : '사진을 읽지 못했어요. JPG·PNG·WebP 사진으로 다시 시도해주세요.',
    ));
    image.src = value;
  });
}

function readWebImage(): Promise<string | undefined> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    // Mobile browsers may report an empty MIME type or image/heic for photos
    // selected from the camera roll. Let the picker show image files and
    // validate by MIME/extension after selection instead of dropping them.
    input.accept = 'image/*,.jpg,.jpeg,.png,.webp,.heic,.heif';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) { resolve(undefined); return; }
      const mime = (file.type || extensionMime(file.name)).toLowerCase().split(';')[0];
      const isImage = file.type ? mime.startsWith('image/') : imageExtensions.test(file.name);
      if (!isImage) {
        reject(new Error('JPG·PNG·WebP 이미지를 선택해주세요.'));
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('이미지를 읽지 못했어요. 다른 파일을 선택해주세요.'));
      reader.onload = () => {
        const value = typeof reader.result === 'string' ? reader.result : '';
        if (!value) { reject(new Error('이미지를 읽지 못했어요. 다른 파일을 선택해주세요.')); return; }
        // Keep small, supported files untouched. Convert large files and
        // browser-specific formats (including HEIC when the browser decodes
        // it) to a server-compatible JPEG data URL.
        if (acceptedMimeTypes.includes(mime) && file.size <= 1_800_000 && /^data:image\/(?:png|jpeg|webp);base64,/i.test(value)) {
          resolve(value);
          return;
        }
        compressWebImage(file, value).then(resolve, reject);
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
  // Expo returns JPEG-encoded base64 on iOS even when the original photo's
  // mimeType is HEIC. Label the bytes we actually send, not the source file.
  const mime = asset.base64.startsWith('/9j/') ? 'image/jpeg'
    : asset.base64.startsWith('iVBORw0KGgo') ? 'image/png'
    : asset.base64.startsWith('UklGR') ? 'image/webp'
    : null;
  if (!mime) throw new Error('사진을 변환하지 못했어요. 다른 사진으로 다시 시도해주세요.');
  return `data:${mime};base64,${asset.base64}`;
}
