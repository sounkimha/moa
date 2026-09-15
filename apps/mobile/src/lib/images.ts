import * as ImagePicker from 'expo-image-picker';
export async function pickImage(options?: { quality?: number }): Promise<string | undefined> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('사진을 선택하려면 사진 접근을 허용해주세요.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: options?.quality ?? 0.45,
    base64: true,
    allowsMultipleSelection: false,
  });
  if (result.canceled) return;
  const asset = result.assets[0];
  if (!asset.base64) throw new Error('이미지를 읽지 못했어요. 다른 파일을 선택해주세요.');
  if (asset.base64.length > 2_700_000)
    throw new Error('사진은 2MB 이하의 JPG·PNG·WebP로 선택해주세요.');
  const mime = asset.mimeType || 'image/jpeg';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime))
    throw new Error('JPG·PNG·WebP 이미지를 선택해주세요.');
  return `data:${mime};base64,${asset.base64}`;
}
